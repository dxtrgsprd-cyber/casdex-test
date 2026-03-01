// ============================================================
// CASDEX Shared Types & Constants
// ============================================================

// --- Tenant ---
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Global Roles (platform-wide, stored on User.globalRole) ---
export const GLOBAL_ROLES = ['global_admin', 'global_manager'] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

// Max global_admin accounts allowed (main + backup)
export const MAX_GLOBAL_ADMINS = 2;

// --- Auth ---
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  tenantId: string;
  roles: string[];
  globalRole: GlobalRole | null; // 'global_admin' | 'global_manager' | null
  iat?: number;
  exp?: number;
}

// --- User ---
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  title?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface UserTenantRole {
  userId: string;
  tenantId: string;
  roleId: string;
  roleName: string;
}

// --- Organization Roles (per-tenant, stored in Role table) ---
export const DEFAULT_ORG_ROLES = [
  'org_admin',
  'org_manager',
  'sales',
  'presales',
  'project_manager',
  'installer',
  'subcontractor',
  'customer',
  'lead',
  'tech',
] as const;

export type DefaultOrgRole = (typeof DEFAULT_ORG_ROLES)[number];

// Backward-compat alias
export const DEFAULT_ROLES = DEFAULT_ORG_ROLES;
export type DefaultRole = DefaultOrgRole;

// --- Permissions ---
export const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_LEVELS = [
  'full_control',    // create + read + update + delete
  'read_update',     // read + update
  'read',            // read only
  'no_permission',   // no access
] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

// Maps permission levels to their allowed actions
export const PERMISSION_LEVEL_ACTIONS: Record<PermissionLevel, PermissionAction[]> = {
  full_control: ['create', 'read', 'update', 'delete'],
  read_update: ['read', 'update'],
  read: ['read'],
  no_permission: [],
};

// --- Modules (tabs that permissions can be assigned to) ---
export const APP_MODULES = [
  'opportunities',
  'survey',
  'design',
  'projects',
  'vendors',
  'subcontractors',
  'tools',
  'management',
] as const;
export type AppModule = (typeof APP_MODULES)[number];

// --- Tenant Settings (stored in Tenant.settings JSON field) ---
export interface TenantSettings {
  enabledModules: AppModule[];
}

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  enabledModules: [...APP_MODULES],
};

export function parseTenantSettings(raw: unknown): TenantSettings {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.enabledModules)) {
      const valid = obj.enabledModules.filter(
        (m): m is AppModule =>
          typeof m === 'string' && (APP_MODULES as readonly string[]).includes(m),
      );
      return { enabledModules: valid };
    }
  }
  return { ...DEFAULT_TENANT_SETTINGS };
}

export function isModuleEnabled(settings: TenantSettings, module: string): boolean {
  return settings.enabledModules.includes(module as AppModule);
}

// --- OPP Status ---
export const OPP_STATUSES = [
  'lead',
  'opp_created',
  'survey_scheduled',
  'survey_completed',
  'design_in_progress',
  'design_completed',
  'rfp_sent',
  'ready_for_quoting',
  'quote_pending_approval',
  'quote_approved',
  'quote_declined',
  'customer_review',
  'customer_approved',
  'customer_declined',
  'awaiting_po',
  'po_received',
  'ready_for_project',
  'project_active',
  'installation',
  'qc_in_progress',
  'qc_complete',
  'closeout',
  'closed_won',
  'closed_lost',
] as const;
export type OppStatus = (typeof OPP_STATUSES)[number];

// --- Risk Levels ---
export const RISK_LEVELS = ['low', 'moderate', 'elevated', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_CONTINGENCY: Record<RiskLevel, number> = {
  low: 0,
  moderate: 5,
  elevated: 10,
  high: 15,
  critical: 25,
};

// --- Document Types ---
export const DOCUMENT_TYPES = [
  'BOM',
  'MATERIAL_LIST',
  'RFP_SOW',
  'INSTALL_SOW',
  'FINAL_SOW',
  'HARDWARE_SCHEDULE',
  'DESIGN_DRAWING',
  'SURVEY_REPORT',
  'QUOTE',
  'CHANGE_ORDER',
  'SIGN_OFF_SHEET',
  'KICKOFF_PRESENTATION',
  'PROJECT_WORKBOOK',
  'CUSTOMER_WELCOME_EMAIL',
  'INSTALL_REMINDER_EMAIL',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Document naming: {OPP Number}_{Document Type}_{Customer}_{Job Name}_{Version}
export function formatDocumentName(
  oppNumber: string,
  docType: DocumentType,
  customer: string,
  jobName: string,
  version: number,
): string {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return `${oppNumber}_${docType}_${sanitize(customer)}_${sanitize(jobName)}_V${version}`;
}

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends Omit<ApiResponse<T[]>, 'data'> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
