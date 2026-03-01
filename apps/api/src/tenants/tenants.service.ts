import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';

// Default roles created for every new tenant
const DEFAULT_ROLES = [
  { name: 'org_admin', displayName: 'Org Admin' },
  { name: 'org_manager', displayName: 'Org Manager' },
  { name: 'sales', displayName: 'Sales' },
  { name: 'presales', displayName: 'Presales' },
  { name: 'project_manager', displayName: 'Project Manager' },
  { name: 'installer', displayName: 'Installer' },
  { name: 'subcontractor', displayName: 'Subcontractor' },
  { name: 'customer', displayName: 'Customer' },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, string[]>> = {
  org_admin: {
    opportunities: ['create', 'read', 'update', 'delete'],
    survey: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete'],
    tools: ['create', 'read', 'update', 'delete'],
    management: ['create', 'read', 'update', 'delete'],
    vendors: ['create', 'read', 'update', 'delete'],
    subcontractors: ['create', 'read', 'update', 'delete'],
  },
  org_manager: {
    opportunities: ['create', 'read', 'update', 'delete'],
    survey: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete'],
    tools: ['read'],
    management: ['create', 'read', 'update', 'delete'],
    vendors: ['create', 'read', 'update', 'delete'],
    subcontractors: ['create', 'read', 'update', 'delete'],
  },
  sales: {
    opportunities: ['create', 'read', 'update'],
    survey: ['read'],
    design: ['read'],
    projects: ['read'],
    tools: ['read'],
    management: ['read'],
    vendors: ['read'],
    subcontractors: ['read'],
  },
  presales: {
    opportunities: ['create', 'read', 'update'],
    survey: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete'],
    projects: ['read', 'update'],
    tools: ['read'],
    management: ['read'],
    vendors: ['read'],
    subcontractors: ['read'],
  },
  project_manager: {
    opportunities: ['read', 'update'],
    survey: ['read'],
    design: ['read'],
    projects: ['create', 'read', 'update'],
    tools: ['read'],
    management: ['read'],
    vendors: ['read'],
    subcontractors: ['read'],
  },
  installer: {
    opportunities: ['read'],
    survey: ['read'],
    design: ['read'],
    projects: ['read', 'update'],
    tools: ['read'],
    management: ['read'],
    vendors: ['read'],
    subcontractors: ['read'],
  },
  subcontractor: {
    opportunities: ['read'],
    survey: [],
    design: ['read'],
    projects: ['read', 'update'],
    tools: [],
    management: [],
    vendors: [],
    subcontractors: [],
  },
  customer: {
    opportunities: ['read'],
    survey: [],
    design: [],
    projects: ['read'],
    tools: [],
    management: [],
    vendors: [],
    subcontractors: [],
  },
};

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        roles: {
          include: { permissions: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { users: true, opportunities: true, projects: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async createTenant(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    // Create tenant with default roles and permissions in a transaction
    const tenant = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: { name: dto.name, slug: dto.slug },
      });

      // Create default roles
      for (const roleDef of DEFAULT_ROLES) {
        const role = await tx.role.create({
          data: {
            tenantId: newTenant.id,
            name: roleDef.name,
            displayName: roleDef.displayName,
            isDefault: true,
          },
        });

        // Create permissions for this role
        const perms = DEFAULT_PERMISSIONS[roleDef.name] || {};
        const permData = [];
        for (const [module, actions] of Object.entries(perms)) {
          for (const action of ['create', 'read', 'update', 'delete']) {
            permData.push({
              roleId: role.id,
              module,
              action,
              allowed: actions.includes(action),
            });
          }
        }

        if (permData.length > 0) {
          await tx.rolePermission.createMany({ data: permData });
        }
      }

      return newTenant;
    });

    return this.getTenant(tenant.id);
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
      },
    });

    return this.getTenant(id);
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Soft delete — deactivate
    await this.prisma.tenant.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'Organization deactivated' };
  }

  // --- Roles management within a tenant ---

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCustomRole(tenantId: string, name: string, displayName: string) {
    return this.prisma.role.create({
      data: {
        tenantId,
        name,
        displayName,
        isCustom: true,
      },
    });
  }
}
