'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { tenantsApi, Tenant } from '@/lib/api';

export default function TenantsListPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (!accessToken) return;
    loadTenants();
  }, [accessToken]);

  async function loadTenants() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await tenantsApi.list(accessToken);
      setTenants(res.data);
    } catch {
      // handled by loading state
    }
    setLoading(false);
  }

  const filtered = tenants.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && t.isActive) ||
      (filterStatus === 'inactive' && !t.isActive);
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all organizations in the platform
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/tenants/new')}
          className="btn-primary text-sm"
        >
          Add Organization
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations..."
          className="input-field max-w-xs"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
          className="input-field w-auto"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-sm text-gray-500">
          {filtered.length} organization{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Users</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {tenant.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        tenant.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{tenant._count?.users || 0}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    {search || filterStatus !== 'all'
                      ? 'No organizations match your filters'
                      : 'No organizations found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
