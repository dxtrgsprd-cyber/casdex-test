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

export { ApiError };
