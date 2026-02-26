'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

const TABS = ['Profile', 'Change Password', 'Users', 'Vendors', 'Subcontractors'] as const;

export default function ManagementPage() {
  const { user, roles, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string>('Profile');

  const isAdmin = roles.includes('admin') || roles.includes('manager');

  // Filter tabs based on role
  const visibleTabs = TABS.filter((tab) => {
    if (tab === 'Users' || tab === 'Vendors' || tab === 'Subcontractors') {
      return isAdmin;
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
        <div className="flex space-x-4">
          {visibleTabs.map((tab) => (
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
      {activeTab === 'Users' && <UsersTab />}
      {activeTab === 'Vendors' && <VendorsTab />}
      {activeTab === 'Subcontractors' && <SubcontractorsTab />}
    </div>
  );
}

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

function UsersTab() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
        <button className="btn-primary text-sm">Add User</button>
      </div>
      <p className="text-sm text-gray-500">User list will display here.</p>
    </div>
  );
}

function VendorsTab() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Vendor Management</h2>
        <button className="btn-primary text-sm">Add Vendor</button>
      </div>
      <p className="text-sm text-gray-500">Vendor list will display here.</p>
    </div>
  );
}

function SubcontractorsTab() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Subcontractor Management</h2>
        <button className="btn-primary text-sm">Add Subcontractor</button>
      </div>
      <p className="text-sm text-gray-500">Subcontractor list will display here.</p>
    </div>
  );
}
