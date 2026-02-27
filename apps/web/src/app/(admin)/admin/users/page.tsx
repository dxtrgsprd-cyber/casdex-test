'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { globalUsersApi, GlobalUser } from '@/lib/api';

export default function AdminUsersPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await globalUsersApi.list(accessToken, page, 25, search || undefined);
      setUsers(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      // handled by loading state
    }
    setLoading(false);
  }, [accessToken, page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            All users across the platform. Users can be added without assigning an organization.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-sm"
        >
          Add User
        </button>
      </div>

      {/* Search and stats */}
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="input-field max-w-xs"
        />
        <span className="text-sm text-gray-500">
          {total} user{total !== 1 ? 's' : ''} total
        </span>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : users.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">
            {search ? 'No users match your search.' : 'No users found.'}
          </p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organizations
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        {user.title && (
                          <div className="text-xs text-gray-500">{user.title}</div>
                        )}
                        {user.isGlobalAdmin && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mt-0.5">
                            Global Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      {user.organizations.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No organization</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.organizations.map((org) => (
                            <span
                              key={org.tenantId}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                              title={`Role: ${org.role.displayName}`}
                            >
                              {org.tenantName}
                              <span className="ml-1 text-blue-400">({org.role.displayName})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    title: '',
    password: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setError('');
    setSaving(true);

    try {
      await globalUsersApi.create(accessToken, {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        title: form.title || undefined,
        password: form.password || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-500">
            Create a user account. Organization assignment is optional and can be done later.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field w-full"
              minLength={8}
              placeholder="Leave blank to send invite link"
            />
            <p className="text-xs text-gray-400 mt-1">
              If left blank, the user will receive an invite link to set their own password.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
