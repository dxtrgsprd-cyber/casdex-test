'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  authApi,
  usersApi,
  vendorsApi,
  subcontractorsApi,
  orgApi,
  Vendor,
  Subcontractor,
  OrgUser,
  OrgRole,
  OrgTenantDetail,
} from '@/lib/api';

const TABS = [
  'Profile',
  'Change Password',
  'Users',
  'Roles & Permissions',
  'Vendors',
  'Subcontractors',
  'Organization',
] as const;

const VENDOR_CATEGORIES = [
  { value: 'cameras', label: 'Cameras' },
  { value: 'access_control', label: 'Access Control' },
  { value: 'networking', label: 'Networking' },
  { value: 'av', label: 'AV' },
  { value: 'sensors', label: 'Sensors' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  cameras: 'Cameras',
  access_control: 'Access Control',
  networking: 'Networking',
  av: 'AV',
  sensors: 'Sensors',
  other: 'Other',
};

export default function ManagementPage() {
  const { roles } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string>('Profile');

  const isAdmin = roles.includes('admin') || roles.includes('manager');

  const visibleTabs = TABS.filter((tab) => {
    if (tab === 'Users' || tab === 'Vendors' || tab === 'Subcontractors') {
      return isAdmin;
    }
    if (tab === 'Roles & Permissions' || tab === 'Organization') {
      return roles.includes('admin');
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Management</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-4 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'Profile' && <ProfileTab />}
      {activeTab === 'Change Password' && <ChangePasswordTab />}
      {activeTab === 'Users' && <UsersTab />}
      {activeTab === 'Roles & Permissions' && <RolesTab />}
      {activeTab === 'Vendors' && <VendorsTab />}
      {activeTab === 'Subcontractors' && <SubcontractorsTab />}
      {activeTab === 'Organization' && <OrganizationTab />}
    </div>
  );
}

// =============================================================================
// PROFILE TAB
// =============================================================================

function ProfileTab() {
  const { user } = useAuthStore();
  return (
    <div className="card p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
      <div className="space-y-3">
        <div>
          <span className="text-sm text-gray-500">Name</span>
          <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Email</span>
          <p className="text-sm font-medium">{user?.email}</p>
        </div>
        <hr />
        <p className="text-xs text-gray-400">
          Name, email, title, and role are managed by your organization admin.
          You can update your phone number and avatar.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// CHANGE PASSWORD TAB
// =============================================================================

function ChangePasswordTab() {
  const { accessToken } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword(accessToken!, currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            required
          />
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
        )}
        {success && (
          <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">{success}</div>
        )}
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

// =============================================================================
// USERS TAB
// =============================================================================

function UsersTab() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.list(accessToken, 1, 200),
        orgApi.listRoles(accessToken),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(s) ||
      u.lastName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.role.displayName.toLowerCase().includes(s)
    );
  });

  async function handleDeactivate(user: OrgUser) {
    if (!accessToken) return;
    try {
      await usersApi.delete(accessToken, user.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
        <button className="btn-primary text-sm" onClick={() => setShowAddModal(true)}>
          Add User
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="input-field max-w-xs"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-sm text-gray-500">No users found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">Name</th>
              <th className="text-left py-2 font-medium text-gray-600">Email</th>
              <th className="text-left py-2 font-medium text-gray-600">Role</th>
              <th className="text-left py-2 font-medium text-gray-600">Status</th>
              <th className="text-left py-2 font-medium text-gray-600">Last Login</th>
              <th className="text-right py-2 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{u.firstName} {u.lastName}</td>
                <td className="py-2 text-gray-600">{u.email}</td>
                <td className="py-2">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {u.role.displayName}
                  </span>
                </td>
                <td className="py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-2 text-gray-500 text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium mr-2"
                  >
                    Edit
                  </button>
                  {u.isActive && (
                    <button
                      onClick={() => handleDeactivate(u)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <AddUserModal
          roles={roles}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadData(); }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadData(); }}
        />
      )}
    </div>
  );
}

