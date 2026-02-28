'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { tenantsApi, usersApi, Tenant, UserListItem } from '@/lib/api';

const TABS = ['General', 'Users', 'Roles'] as const;
type Tab = (typeof TABS)[number];

export default function TenantDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const tenantId = params.id as string;

  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === 'users' ? 'Users' : initialTab === 'roles' ? 'Roles' : 'General',
  );
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !tenantId) return;
    loadTenant();
  }, [accessToken, tenantId]);

  async function loadTenant() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await tenantsApi.get(accessToken, tenantId);
      setTenant(res.data);
    } catch {
      router.push('/admin/tenants');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-400">Loading...</div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-sm text-gray-400">Organization not found</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => router.push('/admin/tenants')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Organizations
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">{tenant.name}</span>
      </div>

      {/* NinjaOne-style: Left tab sidebar + content area */}
      <div className="flex gap-6 min-h-[500px]">
        {/* Left tab sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="card p-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'General' && (
            <GeneralTab tenant={tenant} onUpdate={loadTenant} />
          )}
          {activeTab === 'Users' && (
            <UsersTab
              tenant={tenant}
              onReload={loadTenant}
            />
          )}
          {activeTab === 'Roles' && (
            <RolesTab tenant={tenant} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- General Tab ---

function GeneralTab({
  tenant,
  onUpdate,
}: {
  tenant: Tenant;
  onUpdate: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [name, setName] = useState(tenant.name);
  const [isActive, setIsActive] = useState(tenant.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await tenantsApi.update(accessToken, tenant.id, {
        name: name.trim(),
        isActive,
      });
      setSuccess('Organization updated successfully');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    }
    setSaving(false);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>
      <div className="card p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tenant-name" className="label">Organization Name</label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Slug</label>
            <p className="text-sm text-gray-500 font-mono bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
              {tenant.slug}
            </p>
            <p className="text-xs text-gray-400 mt-1">Slug cannot be changed after creation</p>
          </div>

          <div>
            <label className="label">Status</label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  isActive
                    ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                    : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  !isActive
                    ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                    : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div>
            <label className="label">Statistics</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                <p className="text-xs text-gray-500">Users</p>
                <p className="text-lg font-semibold text-gray-800">{tenant._count?.users || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                <p className="text-xs text-gray-500">Opportunities</p>
                <p className="text-lg font-semibold text-gray-800">{tenant._count?.opportunities || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                <p className="text-xs text-gray-500">Projects</p>
                <p className="text-lg font-semibold text-gray-800">{tenant._count?.projects || 0}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Created</label>
            <p className="text-sm text-gray-500">
              {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {success}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Users Tab ---

function UsersTab({
  tenant,
  onReload,
}: {
  tenant: Tenant;
  onReload: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await usersApi.listByTenant(accessToken, tenant.id, { page: 1, pageSize: 100 });
      setUsers(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
    }
    setLoading(false);
  }, [accessToken, tenant.id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Users <span className="text-sm font-normal text-gray-500">({users.length})</span>
        </h2>
        <button
          className="btn-primary text-sm"
          onClick={() => setShowAddModal(true)}
        >
          Add User
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No users in this organization yet</td></tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {user.role?.displayName || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && tenant.roles && (
        <AddUserModal
          tenantId={tenant.id}
          roles={tenant.roles}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadUsers(); onReload(); }}
        />
      )}
    </div>
  );
}

// --- Add User Modal ---

function AddUserModal({
  tenantId,
  roles,
  onClose,
  onSaved,
}: {
  tenantId: string;
  roles: Array<{ id: string; name: string; displayName: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    title: '',
    roleId: roles.length > 0 ? roles.find(r => r.name === 'sales')?.id || roles[0].id : '',
    password: '',
  });
  const [sendInvite, setSendInvite] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);
    try {
      await usersApi.create(accessToken, {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        roleId: form.roleId,
        phone: form.phone || undefined,
        title: form.title || undefined,
        password: sendInvite ? undefined : form.password || undefined,
        tenantId,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add User</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className="input-field"
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="rounded border-gray-300"
              />
              Send invite link (user sets their own password)
            </label>
          </div>
          {!sendInvite && (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                required={!sendInvite}
                minLength={8}
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Roles Tab ---

function RolesTab({ tenant }: { tenant: Tenant }) {
  const roles = tenant.roles || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
        <span className="text-sm text-gray-500">
          {roles.length} role{roles.length !== 1 ? 's' : ''}
        </span>
      </div>

      {roles.length > 0 ? (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">{role.displayName}</h3>
                  <span className="text-xs text-gray-400 font-mono">{role.name}</span>
                  {role.isDefault && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                      Default
                    </span>
                  )}
                  {role.isCustom && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-600">
                      Custom
                    </span>
                  )}
                </div>
              </div>

              {/* Permission matrix */}
              {role.permissions && role.permissions.length > 0 && (
                <div className="mt-3">
                  <PermissionMatrix permissions={role.permissions} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">No roles configured</p>
        </div>
      )}
    </div>
  );
}

// --- Permission Matrix ---

function PermissionMatrix({
  permissions,
}: {
  permissions: Array<{ module: string; action: string; allowed: boolean }>;
}) {
  const modules = [...new Set(permissions.map((p) => p.module))].sort();
  const actions = ['create', 'read', 'update', 'delete'];

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr>
            <th className="text-left py-1 pr-3 font-medium text-gray-500 uppercase tracking-wide">
              Module
            </th>
            {actions.map((a) => (
              <th
                key={a}
                className="text-center px-2 py-1 font-medium text-gray-500 uppercase tracking-wide"
              >
                {a.charAt(0).toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((mod) => (
            <tr key={mod} className="border-t border-gray-100">
              <td className="py-1 pr-3 text-gray-600 capitalize">{mod}</td>
              {actions.map((action) => {
                const perm = permissions.find(
                  (p) => p.module === mod && p.action === action,
                );
                return (
                  <td key={action} className="text-center px-2 py-1">
                    {perm?.allowed ? (
                      <span className="inline-block w-4 h-4 rounded-full bg-green-500" />
                    ) : (
                      <span className="inline-block w-4 h-4 rounded-full bg-gray-200" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
