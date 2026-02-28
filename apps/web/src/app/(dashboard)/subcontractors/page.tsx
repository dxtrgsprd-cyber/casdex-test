'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { subcontractorsApi, Subcontractor, ContactEntry } from '@/lib/api';

const COMMON_TRADES = [
  'Low Voltage',
  'Electrical',
  'Networking',
  'Fire Alarm',
  'Access Control',
  'CCTV',
  'Audio/Video',
  'Structured Cabling',
  'General Contractor',
];

export default function SubcontractorsPage() {
  const { accessToken } = useAuthStore();
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (statusFilter) query.status = statusFilter;

      const res = await subcontractorsApi.list(accessToken, query);
      setSubs(res.data);
    } catch (err) {
      console.error('Failed to load subcontractors:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleEdit(sub: Subcontractor) {
    setEditingSub(sub);
    setShowModal(true);
  }

  function handleCreate() {
    setEditingSub(null);
    setShowModal(true);
  }

  async function handleToggleActive(sub: Subcontractor) {
    if (!accessToken) return;
    try {
      await subcontractorsApi.update(accessToken, sub.id, { isActive: !sub.isActive });
      loadData();
    } catch (err) {
      console.error('Failed to update subcontractor:', err);
    }
  }

  async function handleDelete(sub: Subcontractor) {
    if (!accessToken) return;
    if (!confirm(`Are you sure you want to delete "${sub.companyName}"? This cannot be undone.`)) return;
    try {
      await subcontractorsApi.delete(accessToken, sub.id);
      loadData();
    } catch (err) {
      console.error('Failed to delete subcontractor:', err);
    }
  }

  function isInsuranceExpiring(dateStr: string | null) {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  }

  function isInsuranceExpired(dateStr: string | null) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subcontractors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage subcontractor relationships and assignments
            {!loading && <span className="ml-2 text-gray-400">({subs.length} total)</span>}
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          Add Subcontractor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, contact, or email..."
          className="input-field max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Subcontractor List */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : subs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No subcontractors found.</p>
          <button className="btn-primary text-sm" onClick={handleCreate}>
            Add your first subcontractor
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trades</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Territories</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Insurance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{s.companyName}</span>
                      {s.licenseNumber && (
                        <span className="block text-xs text-gray-400">Lic# {s.licenseNumber}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.contacts && s.contacts.length > 0 ? (
                      <div>
                        <span className="text-gray-600">{(s.contacts[0] as ContactEntry).name}</span>
                        {(s.contacts[0] as ContactEntry).role && (
                          <span className="block text-[11px] text-gray-400">{(s.contacts[0] as ContactEntry).role}</span>
                        )}
                        {(s.contacts[0] as ContactEntry).email && (
                          <span className="block text-xs text-gray-400">{(s.contacts[0] as ContactEntry).email}</span>
                        )}
                        {(s.contacts[0] as ContactEntry).phone && (
                          <span className="block text-xs text-gray-400">{(s.contacts[0] as ContactEntry).phone}</span>
                        )}
                        {s.contacts.length > 1 && (
                          <span className="text-xs text-primary-500">+{s.contacts.length - 1} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.trades && s.trades.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(s.trades as string[]).slice(0, 3).map((trade) => (
                          <span key={trade} className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600">
                            {trade}
                          </span>
                        ))}
                        {s.trades.length > 3 && (
                          <span className="text-xs text-gray-400">+{s.trades.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.territories && s.territories.length > 0 ? (
                      <span className="text-gray-600 text-xs">
                        {(s.territories as string[]).slice(0, 3).join(', ')}
                        {s.territories.length > 3 && ` +${s.territories.length - 3}`}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.insuranceExpiry ? (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          isInsuranceExpired(s.insuranceExpiry)
                            ? 'bg-red-100 text-red-700'
                            : isInsuranceExpiring(s.insuranceExpiry)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isInsuranceExpired(s.insuranceExpiry)
                          ? 'Expired'
                          : new Date(s.insuranceExpiry).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(s)}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <SubcontractorModal
          sub={editingSub}
          onClose={() => {
            setShowModal(false);
            setEditingSub(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingSub(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function SubcontractorModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: Subcontractor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: sub?.companyName || '',
    contacts: (sub?.contacts || []) as ContactEntry[],
    trades: (sub?.trades || []) as string[],
    territories: (sub?.territories || []) as string[],
    insuranceExpiry: sub?.insuranceExpiry ? sub.insuranceExpiry.split('T')[0] : '',
    licenseNumber: sub?.licenseNumber || '',
    notes: sub?.notes || '',
  });
  const [newTrade, setNewTrade] = useState('');
  const [newTerritory, setNewTerritory] = useState('');

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Trade management
  function addTrade(trade: string) {
    const trimmed = trade.trim();
    if (trimmed && !form.trades.includes(trimmed)) {
      setForm((prev) => ({ ...prev, trades: [...prev.trades, trimmed] }));
    }
    setNewTrade('');
  }

  function removeTrade(trade: string) {
    setForm((prev) => ({ ...prev, trades: prev.trades.filter((t) => t !== trade) }));
  }

  // Territory management
  function addTerritory() {
    const trimmed = newTerritory.trim();
    if (trimmed && !form.territories.includes(trimmed)) {
      setForm((prev) => ({ ...prev, territories: [...prev.territories, trimmed] }));
    }
    setNewTerritory('');
  }

  function removeTerritory(territory: string) {
    setForm((prev) => ({ ...prev, territories: prev.territories.filter((t) => t !== territory) }));
  }

  // Contact management
  function addContact() {
    setForm((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', email: '', phone: '', role: '' }],
    }));
  }

  function updateContact(index: number, field: keyof ContactEntry, value: string) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }));
  }

  function removeContact(index: number) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);

    try {
      const data = {
        companyName: form.companyName,
        contacts: form.contacts.filter((c) => c.name.trim()),
        trades: form.trades,
        territories: form.territories,
        insuranceExpiry: form.insuranceExpiry || undefined,
        licenseNumber: form.licenseNumber || undefined,
        notes: form.notes || undefined,
      };

      if (sub) {
        await subcontractorsApi.update(accessToken, sub.id, data);
      } else {
        await subcontractorsApi.create(accessToken, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subcontractor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {sub ? 'Edit Subcontractor' : 'Add Subcontractor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Company Name *</label>
            <input
              className="input-field"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              required
            />
          </div>

          {/* Contacts */}
          <div>
            <label className="label">Contacts</label>
            {form.contacts.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded p-3 mb-2 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    Contact {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      className="input-field text-sm"
                      placeholder="Name *"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      className="input-field text-sm"
                      placeholder="Role (e.g. Project Manager)"
                      value={contact.role || ''}
                      onChange={(e) => updateContact(index, 'role', e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      className="input-field text-sm"
                      type="email"
                      placeholder="Email"
                      value={contact.email || ''}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      className="input-field text-sm"
                      placeholder="Phone"
                      value={contact.phone || ''}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addContact}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              + Add Contact
            </button>
          </div>

          {/* Trades */}
          <div>
            <label className="label">Trades / Specialties</label>
            {form.trades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.trades.map((trade) => (
                  <span
                    key={trade}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600"
                  >
                    {trade}
                    <button
                      type="button"
                      onClick={() => removeTrade(trade)}
                      className="ml-1.5 text-blue-400 hover:text-blue-700"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={newTrade}
                onChange={(e) => setNewTrade(e.target.value)}
                placeholder="Type a trade or select below"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTrade(newTrade);
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => addTrade(newTrade)}
                disabled={!newTrade.trim()}
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {COMMON_TRADES.filter((t) => !form.trades.includes(t)).map((trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => addTrade(trade)}
                  className="px-2 py-0.5 text-[11px] rounded bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  + {trade}
                </button>
              ))}
            </div>
          </div>

          {/* Territories */}
          <div>
            <label className="label">Territories / Regions</label>
            {form.territories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.territories.map((territory) => (
                  <span
                    key={territory}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-600"
                  >
                    {territory}
                    <button
                      type="button"
                      onClick={() => removeTerritory(territory)}
                      className="ml-1.5 text-green-400 hover:text-green-700"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={newTerritory}
                onChange={(e) => setNewTerritory(e.target.value)}
                placeholder="e.g. Texas, Southeast, National"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTerritory();
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={addTerritory}
                disabled={!newTerritory.trim()}
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Insurance Expiry</label>
              <input
                className="input-field"
                type="date"
                value={form.insuranceExpiry}
                onChange={(e) => updateField('insuranceExpiry', e.target.value)}
              />
            </div>
            <div>
              <label className="label">License Number</label>
              <input
                className="input-field"
                value={form.licenseNumber}
                onChange={(e) => updateField('licenseNumber', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : sub ? 'Save Changes' : 'Add Subcontractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