function AddUserModal({
  roles,
  onClose,
  onSaved,
}: {
  roles: OrgRole[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const adminRole = roles.find((r) => r.name === 'admin');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    roleId: adminRole?.id || roles[0]?.id || '',
    password: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        roleId: form.roleId,
      };
      if (form.phone) payload.phone = form.phone;
      if (form.title) payload.title = form.title;
      if (form.password) payload.password = form.password;
      await usersApi.create(accessToken, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input-field" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input-field" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input-field" value={form.roleId} onChange={(e) => updateField('roleId', e.target.value)} required>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Job Title</label>
              <input className="input-field" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input-field" type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} minLength={8} />
            <p className="text-xs text-gray-400 mt-1">Leave blank to generate an invite link instead.</p>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: OrgUser;
  roles: OrgRole[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || '',
    title: user.title || '',
    roleId: user.role.id,
    isActive: user.isActive,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);
    try {
      // Update user info
      await usersApi.update(accessToken, user.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        title: form.title || undefined,
        isActive: form.isActive,
      });
      // Update role if changed
      if (form.roleId !== user.role.id) {
        await usersApi.updateRole(accessToken, user.id, form.roleId);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input-field" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input-field bg-gray-50" value={user.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input-field" value={form.roleId} onChange={(e) => updateField('roleId', e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Job Title</label>
              <input className="input-field" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// ROLES & PERMISSIONS TAB
// =============================================================================

const PERMISSION_MODULES = [
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'survey', label: 'Survey' },
  { key: 'design', label: 'Design' },
  { key: 'projects', label: 'Projects' },
  { key: 'tools', label: 'Tools' },
  { key: 'management', label: 'Management' },
];

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'];

function RolesTab() {
  const { accessToken } = useAuthStore();
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<OrgRole | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const loadRoles = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await orgApi.listRoles(accessToken);
      setRoles(res.data);
      if (!selectedRole && res.data.length > 0) {
        setSelectedRole(res.data[0]);
      } else if (selectedRole) {
        const updated = res.data.find((r) => r.id === selectedRole.id);
        if (updated) setSelectedRole(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedRole]);

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function getPermission(role: OrgRole, module: string, action: string): boolean {
    const perm = role.permissions.find((p) => p.module === module && p.action === action);
    return perm?.allowed ?? false;
  }

  async function handleTogglePermission(module: string, action: string) {
    if (!accessToken || !selectedRole) return;
    setError('');
    setSaveSuccess('');
    setSaving(true);

    const currentValue = getPermission(selectedRole, module, action);

    try {
      const res = await orgApi.updateRolePermissions(accessToken, selectedRole.id, [
        { module, action, allowed: !currentValue },
      ]);

      // Update local state immediately
      setSelectedRole(res.data);
      setRoles((prev) => prev.map((r) => (r.id === res.data.id ? res.data : r)));
      setSaveSuccess('Permission updated');
      setTimeout(() => setSaveSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permission');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <p className="text-sm text-gray-400">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Roles & Permissions</h2>
        <button className="btn-primary text-sm" onClick={() => setShowCreateModal(true)}>
          Create Role
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>
      )}
      {saveSuccess && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">{saveSuccess}</div>
      )}

      {/* Role selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedRole?.id === role.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {role.displayName}
            {role.isCustom && (
              <span className="ml-1 text-xs opacity-70">(Custom)</span>
            )}
          </button>
        ))}
      </div>

      {/* Permission matrix */}
      {selectedRole && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{selectedRole.displayName}</h3>
            {selectedRole.isDefault && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Default Role</span>
            )}
            {selectedRole.isCustom && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Custom Role</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-8 font-medium text-gray-600">Module</th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action} className="text-center py-2 px-4 font-medium text-gray-600 capitalize">
                      {action}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MODULES.map((mod) => (
                  <tr key={mod.key} className="border-b border-gray-100">
                    <td className="py-3 pr-8 font-medium text-gray-800">{mod.label}</td>
                    {PERMISSION_ACTIONS.map((action) => {
                      const isAllowed = getPermission(selectedRole, mod.key, action);
                      return (
                        <td key={action} className="text-center py-3 px-4">
                          <button
                            onClick={() => handleTogglePermission(mod.key, action)}
                            disabled={saving}
                            className={`w-8 h-8 rounded-md border-2 transition-colors ${
                              isAllowed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-white border-gray-300 text-gray-300 hover:border-gray-400'
                            }`}
                            title={`${isAllowed ? 'Revoke' : 'Grant'} ${action} on ${mod.label}`}
                          >
                            {isAllowed ? 'Y' : 'N'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Click a cell to toggle the permission. Changes are saved immediately.
          </p>
        </div>
      )}

      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadRoles(); }}
        />
      )}
    </div>
  );
}

function CreateRoleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generate slug from display name
  function handleDisplayNameChange(value: string) {
    setDisplayName(value);
    setName(value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);
    try {
      await orgApi.createRole(accessToken, { name, displayName });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Custom Role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Display Name *</label>
            <input
              className="input-field"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="e.g. Regional Manager"
              required
            />
          </div>
          <div>
            <label className="label">System Name</label>
            <input
              className="input-field bg-gray-50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="auto-generated from display name"
            />
            <p className="text-xs text-gray-400 mt-1">Used internally. Auto-generated from display name.</p>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// ORGANIZATION TAB
// =============================================================================

function OrganizationTab() {
  const { accessToken, tenant } = useAuthStore();
  const [orgDetail, setOrgDetail] = useState<OrgTenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOrg = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await orgApi.getTenant(accessToken);
      setOrgDetail(res.data);
      setOrgName(res.data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  async function handleSave() {
    if (!accessToken) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await orgApi.updateTenant(accessToken, { name: orgName });
      setOrgDetail(res.data);
      setEditing(false);
      setSuccess('Organization updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <p className="text-sm text-gray-400">Loading organization details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <div className="card p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>
          {!editing && (
            <button className="btn-secondary text-sm" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>
        )}
        {success && (
          <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">{success}</div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="label">Organization Name</label>
              <input
                className="input-field max-w-md"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn-secondary text-sm"
                onClick={() => { setEditing(false); setOrgName(orgDetail?.name || ''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Organization Name</span>
              <p className="text-sm font-medium">{orgDetail?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Slug</span>
              <p className="text-sm font-medium text-gray-600">{orgDetail?.slug}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Status</span>
              <p className="text-sm">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${orgDetail?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {orgDetail?.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created</span>
              <p className="text-sm font-medium text-gray-600">
                {orgDetail?.createdAt ? new Date(orgDetail.createdAt).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Org Stats */}
      <div className="card p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Summary</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{orgDetail?._count.users ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Users</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{orgDetail?._count.opportunities ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Opportunities</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{orgDetail?._count.projects ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Projects</p>
          </div>
        </div>
      </div>

      {/* Roles Overview */}
      <div className="card p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles</h2>
        <div className="space-y-2">
          {orgDetail?.roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <span className="text-sm font-medium text-gray-900">{role.displayName}</span>
                {role.isCustom && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Custom</span>
                )}
              </div>
              <span className="text-xs text-gray-400">{role.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VENDORS TAB
// =============================================================================

function VendorsTab() {
  const { accessToken } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const loadVendors = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = { includeInactive: 'true' };
      if (search) query.search = search;
      const res = await vendorsApi.list(accessToken, query);
      setVendors(res.data);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  async function handleToggleActive(vendor: Vendor) {
    if (!accessToken) return;
    try {
      if (vendor.isActive) {
        await vendorsApi.delete(accessToken, vendor.id);
      } else {
        await vendorsApi.reactivate(accessToken, vendor.id);
      }
      loadVendors();
    } catch (err) {
      console.error('Failed to toggle vendor status:', err);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Vendor Management</h2>
        <button
          className="btn-primary text-sm"
          onClick={() => { setEditingVendor(null); setShowModal(true); }}
        >
          Add Vendor
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors..."
          className="input-field max-w-xs"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : vendors.length === 0 ? (
        <p className="text-sm text-gray-500">No vendors found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">Name</th>
              <th className="text-left py-2 font-medium text-gray-600">Category</th>
              <th className="text-left py-2 font-medium text-gray-600">Contact</th>
              <th className="text-left py-2 font-medium text-gray-600">Status</th>
              <th className="text-right py-2 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{v.name}</td>
                <td className="py-2 text-gray-600">
                  {v.category ? CATEGORY_LABELS[v.category] || v.category : '-'}
                </td>
                <td className="py-2 text-gray-600">{v.contact || '-'}</td>
                <td className="py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => { setEditingVendor(v); setShowModal(true); }}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(v)}
                    className={`text-xs font-medium ${v.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {v.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <VendorFormModal
          vendor={editingVendor}
          onClose={() => { setShowModal(false); setEditingVendor(null); }}
          onSaved={() => { setShowModal(false); setEditingVendor(null); loadVendors(); }}
        />
      )}
    </div>
  );
}

function VendorFormModal({
  vendor,
  onClose,
  onSaved,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const isEditing = !!vendor;
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: vendor?.name || '',
    contact: vendor?.contact || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    website: vendor?.website || '',
    category: vendor?.category || '',
    notes: vendor?.notes || '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);
    try {
      if (isEditing) {
        await vendorsApi.update(accessToken, vendor!.id, form);
      } else {
        await vendorsApi.create(accessToken, form);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Vendor' : 'Add Vendor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Vendor Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input-field" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
              <option value="">Select...</option>
              {VENDOR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact</label>
              <input className="input-field" value={form.contact} onChange={(e) => updateField('contact', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input-field" value={form.website} onChange={(e) => updateField('website', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// SUBCONTRACTORS TAB
// =============================================================================

function SubcontractorsTab() {
  const { accessToken } = useAuthStore();
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);

  const loadSubs = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = { includeInactive: 'true' };
      if (search) query.search = search;
      const res = await subcontractorsApi.list(accessToken, query);
      setSubs(res.data);
    } catch (err) {
      console.error('Failed to load subcontractors:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  async function handleToggleActive(sub: Subcontractor) {
    if (!accessToken) return;
    try {
      if (sub.isActive) {
        await subcontractorsApi.delete(accessToken, sub.id);
      } else {
        await subcontractorsApi.reactivate(accessToken, sub.id);
      }
      loadSubs();
    } catch (err) {
      console.error('Failed to toggle subcontractor status:', err);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Subcontractor Management</h2>
        <button
          className="btn-primary text-sm"
          onClick={() => { setEditingSub(null); setShowModal(true); }}
        >
          Add Subcontractor
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subcontractors..."
          className="input-field max-w-xs"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : subs.length === 0 ? (
        <p className="text-sm text-gray-500">No subcontractors found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">Company</th>
              <th className="text-left py-2 font-medium text-gray-600">Contact</th>
              <th className="text-left py-2 font-medium text-gray-600">Trades</th>
              <th className="text-left py-2 font-medium text-gray-600">Status</th>
              <th className="text-right py-2 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => {
              const trades = Array.isArray(s.trades) ? s.trades : [];
              return (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2 font-medium">{s.companyName}</td>
                  <td className="py-2 text-gray-600">{s.primaryContact || '-'}</td>
                  <td className="py-2">
                    {trades.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {trades.slice(0, 3).map((t) => (
                          <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{t}</span>
                        ))}
                        {trades.length > 3 && <span className="text-xs text-gray-500">+{trades.length - 3}</span>}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => { setEditingSub(s); setShowModal(true); }}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(s)}
                      className={`text-xs font-medium ${s.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {s.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showModal && (
        <SubFormModal
          sub={editingSub}
          onClose={() => { setShowModal(false); setEditingSub(null); }}
          onSaved={() => { setShowModal(false); setEditingSub(null); loadSubs(); }}
        />
      )}
    </div>
  );
}

function SubFormModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: Subcontractor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const isEditing = !!sub;
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: sub?.companyName || '',
    primaryContact: sub?.primaryContact || '',
    email: sub?.email || '',
    phone: sub?.phone || '',
    licenseNumber: sub?.licenseNumber || '',
    insuranceExpiry: sub?.insuranceExpiry ? new Date(sub.insuranceExpiry).toISOString().split('T')[0] : '',
    trades: (Array.isArray(sub?.trades) ? sub.trades : []) as string[],
    territories: (Array.isArray(sub?.territories) ? sub.territories : []) as string[],
    notes: sub?.notes || '',
  });
  const [tradeInput, setTradeInput] = useState('');

  function updateField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTrade(trade: string) {
    const t = trade.trim();
    if (t && !form.trades.includes(t)) {
      updateField('trades', [...form.trades, t]);
    }
    setTradeInput('');
  }

  function removeTrade(trade: string) {
    updateField('trades', form.trades.filter((t) => t !== trade));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);
    try {
      const payload = { ...form, insuranceExpiry: form.insuranceExpiry || undefined };
      if (isEditing) {
        await subcontractorsApi.update(accessToken, sub!.id, payload);
      } else {
        await subcontractorsApi.create(accessToken, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subcontractor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Subcontractor' : 'Add Subcontractor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Company Name *</label>
            <input className="input-field" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact</label>
              <input className="input-field" value={form.primaryContact} onChange={(e) => updateField('primaryContact', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div>
              <label className="label">License #</label>
              <input className="input-field" value={form.licenseNumber} onChange={(e) => updateField('licenseNumber', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Insurance Expiry</label>
            <input className="input-field max-w-xs" type="date" value={form.insuranceExpiry} onChange={(e) => updateField('insuranceExpiry', e.target.value)} />
          </div>
          <div>
            <label className="label">Trades</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.trades.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                  {t}
                  <button type="button" onClick={() => removeTrade(t)} className="text-blue-400 hover:text-blue-600 ml-0.5">x</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={tradeInput}
                onChange={(e) => setTradeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrade(tradeInput); } }}
                placeholder="Type trade, press Enter..."
              />
              <button type="button" className="btn-secondary text-sm" onClick={() => addTrade(tradeInput)}>Add</button>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Subcontractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
