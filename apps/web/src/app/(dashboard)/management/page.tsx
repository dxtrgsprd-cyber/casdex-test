'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi, usersApi, rolesApi, Role, UserListItem } from '@/lib/api';

const ALL_MODULES = ['opportunities', 'survey', 'design', 'projects', 'tools', 'management', 'vendors', 'subcontractors'] as const;
const ALL_ACTIONS = ['create', 'read', 'update', 'delete'] as const;

const MODULE_LABELS: Record<string, string> = {
  opportunities: 'Opportunities',
  survey: 'Survey',
  design: 'Design',
  projects: 'Projects',
  tools: 'Tools',
  management: 'Management',
  vendors: 'Vendors',
  subcontractors: 'Subcontractors',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'C',
  read: 'R',
  update: 'U',
  delete: 'D',
};

type TabName = 'Profile' | 'Change Password' | 'Users' | 'Roles';

export default function ManagementPage() {
  const { roles } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabName>('Profile');

  const isAdmin = roles.includes('admin') || roles.includes('manager');

  const TABS: TabName[] = isAdmin
    ? ['Profile', 'Change Password', 'Users', 'Roles']
    : ['Profile', 'Change Password'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Management</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
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
      {activeTab === 'Users' && isAdmin && <UsersTab />}
      {activeTab === 'Roles' && isAdmin && <RolesTab />}
    </div>
  );
}

// ============================================================
// PROFILE TAB
// ============================================================

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

// ============================================================
// CHANGE PASSWORD TAB
// ============================================================

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

// ============================================================
// USERS TAB
// ============================================================

