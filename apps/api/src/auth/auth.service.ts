import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../email/email.service';
import { APP_MODULES, parseTenantSettings, JwtPayload, AuthTokens, GlobalRole } from '@casdex/shared';

type TokenPayload = Omit<JwtPayload, 'iat' | 'exp'>;

export interface LoginResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    globalRole: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  roles: string[];
  availableTenants: Array<{ id: string; name: string; slug: string }>;
  enabledModules: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async login(email: string, password: string, tenantId?: string): Promise<LoginResult> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenants: {
          where: { isActive: true },
          include: {
            tenant: true,
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordValid = await compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hasGlobalRole = !!user.globalRole;

    // Get available tenants
    const availableTenants = user.tenants
      .filter((ut) => ut.tenant.isActive)
      .map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      }));

    if (availableTenants.length === 0 && !hasGlobalRole) {
      throw new ForbiddenException('No active tenant assignments');
    }

    // Determine which tenant to log into
    let selectedTenant: typeof availableTenants[0];
    let roles: string[] = [];

    if (hasGlobalRole && availableTenants.length === 0) {
      // Global user with no tenant assignments — use a system context
      selectedTenant = { id: 'global', name: 'Global', slug: 'global' };
      roles = [user.globalRole!];
    } else if (tenantId) {
      const found = availableTenants.find((t) => t.id === tenantId);
      if (!found) {
        throw new ForbiddenException('You do not have access to this organization');
      }
      selectedTenant = found;
    } else {
      // Default to first tenant
      selectedTenant = availableTenants[0];
    }

    // Get roles for selected tenant
    if (selectedTenant.id !== 'global') {
      const userTenant = user.tenants.find((ut) => ut.tenantId === selectedTenant.id);
      if (userTenant) {
        roles = [userTenant.role.name];
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: selectedTenant.id,
      roles,
      globalRole: user.globalRole as GlobalRole | null,
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Extract enabled modules from tenant settings
    let enabledModules: string[] = [...APP_MODULES];
    if (selectedTenant.id !== 'global') {
      const matchedUserTenant = user.tenants.find((ut) => ut.tenantId === selectedTenant.id);
      if (matchedUserTenant) {
        const settings = parseTenantSettings(matchedUserTenant.tenant.settings);
        enabledModules = settings.enabledModules;
      }
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole,
      },
      tenant: selectedTenant,
      roles,
      availableTenants,
      enabledModules,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            tenants: {
              where: { isActive: true },
              include: { role: true },
            },
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    // Delete the used refresh token (rotation)
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    // Preserve the tenant context from the original token
    // Fall back to first tenant assignment if stored tenantId is missing
    const savedTenantId = stored.tenantId;
    const matchingTenant = savedTenantId
      ? stored.user.tenants.find((ut) => ut.tenantId === savedTenantId)
      : null;
    const fallbackTenant = stored.user.tenants[0];
    const tenantId = matchingTenant?.tenantId || fallbackTenant?.tenantId || 'global';
    const roles = matchingTenant
      ? [matchingTenant.role.name]
      : fallbackTenant
        ? [fallbackTenant.role.name]
        : stored.user.globalRole ? [stored.user.globalRole] : [];

    return this.generateTokens({
      sub: stored.user.id,
      email: stored.user.email,
      tenantId,
      roles,
      globalRole: stored.user.globalRole as GlobalRole | null,
    });
  }

  async switchTenant(userId: string, tenantId: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          where: { isActive: true },
          include: {
            tenant: true,
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const hasGlobalRole = !!user.globalRole;
    const userTenant = user.tenants.find((ut) => ut.tenantId === tenantId);
    if (!userTenant && !hasGlobalRole) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const tenant = userTenant
      ? { id: userTenant.tenant.id, name: userTenant.tenant.name, slug: userTenant.tenant.slug }
      : { id: tenantId, name: 'Unknown', slug: 'unknown' };

    const roles = userTenant
      ? [userTenant.role.name]
      : hasGlobalRole ? [user.globalRole!] : [];

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId,
      roles,
      globalRole: user.globalRole as GlobalRole | null,
    });

    const availableTenants = user.tenants
      .filter((ut) => ut.tenant.isActive)
      .map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      }));

    // Extract enabled modules from tenant settings
    let enabledModules: string[] = [...APP_MODULES];
    if (userTenant) {
      const settings = parseTenantSettings(userTenant.tenant.settings);
      enabledModules = settings.enabledModules;
    } else if (hasGlobalRole) {
      // Global user browsing a tenant they're not assigned to — query directly
      const tenantRecord = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      if (tenantRecord) {
        const settings = parseTenantSettings(tenantRecord.settings);
        enabledModules = settings.enabledModules;
      }
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole,
      },
      tenant,
      roles,
      availableTenants,
      enabledModules,
    };
  }

  async setPassword(token: string, password: string): Promise<void> {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date() || resetRecord.usedAt) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await hash(password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) return;

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        type: 'recovery',
        expiresAt,
      },
    });

    // Fire-and-forget: do NOT await so the response time is constant
    // regardless of whether the user exists (prevents email enumeration via timing)
    this.emailService.sendPasswordReset(email, token).catch(() => {});
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async logout(userId: string): Promise<void> {
    // Delete all refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // --- Private helpers ---

  private async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshToken = randomUUID();
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const expiresAt = new Date(
      Date.now() + this.parseDuration(refreshExpiresIn),
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: payload.sub,
        tenantId: payload.tenantId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || multipliers['d']);
  }
}
