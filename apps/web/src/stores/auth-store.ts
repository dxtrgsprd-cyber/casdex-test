'use client';

import { create } from 'zustand';
import { authApi, LoginResponse } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string | null; // 'global_admin' | 'global_manager' | null
}

interface AuthTenant {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  roles: string[];
  availableTenants: AuthTenant[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  hydrate: () => void;
}

const STORAGE_KEY = 'casdex_auth';
const LAST_TENANT_KEY = 'casdex_last_tenant';

function saveLastTenant(email: string, tenantId: string) {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_TENANT_KEY) || '{}');
    stored[email] = tenantId;
    localStorage.setItem(LAST_TENANT_KEY, JSON.stringify(stored));
  } catch { /* ignore */ }
}

function getLastTenant(email: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_TENANT_KEY) || '{}');
    return stored[email] || null;
  } catch {
    return null;
  }
}

function saveToStorage(data: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenant: AuthTenant;
  roles: string[];
  availableTenants: AuthTenant[];
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

function clearStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function loadFromStorage(): Partial<AuthState> | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  roles: [],
  availableTenants: [],
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password, tenantId) => {
    set({ isLoading: true });
    try {
      // Try with the provided tenantId (or last-used tenant)
      const effectiveTenantId = tenantId || getLastTenant(email) || undefined;
      let response;
      try {
        response = await authApi.login(email, password, effectiveTenantId);
      } catch (err) {
        // If the remembered tenant is no longer accessible, retry without it
        if (effectiveTenantId && err instanceof Error && err.message.includes('do not have access')) {
          response = await authApi.login(email, password);
        } else {
          throw err;
        }
      }
      const { data } = response;

      const authData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        tenant: data.tenant,
        roles: data.roles,
        availableTenants: data.availableTenants,
      };

      saveToStorage(authData);
      saveLastTenant(email, data.tenant.id);

      set({
        ...authData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const { accessToken } = get();
    try {
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch {
      // Ignore logout API errors
    }
    clearStorage();
    set({
      user: null,
      tenant: null,
      roles: [],
      availableTenants: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  switchTenant: async (tenantId) => {
    const { accessToken } = get();
    if (!accessToken) throw new Error('Not authenticated');

    set({ isLoading: true });
    try {
      const response = await authApi.switchTenant(accessToken, tenantId);
      const { data } = response;

      const authData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        tenant: data.tenant,
        roles: data.roles,
        availableTenants: data.availableTenants,
      };

      saveToStorage(authData);
      if (data.user?.email) {
        saveLastTenant(data.user.email, data.tenant.id);
      }

      set({
        ...authData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  refreshAuth: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return;

    try {
      const response = await authApi.refresh(refreshToken);
      const stored = loadFromStorage();

      const authData = {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      };

      if (stored) {
        saveToStorage({
          ...stored,
          ...authData,
        } as Parameters<typeof saveToStorage>[0]);
      }

      set(authData);
    } catch {
      // Refresh failed — log out
      get().logout();
    }
  },

  hydrate: () => {
    const stored = loadFromStorage();
    if (stored && stored.accessToken) {
      set({
        ...stored,
        isAuthenticated: true,
      } as Partial<AuthState>);
    }
  },
}));