function UsersTab() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRoleId, setFilterRoleId] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<UserListItem | null>(null);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await usersApi.list(accessToken, {
        page,
        pageSize: 25,
        search: search || undefined,
        roleId: filterRoleId || undefined,
        status: filterStatus || undefined,
      });
      setUsers(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, search, filterRoleId, filterStatus]);

  const loadRoles = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await rolesApi.list(accessToken);
      setAllRoles(result.data);
    } catch {
      // Roles failed to load, non-critical
    }
  }, [accessToken]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleDeactivate(user: UserListItem) {
    if (!accessToken) return;
    if (!confirm(`Remove ${user.firstName} ${user.lastName} from this organization?`)) return;
    try {
      await usersApi.delete(accessToken, user.id);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Users <span className="text-sm font-normal text-gray-500">({total})</span>
        </h2>
        <button className="btn-primary text-sm" onClick={() => setShowAddModal(true)}>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="input-field max-w-xs"
        />
        <select
          value={filterRoleId}
          onChange={(e) => { setFilterRoleId(e.target.value); setPage(1); }}
          className="input-field max-w-[180px]"
        >
          <option value="">All Roles</option>
          {allRoles.map((r) => (
            <option key={r.id} value={r.id}>{r.displayName}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="input-field max-w-[140px]"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.title || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setShowRoleModal(u)}
                      className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      {u.role.displayName}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="text-xs text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      {u.isActive && (
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} users)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          roles={allRoles}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadUsers(); }}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers(); }}
        />
      )}
      {showRoleModal && (
        <ChangeRoleModal
          user={showRoleModal}
          roles={allRoles}
          onClose={() => setShowRoleModal(null)}
          onSaved={() => { setShowRoleModal(null); loadUsers(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// ADD USER MODAL
// ============================================================

function AddUserModal({
  roles,
  onClose,
  onSaved,
}: {
  roles: Role[];
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

  async function handleSubmit(e: React.FormEvent) {
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

// ============================================================
// EDIT USER MODAL
// ============================================================

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || '',
    title: user.title || '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);
    try {
      await usersApi.update(accessToken, user.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        title: form.title || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
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
            <input type="email" value={user.email} className="input-field bg-gray-50" disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
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
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CHANGE ROLE MODAL
// ============================================================

function ChangeRoleModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: UserListItem;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [selectedRoleId, setSelectedRoleId] = useState(user.role.id);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || selectedRoleId === user.role.id) {
      onClose();
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await usersApi.updateRole(accessToken, user.id, selectedRoleId);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Change Role - {user.firstName} {user.lastName}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Role</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="input-field"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName}{r.isCustom ? ' (Custom)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Permission preview */}
          {selectedRole && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Permissions for this role:</p>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Module</th>
                      {ALL_ACTIONS.map((a) => (
                        <th key={a} className="px-2 py-2 text-center font-medium text-gray-500 w-10">{ACTION_LABELS[a]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ALL_MODULES.map((mod) => (
                      <tr key={mod}>
                        <td className="px-3 py-1.5 text-gray-700">{MODULE_LABELS[mod]}</td>
                        {ALL_ACTIONS.map((action) => {
                          const perm = selectedRole.permissions.find(
                            (p) => p.module === mod && p.action === action,
                          );
                          return (
                            <td key={action} className="px-2 py-1.5 text-center">
                              <span className={`inline-block w-4 h-4 rounded-full ${
                                perm?.allowed ? 'bg-green-500' : 'bg-gray-200'
                              }`} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ROLES TAB
// ============================================================

function RolesTab() {
  const { accessToken } = useAuthStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await rolesApi.list(accessToken);
      setRoles(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  async function handleDelete(role: Role) {
    if (!accessToken) return;
    if (!confirm(`Delete the "${role.displayName}" role? This cannot be undone.`)) return;
    try {
      await rolesApi.delete(accessToken, role.id);
      loadRoles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role');
    }
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading roles...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Roles <span className="text-sm font-normal text-gray-500">({roles.length})</span>
        </h2>
        <button className="btn-primary text-sm" onClick={() => setShowCreateModal(true)}>
          Create Custom Role
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>
      )}

      {/* Roles list */}
      <div className="space-y-3">
        {roles.map((role) => (
          <div key={role.id} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {role.displayName}
                  {role.isDefault && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(System)</span>
                  )}
                  {role.isCustom && (
                    <span className="ml-2 text-xs font-normal text-primary-600">(Custom)</span>
                  )}
                </h3>
                <p className="text-xs text-gray-500">
                  {role._count.userTenants} user{role._count.userTenants !== 1 ? 's' : ''} assigned
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingRole(role)}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  Edit Permissions
                </button>
                {role.isCustom && (
                  <button
                    onClick={() => handleDelete(role)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Permission matrix (compact) */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Module</th>
                    {ALL_ACTIONS.map((a) => (
                      <th key={a} className="px-2 py-1.5 text-center font-medium text-gray-500 w-10">
                        {ACTION_LABELS[a]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ALL_MODULES.map((mod) => (
                    <tr key={mod}>
                      <td className="px-3 py-1 text-gray-700">{MODULE_LABELS[mod]}</td>
                      {ALL_ACTIONS.map((action) => {
                        const perm = role.permissions.find(
                          (p) => p.module === mod && p.action === action,
                        );
                        return (
                          <td key={action} className="px-2 py-1 text-center">
                            <span className={`inline-block w-3 h-3 rounded-full ${
                              perm?.allowed ? 'bg-green-500' : 'bg-gray-200'
                            }`} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <RoleEditorModal
          role={null}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); loadRoles(); }}
        />
      )}
      {editingRole && (
        <RoleEditorModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSaved={() => { setEditingRole(null); loadRoles(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// ROLE EDITOR MODAL (Create / Edit)
// ============================================================

function RoleEditorModal({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const isCreate = !role;

  const [name, setName] = useState(role?.name || '');
  const [displayName, setDisplayName] = useState(role?.displayName || '');
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const mod of ALL_MODULES) {
      matrix[mod] = {};
      for (const action of ALL_ACTIONS) {
        const existing = role?.permissions.find((p) => p.module === mod && p.action === action);
        matrix[mod][action] = existing?.allowed ?? false;
      }
    }
    return matrix;
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function togglePermission(mod: string, action: string) {
    setPermissions((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [action]: !prev[mod][action],
      },
    }));
  }

  function setModuleAll(mod: string, value: boolean) {
    setPermissions((prev) => ({
      ...prev,
      [mod]: Object.fromEntries(ALL_ACTIONS.map((a) => [a, value])),
    }));
  }

  function buildPermissionsList() {
    const list: Array<{ module: string; action: string; allowed: boolean }> = [];
    for (const mod of ALL_MODULES) {
      for (const action of ALL_ACTIONS) {
        list.push({ module: mod, action, allowed: permissions[mod][action] });
      }
    }
    return list;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);

    try {
      if (isCreate) {
        await rolesApi.create(accessToken, {
          name,
          displayName,
          permissions: buildPermissionsList(),
        });
      } else {
        await rolesApi.update(accessToken, role.id, {
          displayName: displayName !== role.displayName ? displayName : undefined,
          permissions: buildPermissionsList(),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-generate slug from display name on create
  useEffect(() => {
    if (isCreate && displayName) {
      setName(
        displayName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .replace(/^_+|_+$/g, ''),
      );
    }
  }, [displayName, isCreate]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isCreate ? 'Create Custom Role' : `Edit Role: ${role.displayName}`}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                required
                placeholder="e.g. Regional Manager"
              />
            </div>
            <div>
              <label className="label">System Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`input-field ${!isCreate ? 'bg-gray-50' : ''}`}
                required
                disabled={!isCreate}
                placeholder="e.g. regional_manager"
                pattern="^[a-z][a-z0-9_]*$"
                title="Lowercase letters, numbers, and underscores only"
              />
              {isCreate && (
                <p className="text-xs text-gray-400 mt-1">Auto-generated from display name</p>
              )}
            </div>
          </div>

          {/* Permission matrix */}
          <div>
            <label className="label mb-2">Permissions</label>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Module</th>
                    {ALL_ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-2 text-center font-medium text-gray-500 w-16">
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-medium text-gray-500 w-16">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ALL_MODULES.map((mod) => {
                    const allChecked = ALL_ACTIONS.every((a) => permissions[mod][a]);
                    return (
                      <tr key={mod} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 font-medium">{MODULE_LABELS[mod]}</td>
                        {ALL_ACTIONS.map((action) => (
                          <td key={action} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={permissions[mod][action]}
                              onChange={() => togglePermission(mod, action)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() => setModuleAll(mod, !allChecked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={isLoading}>
              {isLoading ? 'Saving...' : isCreate ? 'Create Role' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
