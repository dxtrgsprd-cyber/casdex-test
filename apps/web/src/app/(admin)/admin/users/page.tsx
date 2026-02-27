'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { tenantsApi, Tenant } from '@/lib/api';

interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isGlobalAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { name: string; displayName: string };
  tenantName: string;
  tenantId: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');

  useEffect(() => {
    if (!accessToken) return;
    loadData();
  }, [accessToken]);

  async function loadData() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const tenantsRes = await tenantsApi.list(accessToken);
      setTenants(tenantsRes.data);

      // Load users from each tenant by fetching tenant details
      const allUsers: TenantUser[] = [];
      const seenUserTenantPairs = new Set<string>();

      for (const t of tenantsRes.data) {
        try {
          const tenantDetail = await tenantsApi.get(accessToken, t.id);
          // The tenant detail includes users through the _count, but we need to
          // use the users endpoint. Since we're global admin, we can use the
          // standard users endpoint by switching context.
          // For now, we'll show tenant-level info from what we have.
          // Users per-tenant will be accessible from the tenant detail page.
        } catch {
          // skip
        }
      }

      // For the admin users page, we'll show a summary view by tenant
      // Users can click through to tenant detail for full user management
      setUsers(allUsers);
    } catch {
      // handled by loading state
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Users are managed per-organization. Select an organization to manage its users.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations..."
          className="input-field max-w-xs"
        />
      </div>

      {/* Organization cards with user counts */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants
            .filter(
              (t) =>
                !search || t.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => router.push(`/admin/tenants/${tenant.id}?tab=users`)}
                className="card p-4 text-left hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{tenant.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{tenant.slug}</p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      tenant.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Users</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {tenant._count?.users || 0}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-primary-600 mt-3 font-medium">
                  Manage Users
                </p>
              </button>
            ))}
          {tenants.length === 0 && (
            <p className="text-sm text-gray-400 col-span-full">No organizations found</p>
          )}
        </div>
      )}
    </div>
  );
}
