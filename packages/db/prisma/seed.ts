import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { name: 'admin', displayName: 'Admin' },
  { name: 'manager', displayName: 'Manager' },
  { name: 'sales', displayName: 'Sales' },
  { name: 'presales', displayName: 'Presales' },
  { name: 'project_manager', displayName: 'Project Manager' },
  { name: 'field_technician', displayName: 'Field Technician' },
  { name: 'subcontractor', displayName: 'Subcontractor' },
  { name: 'customer', displayName: 'Customer' },
];

// Default permission matrix per role per module
// Format: { [module]: [actions] }
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: {
    opportunities: ['create', 'read', 'update', 'delete'],
    survey: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete'],
    tools: ['create', 'read', 'update', 'delete'],
    management: ['create', 'read', 'update', 'delete'],
  },
  manager: {
    opportunities: ['create', 'read', 'update', 'delete'],
    survey: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete'],
    tools: ['read'],
    management: ['create', 'read', 'update', 'delete'],
  },
  sales: {
    opportunities: ['create', 'read', 'update'],
    survey: ['read'],
    design: ['read'],
    projects: ['read'],
    tools: ['read'],
    management: ['read'],
  },
  presales: {
    opportunities: ['create', 'read', 'update'],
    survey: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete'],
    projects: ['read', 'update'],
    tools: ['read'],
    management: ['read'],
  },
  project_manager: {
    opportunities: ['read', 'update'],
    survey: ['read'],
    design: ['read'],
    projects: ['create', 'read', 'update'],
    tools: ['read'],
    management: ['read'],
  },
  field_technician: {
    opportunities: ['read'],
    survey: ['read'],
    design: ['read'],
    projects: ['read', 'update'],
    tools: ['read'],
    management: ['read'],
  },
  subcontractor: {
    opportunities: ['read'],
    survey: [],
    design: ['read'],
    projects: ['read', 'update'],
    tools: [],
    management: [],
  },
  customer: {
    opportunities: ['read'],
    survey: [],
    design: [],
    projects: ['read'],
    tools: [],
    management: [],
  },
};

async function main() {
  console.log('Seeding database...');

  // Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      isActive: true,
    },
  });

  console.log(`Created tenant: ${defaultTenant.name} (${defaultTenant.id})`);

  // Create default roles for the tenant
  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: defaultTenant.id, name: roleDef.name } },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        name: roleDef.name,
        displayName: roleDef.displayName,
        isDefault: true,
      },
    });

    // Create permissions for this role
    const permissions = ROLE_PERMISSIONS[roleDef.name] || {};
    for (const [module, actions] of Object.entries(permissions)) {
      for (const action of ['create', 'read', 'update', 'delete']) {
        await prisma.rolePermission.upsert({
          where: { roleId_module_action: { roleId: role.id, module, action } },
          update: { allowed: actions.includes(action) },
          create: {
            roleId: role.id,
            module,
            action,
            allowed: actions.includes(action),
          },
        });
      }
    }

    console.log(`Created role: ${roleDef.displayName} with permissions`);
  }

  // Create global admin user
  const adminPasswordHash = await hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@casdex.local' },
    update: {},
    create: {
      email: 'admin@casdex.local',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Admin',
      isGlobalAdmin: true,
      isActive: true,
    },
  });

  // Assign admin role in default tenant
  const adminRole = await prisma.role.findUnique({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'admin' } },
  });

  if (adminRole) {
    await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: adminUser.id, tenantId: defaultTenant.id } },
      update: {},
      create: {
        userId: adminUser.id,
        tenantId: defaultTenant.id,
        roleId: adminRole.id,
      },
    });
  }

  console.log(`Created admin user: ${adminUser.email}`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
