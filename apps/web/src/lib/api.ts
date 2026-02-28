const rawBase = process.env.NEXT_PUBLIC_API_URL || 'https://casdex-test-production.up.railway.app/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`;

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check your connection and try again.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, body.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// --- Auth ---

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
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
  };
}

export const authApi = {
  login: (email: string, password: string, tenantId?: string) =>
    fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenantId }),
    }),

  refresh: (refreshToken: string) =>
    fetchApi<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
    ),

  logout: (token: string) =>
    fetchApi('/auth/logout', { method: 'POST', token }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    fetchApi('/auth/change-password', {
      method: 'POST',
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  requestPasswordReset: (email: string) =>
    fetchApi('/auth/reset-password/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (resetToken: string, password: string) =>
    fetchApi('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, password }),
    }),

  setPassword: (inviteToken: string, password: string) =>
    fetchApi('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ token: inviteToken, password }),
    }),

  switchTenant: (token: string, tenantId: string) =>
    fetchApi<LoginResponse>('/auth/switch-tenant', {
      method: 'POST',
      token,
      body: JSON.stringify({ tenantId }),
    }),
};

// --- Users ---

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  title: string | null;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; name: string; displayName: string };
}

export interface UserDetail extends UserListItem {
  isGlobalAdmin?: boolean;
  role: {
    id: string;
    name: string;
    displayName: string;
    permissions?: Array<{ id: string; module: string; action: string; allowed: boolean }>;
  };
}

export interface UsersListResponse {
  success: boolean;
  data: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const usersApi = {
  me: (token: string) =>
    fetchApi<{ success: boolean; data: unknown }>('/users/me', { token }),

  list: (token: string, params?: { page?: number; pageSize?: number; search?: string; roleId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.roleId) query.set('roleId', params.roleId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return fetchApi<UsersListResponse>(`/users${qs ? `?${qs}` : ''}`, { token });
  },

  listByTenant: (
    token: string,
    tenantId: string,
    params?: { page?: number; pageSize?: number; search?: string; roleId?: string; status?: string },
  ) =>
    fetchApi<UsersListResponse>(`/users/by-tenant/${tenantId}`, {
      method: 'POST',
      token,
      body: JSON.stringify(params ?? {}),
    }),

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: UserDetail }>(`/users/${id}`, { token }),

  create: (token: string, data: { email: string; firstName: string; lastName: string; roleId: string; phone?: string; title?: string; password?: string; tenantId?: string }) =>
    fetchApi<{ success: boolean; data: UserDetail }>('/users', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: { firstName?: string; lastName?: string; phone?: string; title?: string; isActive?: boolean }) =>
    fetchApi<{ success: boolean; data: UserDetail }>(`/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  updateRole: (token: string, id: string, roleId: string) =>
    fetchApi<{ success: boolean; data: UserDetail }>(`/users/${id}/role`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ roleId }),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/users/${id}`, { method: 'DELETE', token }),
};

// --- Roles ---

export interface RolePermission {
  id: string;
  module: string;
  action: string;
  allowed: boolean;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  isDefault: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: RolePermission[];
  _count: { userTenants: number };
}

export const rolesApi = {
  list: (token: string) =>
    fetchApi<{ success: boolean; data: Role[] }>('/roles', { token }),

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: Role }>(`/roles/${id}`, { token }),

  create: (token: string, data: { name: string; displayName: string; permissions?: Array<{ module: string; action: string; allowed: boolean }> }) =>
    fetchApi<{ success: boolean; data: Role }>('/roles', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: { displayName?: string; permissions?: Array<{ module: string; action: string; allowed: boolean }> }) =>
    fetchApi<{ success: boolean; data: Role }>(`/roles/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/roles/${id}`, { method: 'DELETE', token }),
};

// --- Opportunities ---

export interface OppTeamMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; firstName: string; lastName: string; email: string; title?: string };
}

export interface Opportunity {
  id: string;
  tenantId: string;
  oppNumber: string;
  projectNumber: string | null;
  status: string;
  customerName: string;
  customerContact: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  projectName: string;
  systemName: string | null;
  installAddress: string | null;
  installCity: string | null;
  installState: string | null;
  installZip: string | null;
  territory: string | null;
  projectDescription: string | null;
  notes: string | null;
  riskScore: number | null;
  poNumber: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  createdBy: { id: string; firstName: string; lastName: string; email?: string };
  teamMembers: OppTeamMember[];
  surveys: Array<{ id: string; title: string; status: string; scheduledDate: string | null }>;
  designs: Array<{ id: string; name: string; version: number; status: string }>;
  documents: Array<{ id: string; type: string; fileName: string; version: number; isSigned: boolean; createdAt: string }>;
  project: { id: string; projectNumber: string; status: string } | null;
  riskAssessments: Array<{ id: string; stage: string; overallScore: number; riskLevel: string }>;
  statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; changedBy: string; reason: string | null; createdAt: string }>;
  approvals: Array<{ id: string; type: string; status: string; requestedBy: string; approvedBy: string | null; reason: string | null; createdAt: string }>;
  _count: { surveys: number; designs: number; documents: number };
}

