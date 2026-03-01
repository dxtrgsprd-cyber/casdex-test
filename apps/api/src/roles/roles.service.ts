import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';

// System default role names that cannot be deleted or renamed
const SYSTEM_ROLE_NAMES = [
  'org_admin',
  'org_manager',
  'sales',
  'presales',
  'project_manager',
  'installer',
  'subcontractor',
  'customer',
];

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async listRoles(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          orderBy: [{ module: 'asc' }, { action: 'asc' }],
        },
        _count: { select: { userTenants: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return roles;
  }

  async getRole(roleId: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        permissions: {
          orderBy: [{ module: 'asc' }, { action: 'asc' }],
        },
        _count: { select: { userTenants: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async createRole(tenantId: string, dto: CreateRoleDto) {
    // Check for duplicate name within tenant
    const existing = await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    // Cannot create roles using system default names
    if (SYSTEM_ROLE_NAMES.includes(dto.name)) {
      throw new ConflictException('Cannot create a custom role with a system role name');
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          tenantId,
          name: dto.name,
          displayName: dto.displayName,
          isCustom: true,
          isDefault: false,
        },
      });

      // Create permissions if provided
      if (dto.permissions && dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((p) => ({
            roleId: newRole.id,
            module: p.module,
            action: p.action,
            allowed: p.allowed,
          })),
        });
      }

      return newRole;
    });

    return this.getRole(role.id, tenantId);
  }

  async updateRole(roleId: string, tenantId: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update display name if provided
      if (dto.displayName) {
        await tx.role.update({
          where: { id: roleId },
          data: { displayName: dto.displayName },
        });
      }

      // Update permissions if provided
      if (dto.permissions) {
        for (const perm of dto.permissions) {
          await tx.rolePermission.upsert({
            where: {
              roleId_module_action: {
                roleId,
                module: perm.module,
                action: perm.action,
              },
            },
            update: { allowed: perm.allowed },
            create: {
              roleId,
              module: perm.module,
              action: perm.action,
              allowed: perm.allowed,
            },
          });
        }
      }
    });

    return this.getRole(roleId, tenantId);
  }

  async deleteRole(roleId: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { userTenants: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isDefault) {
      throw new ForbiddenException('Cannot delete a system default role');
    }

    if (role._count.userTenants > 0) {
      throw new ForbiddenException(
        `Cannot delete this role. ${role._count.userTenants} user(s) are currently assigned to it. Reassign them first.`,
      );
    }

    // Delete permissions first, then the role
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.role.delete({ where: { id: roleId } });
    });

    return { success: true, message: 'Role deleted' };
  }
}
