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
  { name: 'lead', displayName: 'Lead' },
  { name: 'tech', displayName: 'Tech' },
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
  lead: {
    opportunities: [],
    survey: [],
    design: [],
    projects: [],
    tools: [],
    management: [],
    vendors: [],
    subcontractors: [],
  },
  tech: {
    opportunities: [],
    survey: [],
    design: [],
    projects: [],
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

  // ============================================================
  // CALCULATOR DATA SEEDING
  // ============================================================

  console.log('Seeding calculator data...');

  // --- Device records with calculator specs ---
  // FOV calculator cameras
  const fovDevices = [
    { manufacturer: 'Hanwha', model: 'PNM-C12083RVD', partNumber: 'PNM-C12083RVD', category: 'camera', specs: { resW: 3328, resH: 1872, sensorW: 5.1, sensorH: 2.9 }, ndaaCompliant: true },
    { manufacturer: 'Hanwha', model: 'XND-8082RV', partNumber: 'XND-8082RV', category: 'camera', specs: { resW: 3072, resH: 1728, sensorW: 5.1, sensorH: 2.9 }, ndaaCompliant: true },
    { manufacturer: 'Hanwha', model: 'XNO-9083R', partNumber: 'XNO-9083R', category: 'camera', specs: { resW: 3840, resH: 2160, sensorW: 5.8, sensorH: 3.2 }, ndaaCompliant: true },
    { manufacturer: 'Hanwha', model: 'XND-6083RV', partNumber: 'XND-6083RV', category: 'camera', specs: { resW: 2048, resH: 1536, sensorW: 4.8, sensorH: 3.6 }, ndaaCompliant: true },
    { manufacturer: 'Hanwha', model: 'XNV-8082R', partNumber: 'XNV-8082R', category: 'camera', specs: { resW: 3072, resH: 1728, sensorW: 5.1, sensorH: 2.9 }, ndaaCompliant: true },
    { manufacturer: 'Hanwha', model: 'PNM-9322VQP', partNumber: 'PNM-9322VQP', category: 'camera', specs: { resW: 2560, resH: 1440, sensorW: 5.1, sensorH: 2.9 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'P3268-LVE', partNumber: 'AXIS-P3268-LVE', category: 'camera', specs: { resW: 3840, resH: 2160, sensorW: 5.8, sensorH: 3.2 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'Q1656', partNumber: 'AXIS-Q1656', category: 'camera', specs: { resW: 2688, resH: 1512, sensorW: 5.3, sensorH: 3.0 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'M3116-LVE', partNumber: 'AXIS-M3116-LVE', category: 'camera', specs: { resW: 2688, resH: 1512, sensorW: 5.3, sensorH: 3.0 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'P3265-LVE', partNumber: 'AXIS-P3265-LVE', category: 'camera', specs: { resW: 1920, resH: 1080, sensorW: 4.8, sensorH: 2.7 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'Q6135-LE', partNumber: 'AXIS-Q6135-LE', category: 'camera', specs: { resW: 1920, resH: 1080, sensorW: 4.8, sensorH: 2.7 }, ndaaCompliant: true },
  ];

  // LPR calculator cameras (merge specs with FOV where overlapping)
  const lprDevices = [
    { manufacturer: 'Hanwha', model: 'TNO-LPL050', partNumber: 'TNO-LPL050', category: 'camera', specs: { resH: 1080, sensorH: 2.7, fpsMax: 60 }, ndaaCompliant: true },
    { manufacturer: 'Hanwha', model: 'XNB-9003', partNumber: 'XNB-9003', category: 'camera', specs: { resH: 2160, sensorH: 3.2, fpsMax: 30 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'Q1715', partNumber: 'AXIS-Q1715', category: 'camera', specs: { resH: 1080, sensorH: 2.7, fpsMax: 60 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'P1468-LE', partNumber: 'AXIS-P1468-LE', category: 'camera', specs: { resH: 2160, sensorH: 3.2, fpsMax: 30 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'P1455-LE', partNumber: 'AXIS-P1455-LE', category: 'camera', specs: { resH: 1080, sensorH: 2.7, fpsMax: 30 }, ndaaCompliant: true },
    { manufacturer: 'Axis', model: 'Q1786-LE', partNumber: 'AXIS-Q1786-LE', category: 'camera', specs: { resH: 2160, sensorH: 3.2, fpsMax: 30 }, ndaaCompliant: true },
  ];

  // Cameras that exist in both FOV and LPR — merge specs
  const sharedFovLpr = [
    { partNumber: 'XNO-9083R', lprSpecs: { fpsMax: 30 } },
    { partNumber: 'XND-6083RV', lprSpecs: { fpsMax: 30 } },
  ];

  // Wireless radios
  const wirelessDevices = [
    { manufacturer: 'Ubiquiti', model: 'airFiber 5XHD', partNumber: 'UBI-AF5XHD', category: 'networking', specs: { frequency: 5.8, maxThroughput: 500, fadeMargin: 35, windArea: 2.2 }, ndaaCompliant: true },
    { manufacturer: 'Ubiquiti', model: 'GigaBeam Plus', partNumber: 'UBI-GBE-PLUS', category: 'networking', specs: { frequency: 60.0, maxThroughput: 1000, fadeMargin: 25, windArea: 1.1 }, ndaaCompliant: true },
    { manufacturer: 'Ubiquiti', model: 'Wave AP', partNumber: 'UBI-WAVE-AP', category: 'networking', specs: { frequency: 60.0, maxThroughput: 2000, fadeMargin: 30, windArea: 1.5 }, ndaaCompliant: true },
    { manufacturer: 'Siklu', model: 'MultiHaul TG', partNumber: 'SIKLU-MH-TG', category: 'networking', specs: { frequency: 60.0, maxThroughput: 1000, fadeMargin: 30, windArea: 0.8 }, ndaaCompliant: true },
    { manufacturer: 'Siklu', model: 'EtherHaul 600T', partNumber: 'SIKLU-EH-600T', category: 'networking', specs: { frequency: 60.0, maxThroughput: 500, fadeMargin: 25, windArea: 0.7 }, ndaaCompliant: true },
    { manufacturer: 'Cambium', model: 'Force 300-25', partNumber: 'CAMBIUM-F300-25', category: 'networking', specs: { frequency: 5.8, maxThroughput: 450, fadeMargin: 35, windArea: 2.5 }, ndaaCompliant: true },
    { manufacturer: 'Cambium', model: 'cnWave V1000', partNumber: 'CAMBIUM-CNW-V1000', category: 'networking', specs: { frequency: 60.0, maxThroughput: 1000, fadeMargin: 28, windArea: 1.2 }, ndaaCompliant: true },
  ];

  // Access control devices with power specs
  const powerDevices = [
    { manufacturer: 'Verkada', model: 'AC42', partNumber: 'VERKADA-AC42', category: 'access_control', specs: { powerDrawAmps: 0.5, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Verkada', model: 'AC41', partNumber: 'VERKADA-AC41', category: 'access_control', specs: { powerDrawAmps: 0.4, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Verkada', model: 'TD52 Intercom', partNumber: 'VERKADA-TD52', category: 'av', specs: { powerDrawAmps: 0.45, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Brivo', model: 'ACS6000', partNumber: 'BRIVO-ACS6000', category: 'access_control', specs: { powerDrawAmps: 0.6, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Brivo', model: 'ACS300', partNumber: 'BRIVO-ACS300', category: 'access_control', specs: { powerDrawAmps: 0.3, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Command Access', model: 'ML1 Mortise', partNumber: 'CA-ML1', category: 'access_control', specs: { powerDrawAmps: 0.15, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Command Access', model: 'LR Panic', partNumber: 'CA-LR-PANIC', category: 'access_control', specs: { powerDrawAmps: 0.9, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Trine', model: '3000 Strike', partNumber: 'TRINE-3000', category: 'access_control', specs: { powerDrawAmps: 0.24, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Trine', model: '4800 Strike', partNumber: 'TRINE-4800', category: 'access_control', specs: { powerDrawAmps: 0.28, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'HES', model: '1006 Strike', partNumber: 'HES-1006', category: 'access_control', specs: { powerDrawAmps: 0.45, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'HES', model: '9600 Surface', partNumber: 'HES-9600', category: 'access_control', specs: { powerDrawAmps: 0.45, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Avigilon', model: 'Alta Reader', partNumber: 'AVIGILON-ALTA-RDR', category: 'access_control', specs: { powerDrawAmps: 0.2, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Avigilon', model: 'Video Intercom', partNumber: 'AVIGILON-VID-INT', category: 'av', specs: { powerDrawAmps: 0.6, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Aiphone', model: 'IX-DV', partNumber: 'AIPHONE-IX-DV', category: 'av', specs: { powerDrawAmps: 0.35, powerVoltage: 24 }, ndaaCompliant: true },
    { manufacturer: 'Aiphone', model: 'IXG-DM7', partNumber: 'AIPHONE-IXG-DM7', category: 'av', specs: { powerDrawAmps: 0.5, powerVoltage: 24 }, ndaaCompliant: true },
  ];

  // Seed all devices
  const allDevices = [...fovDevices, ...lprDevices, ...wirelessDevices, ...powerDevices];
  for (const d of allDevices) {
    await prisma.device.upsert({
      where: { partNumber: d.partNumber },
      update: { specs: d.specs, ndaaCompliant: d.ndaaCompliant },
      create: {
        manufacturer: d.manufacturer,
        category: d.category,
        model: d.model,
        partNumber: d.partNumber,
        specs: d.specs,
        ndaaCompliant: d.ndaaCompliant,
      },
    });
  }

  // Merge LPR specs into shared FOV/LPR devices
  for (const shared of sharedFovLpr) {
    const existing = await prisma.device.findUnique({ where: { partNumber: shared.partNumber } });
    if (existing) {
      const currentSpecs = (existing.specs as Record<string, unknown>) || {};
      await prisma.device.update({
        where: { partNumber: shared.partNumber },
        data: { specs: { ...currentSpecs, ...shared.lprSpecs } },
      });
    }
  }

  console.log(`Seeded ${allDevices.length} calculator devices`);

  // --- Reference Data ---
  const referenceData = [
    // Camera power types
    { category: 'camera_power_type', key: 'standard', label: 'Standard (7W)', data: { watts: 7 }, sortOrder: 0 },
    { category: 'camera_power_type', key: 'ir_enhanced', label: 'IR Enhanced (13W)', data: { watts: 13 }, sortOrder: 1 },
    { category: 'camera_power_type', key: 'ai_motorized', label: 'AI Motorized (25W)', data: { watts: 25 }, sortOrder: 2 },
    { category: 'camera_power_type', key: 'ptz_heater', label: 'PTZ / Heater (60W)', data: { watts: 60 }, sortOrder: 3 },

    // Smart codecs
    { category: 'smart_codec', key: 'h265_standard', label: 'Standard H.265', data: { multiplier: 1.0 }, sortOrder: 0 },
    { category: 'smart_codec', key: 'axis_zipstream', label: 'Axis Zipstream (ARTPEC-8)', data: { multiplier: 0.50 }, sortOrder: 1 },
    { category: 'smart_codec', key: 'hanwha_wisestream', label: 'Hanwha WiseStream III (AI)', data: { multiplier: 0.20 }, sortOrder: 2 },
    { category: 'smart_codec', key: 'ipro_ai', label: 'i-PRO AI Smart Coding', data: { multiplier: 0.25 }, sortOrder: 3 },
    { category: 'smart_codec', key: 'avigilon_hdsm', label: 'Avigilon HDSM SmartCodec', data: { multiplier: 0.50 }, sortOrder: 4 },
    { category: 'smart_codec', key: 'dw_ai', label: 'DigitalWatchdog AI', data: { multiplier: 0.50 }, sortOrder: 5 },

    // Bitrate standards
    { category: 'bitrate_standard', key: '720p', label: '720p', data: { mbps: 1.5 }, sortOrder: 0 },
    { category: 'bitrate_standard', key: '1080p', label: '1080p', data: { mbps: 3.0 }, sortOrder: 1 },
    { category: 'bitrate_standard', key: '4MP', label: '4MP', data: { mbps: 5.0 }, sortOrder: 2 },
    { category: 'bitrate_standard', key: '5MP', label: '5MP', data: { mbps: 6.0 }, sortOrder: 3 },
    { category: 'bitrate_standard', key: '4K', label: '4K', data: { mbps: 10.0 }, sortOrder: 4 },

    // Drive sizes
    { category: 'drive_size', key: '8', label: '8 TB', data: { tb: 8 }, sortOrder: 0 },
    { category: 'drive_size', key: '10', label: '10 TB', data: { tb: 10 }, sortOrder: 1 },
    { category: 'drive_size', key: '12', label: '12 TB', data: { tb: 12 }, sortOrder: 2 },
    { category: 'drive_size', key: '14', label: '14 TB', data: { tb: 14 }, sortOrder: 3 },
    { category: 'drive_size', key: '16', label: '16 TB', data: { tb: 16 }, sortOrder: 4 },
    { category: 'drive_size', key: '18', label: '18 TB', data: { tb: 18 }, sortOrder: 5 },
    { category: 'drive_size', key: '20', label: '20 TB', data: { tb: 20 }, sortOrder: 6 },

    // RAID levels
    { category: 'raid_level', key: 'raid5', label: 'RAID 5', data: { parity: 1, penalty: 4 }, sortOrder: 0 },
    { category: 'raid_level', key: 'raid6', label: 'RAID 6', data: { parity: 2, penalty: 6 }, sortOrder: 1 },

    // Record modes
    { category: 'record_mode', key: 'always', label: 'Always', data: { note: 'Continuous recording' }, sortOrder: 0 },
    { category: 'record_mode', key: 'motion', label: 'Motion Only', data: { note: 'Records on motion events' }, sortOrder: 1 },
    { category: 'record_mode', key: 'motion_lowres', label: 'Motion + Low-Res Continuous', data: { note: 'Low-res continuous + high-res on motion' }, sortOrder: 2 },
    { category: 'record_mode', key: 'never', label: 'Never', data: { note: 'Live view only' }, sortOrder: 3 },

    // Motion presets
    { category: 'motion_preset', key: '100', label: '100% - Continuous', data: { percentage: 100 }, sortOrder: 0 },
    { category: 'motion_preset', key: '75', label: '75% - Heavy Traffic', data: { percentage: 75 }, sortOrder: 1 },
    { category: 'motion_preset', key: '50', label: '50% - Moderate Activity', data: { percentage: 50 }, sortOrder: 2 },
    { category: 'motion_preset', key: '30', label: '30% - Light Traffic', data: { percentage: 30 }, sortOrder: 3 },
    { category: 'motion_preset', key: '10', label: '10% - Infrequent Activity', data: { percentage: 10 }, sortOrder: 4 },

    // PPF presets (shared by FOV and LPR calculators)
    { category: 'ppf_preset', key: 'identification', label: 'Identification (76 PPF)', data: { value: 76, desc: 'Face capture, forensic detail' }, sortOrder: 0 },
    { category: 'ppf_preset', key: 'recognition', label: 'Recognition (38 PPF)', data: { value: 38, desc: 'Identify known individuals' }, sortOrder: 1 },
    { category: 'ppf_preset', key: 'observation', label: 'Observation (19 PPF)', data: { value: 19, desc: 'See activity and body movement' }, sortOrder: 2 },
    { category: 'ppf_preset', key: 'detection', label: 'Detection (10 PPF)', data: { value: 10, desc: 'Detect presence / motion only' }, sortOrder: 3 },

    // Shutter steps for LPR
    { category: 'shutter_step', key: '250', label: '1/250', data: { value: 250 }, sortOrder: 0 },
    { category: 'shutter_step', key: '500', label: '1/500', data: { value: 500 }, sortOrder: 1 },
    { category: 'shutter_step', key: '1000', label: '1/1000', data: { value: 1000 }, sortOrder: 2 },
    { category: 'shutter_step', key: '1600', label: '1/1600', data: { value: 1600 }, sortOrder: 3 },
    { category: 'shutter_step', key: '2000', label: '1/2000', data: { value: 2000 }, sortOrder: 4 },
    { category: 'shutter_step', key: '4000', label: '1/4000', data: { value: 4000 }, sortOrder: 5 },

    // LPR PPF standard
    { category: 'lpr_standard', key: 'lpr_ppf', label: 'LPR PPF Standard', data: { value: 32 }, sortOrder: 0 },

    // Door types
    { category: 'door_type', key: 'standard_interior', label: 'Standard Interior', data: {}, sortOrder: 0 },
    { category: 'door_type', key: 'fire_rated', label: 'Fire-Rated', data: {}, sortOrder: 1 },
    { category: 'door_type', key: 'fire_rated_stairwell', label: 'Fire-Rated Stairwell', data: {}, sortOrder: 2 },
    { category: 'door_type', key: 'glass_storefront', label: 'Glass Storefront', data: {}, sortOrder: 3 },
    { category: 'door_type', key: 'emergency_exit', label: 'Emergency Exit', data: {}, sortOrder: 4 },
    { category: 'door_type', key: 'mantrap', label: 'Mantrap', data: {}, sortOrder: 5 },

    // Lock types
    { category: 'lock_type', key: 'strike_fail_secure', label: 'Electric Strike (Fail-Secure)', data: {}, sortOrder: 0 },
    { category: 'lock_type', key: 'strike_fail_safe', label: 'Electric Strike (Fail-Safe)', data: {}, sortOrder: 1 },
    { category: 'lock_type', key: 'maglock_fail_safe', label: 'Maglock (Fail-Safe)', data: {}, sortOrder: 2 },
    { category: 'lock_type', key: 'mortise_fail_secure', label: 'Mortise Lock (Fail-Secure)', data: {}, sortOrder: 3 },
    { category: 'lock_type', key: 'mortise_fail_safe', label: 'Mortise Lock (Fail-Safe)', data: {}, sortOrder: 4 },
    { category: 'lock_type', key: 'panic_elr', label: 'Panic Hardware - Electric Latch Retraction', data: {}, sortOrder: 5 },
    { category: 'lock_type', key: 'panic_trim', label: 'Panic Hardware - Electrified Trim', data: {}, sortOrder: 6 },

    // REX types
    { category: 'rex_type', key: 'pir', label: 'PIR Motion Sensor', data: {}, sortOrder: 0 },
    { category: 'rex_type', key: 'push_button', label: 'Push Button', data: {}, sortOrder: 1 },
    { category: 'rex_type', key: 'pneumatic_pte', label: 'Pneumatic Push-to-Exit Bar', data: {}, sortOrder: 2 },
    { category: 'rex_type', key: 'touch_sense', label: 'Touch Sense Bar', data: {}, sortOrder: 3 },

    // Wiring templates
    { category: 'wiring_template', key: 'reader_osdp', label: 'Reader (OSDP)', data: { type: 'Shielded OSDP', gauge: '22 AWG', conductors: '4C', conduit: '3/4" EMT' }, sortOrder: 0 },
    { category: 'wiring_template', key: 'lock', label: 'Lock', data: { type: 'Stranded', gauge: '18 AWG', conductors: '2C', conduit: '3/4" EMT' }, sortOrder: 1 },
    { category: 'wiring_template', key: 'dps_status', label: 'DPS / Status', data: { type: 'Stranded', gauge: '22 AWG', conductors: '2C', conduit: '3/4" EMT' }, sortOrder: 2 },
    { category: 'wiring_template', key: 'rex', label: 'REX', data: { type: 'Stranded', gauge: '22 AWG', conductors: '4C', conduit: '3/4" EMT' }, sortOrder: 3 },
    { category: 'wiring_template', key: 'auto_operator', label: 'Auto-Operator', data: { type: 'Stranded', gauge: '18 AWG', conductors: '4C', conduit: '1/2" Flex' }, sortOrder: 4 },
    { category: 'wiring_template', key: 'intercom', label: 'Intercom', data: { type: 'Shielded', gauge: '18 AWG', conductors: '4C', conduit: '3/4" EMT' }, sortOrder: 5 },
    { category: 'wiring_template', key: 'interlock_relay', label: 'Interlock Relay (Fire Alarm Tie)', data: { type: 'Stranded', gauge: '18 AWG', conductors: '2C', conduit: '3/4" EMT' }, sortOrder: 6 },

    // Controller brands
    { category: 'controller_brand', key: 'verkada', label: 'Verkada', data: { models: ['AC42', 'AC41'] }, sortOrder: 0 },
    { category: 'controller_brand', key: 'brivo', label: 'Brivo', data: { models: ['ACS6000', 'ACS300'] }, sortOrder: 1 },
    { category: 'controller_brand', key: 'avigilon', label: 'Avigilon', data: { models: ['Alta Reader'] }, sortOrder: 2 },

    // Lock brands
    { category: 'lock_brand', key: 'command_access', label: 'Command Access', data: { models: ['ML1 Mortise', 'LR Panic'] }, sortOrder: 0 },
    { category: 'lock_brand', key: 'trine', label: 'Trine', data: { models: ['3000 Strike', '4800 Strike'] }, sortOrder: 1 },
    { category: 'lock_brand', key: 'hes', label: 'HES', data: { models: ['1006 Strike', '9600 Surface'] }, sortOrder: 2 },

    // Intercom brands
    { category: 'intercom_brand', key: 'verkada', label: 'Verkada', data: { models: ['TD52 Intercom'] }, sortOrder: 0 },
    { category: 'intercom_brand', key: 'avigilon', label: 'Avigilon', data: { models: ['Video Intercom'] }, sortOrder: 1 },
    { category: 'intercom_brand', key: 'aiphone', label: 'Aiphone', data: { models: ['IX-DV', 'IXG-DM7'] }, sortOrder: 2 },
  ];

  for (const ref of referenceData) {
    await prisma.calcReferenceData.upsert({
      where: { category_key: { category: ref.category, key: ref.key } },
      update: { label: ref.label, data: ref.data, sortOrder: ref.sortOrder },
      create: ref,
    });
  }

  console.log(`Seeded ${referenceData.length} reference data entries`);

  // --- Mount Configs ---
  const mountConfigs = [
    // Hanwha generic
    { manufacturer: 'Hanwha', cameraModel: null, locationType: 'Wall', components: [{ component: 'Adapter', partBase: 'SBP-300WM', description: 'Wall Mount Adapter' }, { component: 'Bracket', partBase: 'SBP-300NB', description: 'Wall Bracket' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    { manufacturer: 'Hanwha', cameraModel: null, locationType: 'Corner', components: [{ component: 'Adapter', partBase: 'SBP-300WM', description: 'Wall Mount Adapter' }, { component: 'Bracket', partBase: 'SBP-300NC', description: 'Corner Bracket' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    { manufacturer: 'Hanwha', cameraModel: null, locationType: 'Pole', components: [{ component: 'Adapter', partBase: 'SBP-300WM', description: 'Wall Mount Adapter' }, { component: 'Bracket', partBase: 'SBP-300NP', description: 'Pole Bracket' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    { manufacturer: 'Hanwha', cameraModel: null, locationType: 'Flush', components: [{ component: 'Adapter', partBase: 'SBP-300CM', description: 'Flush/Ceiling Mount' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    // Hanwha PNM-C12083RVD overrides
    { manufacturer: 'Hanwha', cameraModel: 'PNM-C12083RVD', locationType: 'Wall', components: [{ component: 'Adapter', partBase: 'SBP-300WM', description: 'Wall Mount Adapter' }, { component: 'Bracket', partBase: 'SBP-302CM', description: 'Multi-Sensor Wall Bracket' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    { manufacturer: 'Hanwha', cameraModel: 'PNM-C12083RVD', locationType: 'Corner', components: [{ component: 'Adapter', partBase: 'SBP-300WM', description: 'Wall Mount Adapter' }, { component: 'Bracket', partBase: 'SBP-302CM', description: 'Multi-Sensor Corner Bracket' }, { component: 'Corner Adapter', partBase: 'SBP-300NC', description: 'Corner Adapter Plate' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    { manufacturer: 'Hanwha', cameraModel: 'PNM-C12083RVD', locationType: 'Pole', components: [{ component: 'Adapter', partBase: 'SBP-300WM', description: 'Wall Mount Adapter' }, { component: 'Bracket', partBase: 'SBP-302CM', description: 'Multi-Sensor Pole Bracket' }, { component: 'Pole Adapter', partBase: 'SBP-300NP', description: 'Pole Adapter Clamp' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    { manufacturer: 'Hanwha', cameraModel: 'PNM-C12083RVD', locationType: 'Flush', components: [{ component: 'Adapter', partBase: 'SBP-302CM', description: 'Multi-Sensor Flush Mount' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    // Hanwha PNM-9322VQP overrides
    { manufacturer: 'Hanwha', cameraModel: 'PNM-9322VQP', locationType: 'Wall', components: [{ component: 'Adapter', partBase: 'SBP-300WM', description: 'Wall Mount Adapter' }, { component: 'Bracket', partBase: 'SBP-302CM', description: 'Multi-Sensor Wall Bracket' }], colorSuffix: { White: 'W1', Black: 'B1' }, colorPattern: 'suffix' },
    // Axis generic
    { manufacturer: 'Axis', cameraModel: null, locationType: 'Wall', components: [{ component: 'Adapter', partBase: 'T91B61', description: 'Wall Mount Bracket' }, { component: 'Bracket', partBase: 'T94N01D', description: 'Pendant Kit' }], colorSuffix: { White: ' White', Black: ' Black' }, colorPattern: 'replace-last' },
    { manufacturer: 'Axis', cameraModel: null, locationType: 'Corner', components: [{ component: 'Adapter', partBase: 'T91B61', description: 'Wall Mount Bracket' }, { component: 'Bracket', partBase: 'T94N01D', description: 'Pendant Kit' }, { component: 'Corner Adapter', partBase: 'T91A67', description: 'Corner Bracket' }], colorSuffix: { White: ' White', Black: ' Black' }, colorPattern: 'replace-last' },
    { manufacturer: 'Axis', cameraModel: null, locationType: 'Pole', components: [{ component: 'Adapter', partBase: 'T91B61', description: 'Wall Mount Bracket' }, { component: 'Bracket', partBase: 'T91A47', description: 'Pole Mount Adapter' }], colorSuffix: { White: ' White', Black: ' Black' }, colorPattern: 'replace-last' },
    { manufacturer: 'Axis', cameraModel: null, locationType: 'Flush', components: [{ component: 'Adapter', partBase: 'T94F01S', description: 'Ceiling/Flush Mount Housing' }], colorSuffix: { White: ' White', Black: ' Black' }, colorPattern: 'replace-last' },
    // Axis Q6135-LE overrides
    { manufacturer: 'Axis', cameraModel: 'Q6135-LE', locationType: 'Wall', components: [{ component: 'Adapter', partBase: 'T91B63', description: 'PTZ Wall Mount' }, { component: 'Bracket', partBase: 'T94N01D', description: 'Pendant Kit' }], colorSuffix: { White: ' White', Black: ' Black' }, colorPattern: 'replace-last' },
    { manufacturer: 'Axis', cameraModel: 'Q6135-LE', locationType: 'Pole', components: [{ component: 'Adapter', partBase: 'T91B63', description: 'PTZ Wall Mount' }, { component: 'Bracket', partBase: 'T91A47', description: 'Pole Mount Adapter' }], colorSuffix: { White: ' White', Black: ' Black' }, colorPattern: 'replace-last' },
  ];

  for (const mc of mountConfigs) {
    await prisma.mountConfig.upsert({
      where: {
        manufacturer_cameraModel_locationType: {
          manufacturer: mc.manufacturer,
          cameraModel: mc.cameraModel,
          locationType: mc.locationType,
        },
      },
      update: { components: mc.components, colorSuffix: mc.colorSuffix, colorPattern: mc.colorPattern },
      create: mc,
    });
  }

  console.log(`Seeded ${mountConfigs.length} mount configs`);

  // --- Compliance Jurisdictions ---
  const jurisdictions = [
    { stateLabel: 'Louisiana (LASFM/NFPA 101)', code: 'LASFM', authority: 'Louisiana State Fire Marshal', adoptedCodes: ['NFPA 101', 'NFPA 80', 'IBC 2021'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: true, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['LASFM: Maglocks require PIR REX plus pneumatic push-to-exit per Louisiana State Fire Marshal amendments.', 'LASFM: Mantrap interlocks must drop all locks on fire alarm activation.', 'LASFM: Fail-Safe hardware required on all fire-rated doors with FACP tie-in.'], sortOrder: 0 },
    { stateLabel: 'Texas (TFC/NFPA 101)', code: 'TFC', authority: 'Texas State Fire Marshal / Texas Fire Code', adoptedCodes: ['NFPA 101', 'NFPA 80', 'IFC 2021'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['TFC: Texas Fire Code adopts IFC 2021 with state amendments.', 'TFC: Electromagnetic locks on egress doors require sensor-release hardware per TFC 1010.1.9.9.', 'TFC: Fire watch required during fire alarm system impairment.'], sortOrder: 1 },
    { stateLabel: 'Alabama (ASFM/IFC)', code: 'ASFM-AL', authority: 'Alabama State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 101 (referenced)', 'NFPA 80'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['ASFM-AL: Alabama adopts IFC/IBC 2021 with state amendments (Code of Alabama Title 34).', 'ASFM-AL: Electromagnetic locks require listed sensor-release per IFC 1010.1.9.9.', 'ASFM-AL: Local AHJ may impose additional requirements.'], sortOrder: 2 },
    { stateLabel: 'Arkansas (ASFM-AR/IFC)', code: 'ASFM-AR', authority: 'Arkansas State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: false, panicHardwareOnEgressDoors: true, additionalNotes: ['ASFM-AR: Arkansas adopts IFC/IBC 2021 (ACA 12-29).', 'ASFM-AR: Electromagnetic locks require sensor release per IFC 1010.1.9.9.'], sortOrder: 3 },
    { stateLabel: 'Florida (FSFM/FFC)', code: 'FSFM', authority: 'Florida State Fire Marshal / Florida Fire Prevention Code', adoptedCodes: ['FFC (based on NFPA 1)', 'NFPA 101', 'NFPA 80', 'FBC (Florida Building Code)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: true, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['FSFM: Florida adopts NFPA 1 (Fire Prevention Code) as the Florida Fire Prevention Code with state amendments.', 'FSFM: Electromagnetic locks require PIR REX plus pneumatic push-to-exit on means of egress (FFC 10.2).', 'FSFM: High-rise buildings (75+ ft) require additional access control monitoring per FBC.', 'FSFM: Hurricane-rated doors may have additional hardware constraints -- verify wind load rating.'], sortOrder: 4 },
    { stateLabel: 'Georgia (GSFM/IFC)', code: 'GSFM', authority: 'Georgia State Fire Marshal / Insurance and Safety Fire Commissioner', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 101 (referenced)', 'NFPA 80'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['GSFM: Georgia adopts IFC/IBC 2021 through the Safety Fire Commissioner (OCGA 25-2).', 'GSFM: Electromagnetic locks require listed sensor-release per IFC 1010.1.9.9.', 'GSFM: Special occupancy rules for educational (K-12) and healthcare facilities.'], sortOrder: 5 },
    { stateLabel: 'Kentucky (KSFM/IFC)', code: 'KSFM', authority: 'Kentucky State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['KSFM: Kentucky adopts IFC/IBC 2021 (KRS 227).', 'KSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.', 'KSFM: Assembly occupancies (50+ persons) have additional egress hardware requirements.'], sortOrder: 6 },
    { stateLabel: 'Mississippi (MSFM/IBC)', code: 'MSFM', authority: 'Mississippi State Fire Marshal', adoptedCodes: ['IBC 2021', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: false, panicHardwareOnEgressDoors: true, additionalNotes: ['MSFM: Mississippi adopts IBC/IFC 2021 (MS Code 45-11).', 'MSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.', 'MSFM: Local jurisdictions may have limited enforcement -- verify local AHJ.'], sortOrder: 7 },
    { stateLabel: 'North Carolina (NCOSFM/NC Building Code)', code: 'NCOSFM', authority: 'North Carolina Office of State Fire Marshal', adoptedCodes: ['NC Building Code (based on IBC 2021)', 'NC Fire Code (based on IFC)', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['NCOSFM: North Carolina adopts amended IBC/IFC as NC Building Code (NCGS 143-138).', 'NCOSFM: Electromagnetic locks require listed sensor-release per NC Fire Code.', 'NCOSFM: School security hardware must comply with NC Department of Public Instruction guidelines.'], sortOrder: 8 },
    { stateLabel: 'South Carolina (SCSFM/IFC)', code: 'SCSFM', authority: 'South Carolina State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['SCSFM: South Carolina adopts IFC/IBC 2021 (SC Code 23-9).', 'SCSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.'], sortOrder: 9 },
    { stateLabel: 'Tennessee (TSFM/IFC)', code: 'TSFM', authority: 'Tennessee State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['TSFM: Tennessee adopts IFC/IBC 2021 (TCA 68-120).', 'TSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.', 'TSFM: Metro Nashville and Memphis may have additional local amendments.'], sortOrder: 10 },
    { stateLabel: 'Virginia (VSFM/USBC)', code: 'VSFM', authority: 'Virginia State Fire Marshal / VA Uniform Statewide Building Code', adoptedCodes: ['USBC (based on IBC 2021)', 'SFPC (based on IFC)', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['VSFM: Virginia adopts USBC (Uniform Statewide Building Code) based on IBC/IFC 2021.', 'VSFM: Electromagnetic locks require sensor release per USBC/SFPC.', 'VSFM: Northern Virginia jurisdictions (Arlington, Fairfax) may have expedited review requirements.'], sortOrder: 11 },
    { stateLabel: 'West Virginia (WVSFM/IFC)', code: 'WVSFM', authority: 'West Virginia State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: false, panicHardwareOnEgressDoors: true, additionalNotes: ['WVSFM: West Virginia adopts IFC/IBC 2021 (WV Code 29-3).', 'WVSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.'], sortOrder: 12 },
    { stateLabel: 'Maine (MOSFM/NFPA 101)', code: 'MOSFM', authority: 'Maine Office of State Fire Marshal', adoptedCodes: ['NFPA 101', 'NFPA 1', 'NFPA 80', 'MUBEC (Maine Uniform Building Code)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['MOSFM: Maine adopts NFPA 101 and NFPA 1 as primary fire codes.', 'MOSFM: MUBEC (Maine Uniform Building and Energy Code) applies statewide.', 'MOSFM: Electromagnetic locks require sensor release per NFPA 101 7.2.1.5.5.'], sortOrder: 13 },
    { stateLabel: 'New Hampshire (NHSFM/NFPA 101)', code: 'NHSFM', authority: 'New Hampshire State Fire Marshal', adoptedCodes: ['NFPA 101', 'NFPA 1', 'NFPA 80', 'NH Building Code (based on IBC)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['NHSFM: New Hampshire adopts NFPA 101 and NH State Building Code (RSA 155-A).', 'NHSFM: Electromagnetic locks require sensor release per NFPA 101.'], sortOrder: 14 },
    { stateLabel: 'Vermont (VDFP/NFPA 101)', code: 'VDFP', authority: 'Vermont Division of Fire Prevention', adoptedCodes: ['NFPA 101', 'NFPA 1', 'NFPA 80', 'VT Fire and Building Safety Code'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: false, panicHardwareOnEgressDoors: true, additionalNotes: ['VDFP: Vermont adopts NFPA 101 and Vermont Fire and Building Safety Code (20 VSA Chapter 173).', 'VDFP: Electromagnetic locks require sensor release per NFPA 101.'], sortOrder: 15 },
    { stateLabel: 'Massachusetts (MSFM-MA/527 CMR)', code: 'MSFM-MA', authority: 'Massachusetts State Fire Marshal / Department of Fire Services', adoptedCodes: ['527 CMR (MA Fire Code)', 'NFPA 101', 'NFPA 80', '780 CMR (MA Building Code based on IBC)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: true, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['MSFM-MA: Massachusetts adopts 527 CMR as fire prevention code with NFPA 101 references.', 'MSFM-MA: Electromagnetic locks require PIR REX plus pneumatic push-to-exit per 527 CMR 10.00.', 'MSFM-MA: Boston has additional local fire department requirements -- verify with BFD.', 'MSFM-MA: All fire protection systems require Certificate of Competency technicians.'], sortOrder: 16 },
    { stateLabel: 'Rhode Island (RISFM/IFC)', code: 'RISFM', authority: 'Rhode Island State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['RISFM: Rhode Island adopts IFC/IBC 2021 (RIGL 23-28.12).', 'RISFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.', 'RISFM: The Station nightclub fire (2003) resulted in strict assembly occupancy requirements.'], sortOrder: 17 },
    { stateLabel: 'Connecticut (CTSFM/CT Fire Safety Code)', code: 'CTSFM', authority: 'Connecticut State Fire Marshal / DESPP', adoptedCodes: ['CT Fire Safety Code', 'NFPA 101', 'NFPA 80', 'CT State Building Code (based on IBC)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['CTSFM: Connecticut adopts CT Fire Safety Code referencing NFPA 101 (CGS 29-305).', 'CTSFM: Electromagnetic locks require sensor release per CT Fire Safety Code.', 'CTSFM: Licensed fire protection contractor required for all fire alarm system connections.'], sortOrder: 18 },
    { stateLabel: 'New York (NYSFM/NY Fire Code)', code: 'NYSFM', authority: 'New York State Office of Fire Prevention and Control', adoptedCodes: ['NY Fire Code (based on IFC)', 'NY Building Code (based on IBC)', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: true, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['NYSFM: New York adopts Uniform Fire Prevention and Building Code (19 NYCRR Part 1200).', 'NYSFM: Electromagnetic locks require PIR REX plus secondary manual release per NY Fire Code 1010.1.9.9.', 'NYSFM: NYC has separate NYC Building Code and NYC Fire Code -- verify if project is in NYC.', 'NYSFM: NYC Local Law 5 (1973) and subsequent amendments impose stricter egress requirements.'], sortOrder: 19 },
    { stateLabel: 'New Jersey (NJDCA/IFC)', code: 'NJDCA', authority: 'New Jersey Division of Fire Safety / DCA', adoptedCodes: ['NJ Uniform Construction Code (based on IBC)', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['NJDCA: New Jersey adopts Uniform Construction Code (NJ UCC) with IFC references (NJSA 52:27D).', 'NJDCA: Electromagnetic locks require sensor release per NJ UCC/IFC.', 'NJDCA: Licensed locksmith required for commercial access control installations.'], sortOrder: 20 },
    { stateLabel: 'Pennsylvania (PASFM/IFC)', code: 'PASFM', authority: 'Pennsylvania State Fire Marshal / L&I', adoptedCodes: ['PA UCC (based on IBC 2021)', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['PASFM: Pennsylvania adopts PA Uniform Construction Code (34 PA Code Chapter 403).', 'PASFM: Electromagnetic locks require sensor release per PA UCC/IFC.', 'PASFM: Philadelphia has additional local amendments -- verify for Philadelphia projects.'], sortOrder: 21 },
    { stateLabel: 'Delaware (DSFM/IFC)', code: 'DSFM', authority: 'Delaware State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['DSFM: Delaware adopts IFC/IBC 2021 with state amendments (Title 16, Chapter 66).', 'DSFM: Delaware State Fire Marshal has sole jurisdiction over fire safety statewide.', 'DSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.'], sortOrder: 22 },
    { stateLabel: 'Maryland (MOSFM-MD/IFC)', code: 'MOSFM-MD', authority: 'Maryland Office of the State Fire Marshal', adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['MOSFM-MD: Maryland adopts IFC/IBC 2021 (PS 6-301).', 'MOSFM-MD: Electromagnetic locks require sensor release per IFC 1010.1.9.9.', "MOSFM-MD: Montgomery County and Prince George's County may have additional requirements."], sortOrder: 23 },
    { stateLabel: 'Washington DC (DCFEMS/IFC)', code: 'DCFEMS', authority: 'DC Fire and EMS / Department of Consumer and Regulatory Affairs', adoptedCodes: ['DC Construction Code (based on IBC)', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: true, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['DCFEMS: DC adopts DC Construction Code with IFC/IBC references (12-A DCMR).', 'DCFEMS: Electromagnetic locks require PIR REX plus secondary manual release.', 'DCFEMS: Federal buildings (GSA) may have additional requirements beyond local code.', 'DCFEMS: Historic preservation districts may restrict visible hardware modifications.'], sortOrder: 24 },
    { stateLabel: 'California (CSFM/CBC)', code: 'CSFM', authority: 'California State Fire Marshal', adoptedCodes: ['CBC Title 24', 'CFC (based on IFC)', 'NFPA 80', 'NFPA 101 (referenced)'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: true, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: true, panicHardwareOnEgressDoors: true, additionalNotes: ['CSFM: California Building Code (CBC) Title 24 Part 2, Chapter 10 governs egress.', 'CSFM: Electromagnetic locks require both motion sensor and irreversible action for release (CBC 1010.1.9.9).', 'CSFM: All access control devices must be CSFM-listed (7170 series listings).', 'CSFM: Hospital, school, and high-rise occupancies have additional requirements -- verify occupancy type.', 'CSFM: Delayed egress locks limited to 15 seconds max with audible alarm (CBC 1010.1.9.8).'], sortOrder: 25 },
    { stateLabel: 'Generic (IBC/NFPA 101)', code: 'IBC', authority: 'International Building Code / NFPA 101', adoptedCodes: ['IBC 2021', 'IFC 2021', 'NFPA 101', 'NFPA 80'], maglockRequiresPirRex: true, maglockRequiresPneumaticPte: false, fireRatedFailSafeRequired: true, fireRatedCloserRequired: true, facpTieInRequired: true, stairwellReIlluminationRequired: false, panicHardwareOnEgressDoors: true, additionalNotes: ['IBC: Generic baseline -- always verify local AHJ requirements.', 'IBC: Electromagnetic locks require sensor release per IBC 1010.1.9.9.'], sortOrder: 26 },
  ];

  for (const j of jurisdictions) {
    await prisma.complianceJurisdiction.upsert({
      where: { stateLabel: j.stateLabel },
      update: { code: j.code, authority: j.authority, adoptedCodes: j.adoptedCodes, maglockRequiresPirRex: j.maglockRequiresPirRex, maglockRequiresPneumaticPte: j.maglockRequiresPneumaticPte, fireRatedFailSafeRequired: j.fireRatedFailSafeRequired, fireRatedCloserRequired: j.fireRatedCloserRequired, facpTieInRequired: j.facpTieInRequired, stairwellReIlluminationRequired: j.stairwellReIlluminationRequired, panicHardwareOnEgressDoors: j.panicHardwareOnEgressDoors, additionalNotes: j.additionalNotes, sortOrder: j.sortOrder },
      create: j,
    });
  }

  console.log(`Seeded ${jurisdictions.length} compliance jurisdictions`);

  console.log('Calculator data seeding complete.');
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
