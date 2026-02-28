import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../email/email.service';

interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  isGlobalAdmin: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isGlobalAdmin: boolean;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  roles: string[];
  availableTenants: Array<{ id: string; name: string; slug: string }>;
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

    // Get available tenants
    const availableTenants = user.tenants
      .filter((ut) => ut.tenant.isActive)
      .map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      }));

    if (availableTenants.length === 0 && !user.isGlobalAdmin) {
      throw new ForbiddenException('No active tenant assignments');
    }

    // Determine which tenant to log into
    let selectedTenant: typeof availableTenants[0];
    let roles: string[] = [];

    if (user.isGlobalAdmin && availableTenants.length === 0) {
      // Global admin with no tenant assignments — use a system context
      selectedTenant = { id: 'global', name: 'Global Admin', slug: 'global' };
      roles = ['global_admin'];
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
      isGlobalAdmin: user.isGlobalAdmin,
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isGlobalAdmin: user.isGlobalAdmin,
      },
      tenant: selectedTenant,
      roles,
      availableTenants,
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
        : ['global_admin'];

    return this.generateTokens({
      sub: stored.user.id,
      email: stored.user.email,
      tenantId,
      roles,
      isGlobalAdmin: stored.user.isGlobalAdmin,
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

    const userTenant = user.tenants.find((ut) => ut.tenantId === tenantId);
    if (!userTenant && !user.isGlobalAdmin) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const tenant = userTenant
      ? { id: userTenant.tenant.id, name: userTenant.tenant.name, slug: userTenant.tenant.slug }
      : { id: tenantId, name: 'Unknown', slug: 'unknown' };

    const roles = userTenant ? [userTenant.role.name] : user.isGlobalAdmin ? ['global_admin'] : [];

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId,
      roles,
      isGlobalAdmin: user.isGlobalAdmin,
    });

    const availableTenants = user.tenants
      .filter((ut) => ut.tenant.isActive)
      .map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      }));

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isGlobalAdmin: user.isGlobalAdmin,
      },
      tenant,
      roles,
      availableTenants,
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

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        type: 'recovery',
        expiresAt,
      },
    });

    this.emailService.sendPasswordReset(email, token);
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

    const refreshToken = uuidv4();
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
