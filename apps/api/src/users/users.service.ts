import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto, UpdateUserDto, UpdateUserRoleDto, UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async listUsers(
    tenantId: string,
    page = 1,
    pageSize = 25,
    filters?: { search?: string; roleId?: string; status?: string },
  ) {
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = { tenantId };

    // Status filter: 'active', 'inactive', or show all
    if (filters?.status === 'active') {
      where.isActive = true;
    } else if (filters?.status === 'inactive') {
      where.isActive = false;
    } else {
      // Default: show active users
      where.isActive = true;
    }

    // Role filter
    if (filters?.roleId) {
      where.roleId = filters.roleId;
    }

    // Search filter (name or email)
    if (filters?.search) {
      where.user = {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.userTenant.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              title: true,
              avatar: true,
              isActive: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
          role: {
            select: { id: true, name: true, displayName: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { user: { firstName: 'asc' } },
      }),
      this.prisma.userTenant.count({ where }),
    ]);

    return {
      data: users.map((ut) => ({
        ...ut.user,
        role: ut.role,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }


  async listUsersByTenant(
    tenantId: string,
    page = 1,
    pageSize = 25,
    filters?: { search?: string; roleId?: string; status?: string },
  ) {
    return this.listUsers(tenantId, page, pageSize, filters);
  }

  async getUser(userId: string, tenantId: string) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            title: true,
            avatar: true,
            isActive: true,
            isGlobalAdmin: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        role: {
          select: { id: true, name: true, displayName: true, permissions: true },
        },
      },
    });

    if (!userTenant) {
      throw new NotFoundException('User not found in this organization');
    }

    return {
      ...userTenant.user,
      role: userTenant.role,
    };
  }

  async createUser(tenantId: string, dto: CreateUserDto, createdByIsAdmin: boolean) {
    if (!createdByIsAdmin) {
      throw new ForbiddenException('Only admins and managers can create users');
    }

    // Check if email already exists globally
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      // User exists — check if already in this tenant
      const existingTenant = await this.prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId: existing.id, tenantId } },
      });

      if (existingTenant) {
        throw new ConflictException('User already exists in this organization');
      }

      // Add existing user to this tenant with the specified role
      await this.prisma.userTenant.create({
        data: {
          userId: existing.id,
          tenantId,
          roleId: dto.roleId,
        },
      });

      return this.getUser(existing.id, tenantId);
    }

    // New user — create account
    let passwordHash: string;
    let inviteToken: string | null = null;

    if (dto.password) {
      passwordHash = await hash(dto.password, 12);
    } else {
      // Generate a temporary password and create an invite token
      passwordHash = await hash(uuidv4(), 12);
      inviteToken = uuidv4();
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        title: dto.title,
        tenants: {
          create: {
            tenantId,
            roleId: dto.roleId,
          },
        },
      },
    });

    // Create invite token if needed
    if (inviteToken) {
      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: inviteToken,
          type: 'invite',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      this.emailService.sendInvite(dto.email, inviteToken, tenant?.name || 'your organization');
    }

    return this.getUser(user.id, tenantId);
  }

  async updateUser(userId: string, tenantId: string, dto: UpdateUserDto) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!userTenant) {
      throw new NotFoundException('User not found in this organization');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        title: dto.title,
        isActive: dto.isActive,
      },
    });

    return this.getUser(userId, tenantId);
  }

  async updateUserRole(userId: string, tenantId: string, dto: UpdateUserRoleDto) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!userTenant) {
      throw new NotFoundException('User not found in this organization');
    }

    await this.prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { roleId: dto.roleId },
    });

    return this.getUser(userId, tenantId);
  }

  async deleteUser(userId: string, tenantId: string) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!userTenant) {
      throw new NotFoundException('User not found in this organization');
    }

    // Soft-delete: deactivate in this tenant
    await this.prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { isActive: false },
    });

    return { success: true, message: 'User removed from organization' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.phone,
        avatar: dto.avatar,
      },
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        title: true,
        createdAt: true,
      },
    });
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        title: true,
        isGlobalAdmin: true,
        createdAt: true,
        tenants: {
          where: { isActive: true },
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
            role: { select: { id: true, name: true, displayName: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
