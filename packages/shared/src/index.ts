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

// --- Roles ---
export const DEFAULT_ROLES = [
  'admin',
  'manager',
  'sales',
  'presales',
  'project_manager',
  'field_technician',
  'subcontractor',
  'customer',
] as const;

export type DefaultRole = (typeof DEFAULT_ROLES)[number];

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
  'tools',
  'management',
] as const;
export type AppModule = (typeof APP_MODULES)[number];

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
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  return `${oppNumber}_${docType}_${sanitize(customer)}_${sanitize(jobName)}_V${version}`;
}

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
