const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

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

export const usersApi = {
  me: (token: string) =>
    fetchApi<{ success: boolean; data: unknown }>('/users/me', { token }),

  list: (token: string, page = 1, pageSize = 25) =>
    fetchApi<{ success: boolean; data: unknown[]; total: number }>(
      `/users?page=${page}&pageSize=${pageSize}`,
      { token },
    ),

  get: (token: string, id: string) =>
    fetchApi<{ success: boolean; data: unknown }>(`/users/${id}`, { token }),

  create: (token: string, data: Record<string, unknown>) =>
    fetchApi<{ success: boolean; data: unknown }>('/users', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<{ success: boolean; data: unknown }>(`/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi(`/users/${id}`, { method: 'DELETE', token }),
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

export { ApiError };
