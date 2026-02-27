'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { tenantsApi, Tenant } from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    tenantsApi.list(accessToken).then((res) => {
      setTenants(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [accessToken]);

  const totalOrgs = tenants.length;
  const activeOrgs = tenants.filter((t) => t.isActive).length;
  const inactiveOrgs = totalOrgs - activeOrgs;
  const totalUsers = tenants.reduce((sum, t) => sum + (t._count?.users || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Administration Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Global overview of all organizations and users
        </p>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Organizations" value={totalOrgs} accent="blue" />
            <StatCard label="Active Organizations" value={activeOrgs} accent="green" />
            <StatCard label="Inactive Organizations" value={inactiveOrgs} accent="red" />
            <StatCard label="Total Users" value={totalUsers} accent="purple" />
          </div>

          {/* Recent Organizations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Organizations</h2>
              <button
                onClick={() => router.push('/admin/tenants/new')}
                className="btn-primary text-sm"
              >
                Add Organization
              </button>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Users</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-primary-600">
                        {tenant.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{tenant.slug}</td>
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
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No organizations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'blue' | 'green' | 'red' | 'purple';
}) {
  const accentColors: Record<string, string> = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  };

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <div className={`h-1 ${accentColors[accent]}`} />
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
    </div>
  );
}