export interface OppMetrics {
  totalOpen: number;
  totalActive: number;
  closedThisMonth: number;
  closedThisYear: number;
  wonThisMonth: number;
  wonThisYear: number;
  wonTotal: number;
  byStatus: Array<{ status: string; count: number }>;
}

export const oppsApi = {
  list: (token: string, query?: Record<string, string>) => {
    const params = new URLSearchParams(query || {}).toString();
    return fetchApi<{ success: boolean; data: Opportunity[]; total: number }>(
      `/opportunities${params ? `?${params}` : ''}`,
      { token },
    );
  },

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: Opportunity }>(`/opportunities/${id}`, { token }),

  create: (token: string, data: Record<string, unknown>) =>
    fetchApi<{ success: boolean; data: Opportunity }>('/opportunities', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<{ success: boolean; data: Opportunity }>(`/opportunities/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  changeStatus: (token: string, id: string, status: string, reason?: string) =>
    fetchApi<{ success: boolean; data: Opportunity }>(`/opportunities/${id}/status`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ status, reason }),
    }),

  addTeamMember: (token: string, id: string, userId: string, role: string) =>
    fetchApi<{ success: boolean; data: Opportunity }>(`/opportunities/${id}/team`, {
      method: 'POST',
      token,
      body: JSON.stringify({ userId, role }),
    }),

  removeTeamMember: (token: string, id: string, memberId: string) =>
    fetchApi<{ success: boolean; data: Opportunity }>(`/opportunities/${id}/team/${memberId}`, {
      method: 'DELETE',
      token,
    }),

  assignProjectNumber: (token: string, id: string, projectNumber: string, projectManagerId: string) =>
    fetchApi<{ success: boolean; data: Opportunity }>(`/opportunities/${id}/project-number`, {
      method: 'POST',
      token,
      body: JSON.stringify({ projectNumber, projectManagerId }),
    }),

  requestApproval: (token: string, id: string, type: string, notes?: string) =>
    fetchApi(`/opportunities/${id}/approvals`, {
      method: 'POST',
      token,
      body: JSON.stringify({ type, notes }),
    }),

  resolveApproval: (token: string, id: string, approvalId: string, status: string, reason?: string) =>
    fetchApi(`/opportunities/${id}/approvals/${approvalId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ status, reason }),
    }),

  delete: (token: string, id: string) =>
    fetchApi(`/opportunities/${id}`, { method: 'DELETE', token }),

  metrics: (token: string) =>
    fetchApi<{ success: boolean; data: OppMetrics }>('/opportunities/metrics', { token }),
};

// --- Notifications ---

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (token: string, unreadOnly = false) =>
    fetchApi<{ success: boolean; data: Notification[] }>(
      `/notifications${unreadOnly ? '?unread=true' : ''}`,
      { token },
    ),

  count: (token: string) =>
    fetchApi<{ success: boolean; data: { count: number } }>('/notifications/count', { token }),

  markRead: (token: string, id: string) =>
    fetchApi(`/notifications/${id}/read`, { method: 'PUT', token }),

  markAllRead: (token: string) =>
    fetchApi('/notifications/read-all', { method: 'PUT', token }),
};

// --- Shared Contact Type ---

export interface ContactEntry {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

// --- Dashboard ---

export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  details: string;
  link: string;
}

export interface DashboardUnassignedOpp {
  id: string;
  oppNumber: string;
  customerName: string;
  projectName: string;
  status: string;
  territory: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
}

export interface DashboardVendor {
  id: string;
  name: string;
  categories: string[];
  contacts: ContactEntry[];
}

export interface DashboardSubcontractor {
  id: string;
  companyName: string;
  contacts: ContactEntry[];
  trades: string[];
  territories: string[];
}

export interface DashboardDocument {
  id: string;
  type: string;
  fileName: string;
  version: number;
  isSigned: boolean;
  createdAt: string;
  opportunity: { oppNumber: string; customerName: string } | null;
}

export interface DashboardRiskItem {
  id: string;
  overallScore: number;
  riskLevel: string;
  stage: string;
  opportunity: {
    id: string;
    oppNumber: string;
    customerName: string;
    projectName: string;
  };
}

