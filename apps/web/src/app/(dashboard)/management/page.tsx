'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi, vendorsApi, subcontractorsApi, Vendor, Subcontractor } from '@/lib/api';

const TABS = ['Profile', 'Change Password', 'Users', 'Vendors', 'Subcontractors'] as const;

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
