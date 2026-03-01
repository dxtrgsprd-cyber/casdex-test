import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

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

// Default permission matrix per role per module
// Format: { [module]: [actions] }
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
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

  // Create global admin user (main account)
  const adminPasswordHash = await hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@casdex.local' },
    update: {},
    create: {
      email: 'admin@casdex.local',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Admin',
      globalRole: 'global_admin',
      isActive: true,
    },
  });

  // Assign org_admin role in default tenant
  const orgAdminRole = await prisma.role.findUnique({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'org_admin' } },
  });

  if (orgAdminRole) {
    await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: adminUser.id, tenantId: defaultTenant.id } },
      update: {},
      create: {
        userId: adminUser.id,
        tenantId: defaultTenant.id,
        roleId: orgAdminRole.id,
      },
    });
  }

  console.log(`Created global admin user: ${adminUser.email}`);

  // Create global admin backup user
  const backupPasswordHash = await hash('backup123', 12);
  const backupUser = await prisma.user.upsert({
    where: { email: 'backup-admin@casdex.local' },
    update: {},
    create: {
      email: 'backup-admin@casdex.local',
      passwordHash: backupPasswordHash,
      firstName: 'Backup',
      lastName: 'Admin',
      globalRole: 'global_admin',
      isActive: true,
    },
  });

  console.log(`Created backup admin user: ${backupUser.email}`);

  // Assign backup admin to default tenant
  if (orgAdminRole) {
    await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: backupUser.id, tenantId: defaultTenant.id } },
      update: {},
      create: {
        userId: backupUser.id,
        tenantId: defaultTenant.id,
        roleId: orgAdminRole.id,
      },
    });
  }

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