export interface DashboardData {
  metrics: {
    oppsAssigned: number;
    surveysScheduled: number;
    oppsInProgress: number;
    projectsInProgress: number;
    oppsCompleted: { month: number; year: number; total: number };
    oppsWon: { month: number; year: number; total: number };
    projectsClosed: { month: number; year: number; total: number };
  };
  calendarEvents: CalendarEvent[];
  unassignedOpps: DashboardUnassignedOpp[];
  vendors: { total: number; items: DashboardVendor[] };
  subcontractors: { total: number; items: DashboardSubcontractor[] };
  recentDocuments: DashboardDocument[];
  riskItems: DashboardRiskItem[];
}

export const dashboardApi = {
  get: (token: string) =>
    fetchApi<{ success: boolean; data: DashboardData }>('/dashboard', { token }),
};

// --- Tenants (Global Admin) ---

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  settings?: Record<string, unknown>;
  _count: { users: number; opportunities?: number; projects?: number };
  roles?: Array<{
    id: string;
    name: string;
    displayName: string;
    isDefault: boolean;
    isCustom: boolean;
    permissions: Array<{ id: string; module: string; action: string; allowed: boolean }>;
  }>;
}

export const tenantsApi = {
  list: (token: string) =>
    fetchApi<{ success: boolean; data: Tenant[] }>('/tenants', { token }),

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: Tenant }>(`/tenants/${id}`, { token }),

  create: (token: string, data: { name: string; slug: string }) =>
    fetchApi<{ success: boolean; data: Tenant }>('/tenants', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: { name?: string; isActive?: boolean }) =>
    fetchApi<{ success: boolean; data: Tenant }>(`/tenants/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/tenants/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// --- Vendors ---

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  website: string | null;
  categories: string[];
  contacts: ContactEntry[];
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const vendorsApi = {
  list: (token: string, query?: Record<string, string>) => {
    const params = new URLSearchParams(query || {}).toString();
    return fetchApi<{ success: boolean; data: Vendor[]; total: number }>(
      `/vendors${params ? `?${params}` : ''}`,
      { token },
    );
  },

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: Vendor }>(`/vendors/${id}`, { token }),

  create: (token: string, data: { name: string; website?: string; categories?: string[]; contacts?: ContactEntry[]; notes?: string }) =>
    fetchApi<{ success: boolean; data: Vendor }>('/vendors', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: { name?: string; website?: string; categories?: string[]; contacts?: ContactEntry[]; isActive?: boolean; notes?: string }) =>
    fetchApi<{ success: boolean; data: Vendor }>(`/vendors/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/vendors/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// --- Subcontractors ---

export interface Subcontractor {
  id: string;
  tenantId: string;
  companyName: string;
  contacts: ContactEntry[];
  trades: string[];
  territories: string[];
  isActive: boolean;
  insuranceExpiry: string | null;
  licenseNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const subcontractorsApi = {
  list: (token: string, query?: Record<string, string>) => {
    const params = new URLSearchParams(query || {}).toString();
    return fetchApi<{ success: boolean; data: Subcontractor[]; total: number }>(
      `/subcontractors${params ? `?${params}` : ''}`,
      { token },
    );
  },

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: Subcontractor }>(`/subcontractors/${id}`, { token }),

  create: (token: string, data: { companyName: string; contacts?: ContactEntry[]; trades?: string[]; territories?: string[]; insuranceExpiry?: string; licenseNumber?: string; notes?: string }) =>
    fetchApi<{ success: boolean; data: Subcontractor }>('/subcontractors', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: { companyName?: string; contacts?: ContactEntry[]; trades?: string[]; territories?: string[]; isActive?: boolean; insuranceExpiry?: string; licenseNumber?: string; notes?: string }) =>
    fetchApi<{ success: boolean; data: Subcontractor }>(`/subcontractors/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/subcontractors/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// --- Devices (Global Library) ---

export interface Device {
  id: string;
  manufacturer: string;
  category: string;
  model: string;
  partNumber: string;
  description: string | null;
  resolution: string | null;
  formFactor: string | null;
  indoor: boolean | null;
  outdoor: boolean | null;
  vandal: boolean | null;
  hfov: number | null;
  maxDistance: number | null;
  focalLength: string | null;
  imager: string | null;
  specs: Record<string, unknown>;
  mountOptions: string[];
  msrp: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const devicesApi = {
  list: (token: string, query?: Record<string, string>) => {
    const params = new URLSearchParams(query || {}).toString();
    return fetchApi<{ success: boolean; data: Device[]; total: number }>(
      `/devices${params ? `?${params}` : ''}`,
      { token },
    );
  },

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: Device }>(`/devices/${id}`, { token }),

  manufacturers: (token: string) =>
    fetchApi<{ success: boolean; data: string[] }>('/devices/manufacturers', { token }),

  categories: (token: string) =>
    fetchApi<{ success: boolean; data: string[] }>('/devices/categories', { token }),

  mounts: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: Device[] }>(`/devices/${id}/mounts`, { token }),

  create: (token: string, data: Partial<Device>) =>
    fetchApi<{ success: boolean; data: Device }>('/devices', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<Device>) =>
    fetchApi<{ success: boolean; data: Device }>(`/devices/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/devices/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// --- Designs ---

export interface PlacedDeviceData {
  id: string;
  designId: string;
  deviceId: string;
  area: string | null;
  floor: string | null;
  room: string | null;
  positionX: number | null;
  positionY: number | null;
  rotation: number;
  fovAngle: number | null;
  fovDistance: number | null;
  cameraHeight: number | null;
  tilt: number | null;
  notes: string | null;
  installDetails: string | null;
  device?: Device | null;
}

export interface DesignListItem {
  id: string;
  tenantId: string;
  oppId: string | null;
  name: string;
  version: number;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  opportunity: { id: string; oppNumber: string; customerName: string; projectName: string } | null;
  _count: { placedDevices: number };
}

export interface DesignDetail extends DesignListItem {
  canvasData: Record<string, unknown>;
  placedDevices: PlacedDeviceData[];
}

export interface HardwareScheduleItem {
  manufacturer: string;
  model: string;
  partNumber: string;
  category: string;
  description: string | null;
  quantity: number;
  areas: string[];
}

export interface HardwareSchedule {
  designName: string;
  version: number;
  opportunity: { oppNumber: string; customerName: string; projectName: string } | null;
  totalDevices: number;
  uniqueDevices: number;
  items: HardwareScheduleItem[];
}

export interface SOWDevice {
  id: string;
  manufacturer: string;
  model: string;
  partNumber: string;
  category: string;
  cameraHeight: number | null;
  fovAngle: number | null;
  fovDistance: number | null;
  tilt: number | null;
  notes: string | null;
  installDetails: string | null;
}

export interface SOWRoom {
  room: string;
  devices: SOWDevice[];
}

export interface SOWFloor {
  floor: string;
  rooms: SOWRoom[];
}

export interface SOWArea {
  area: string;
  floors: SOWFloor[];
}

export interface SOW {
  designName: string;
  version: number;
  status: string;
  createdBy: string;
  opportunity: { oppNumber: string; customerName: string; projectName: string; installAddress: string | null; installCity: string | null; installState: string | null; installZip: string | null } | null;
  totalDevices: number;
  areas: SOWArea[];
}

export const designsApi = {
  list: (token: string, query?: Record<string, string>) => {
    const params = new URLSearchParams(query || {}).toString();
    return fetchApi<{ success: boolean; data: DesignListItem[]; total: number }>(
      `/designs${params ? `?${params}` : ''}`,
      { token },
    );
  },

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: DesignDetail }>(`/designs/${id}`, { token }),

  create: (token: string, data: { name: string; oppId?: string }) =>
    fetchApi<{ success: boolean; data: DesignListItem }>('/designs', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: { name?: string; oppId?: string }) =>
    fetchApi<{ success: boolean; data: DesignListItem }>(`/designs/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  changeStatus: (token: string, id: string, status: string) =>
    fetchApi<{ success: boolean; data: DesignListItem }>(`/designs/${id}/status`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ status }),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/designs/${id}`, {
      method: 'DELETE',
      token,
    }),

  // Placed devices
  addDevice: (token: string, designId: string, data: Partial<PlacedDeviceData> & { deviceId: string }) =>
    fetchApi<{ success: boolean; data: PlacedDeviceData }>(`/designs/${designId}/devices`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateDevice: (token: string, designId: string, placedDeviceId: string, data: Partial<PlacedDeviceData>) =>
    fetchApi<{ success: boolean; data: PlacedDeviceData }>(`/designs/${designId}/devices/${placedDeviceId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  removeDevice: (token: string, designId: string, placedDeviceId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/designs/${designId}/devices/${placedDeviceId}`, {
      method: 'DELETE',
      token,
    }),

  // Hardware Schedule & SOW
  hardwareSchedule: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: HardwareSchedule }>(`/designs/${id}/hardware-schedule`, { token }),

  sow: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: SOW }>(`/designs/${id}/sow`, { token }),
};

export { ApiError };
