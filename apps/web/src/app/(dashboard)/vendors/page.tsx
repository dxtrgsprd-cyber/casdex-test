'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { vendorsApi, Vendor, ContactEntry } from '@/lib/api';

const VENDOR_CATEGORIES: Record<string, string> = {
  cameras: 'Cameras',
  access_control: 'Access Control',
  networking: 'Networking',
  av: 'A/V',
  sensors: 'Sensors',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  cameras: 'bg-blue-100 text-blue-700',
  access_control: 'bg-purple-100 text-purple-700',
  networking: 'bg-teal-100 text-teal-700',
  av: 'bg-orange-100 text-orange-700',
  sensors: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function VendorsPage() {
  const { accessToken } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (categoryFilter) query.category = categoryFilter;
      if (statusFilter) query.status = statusFilter;

      const res = await vendorsApi.list(accessToken, query);
      setVendors(res.data);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, categoryFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setShowModal(true);
  }

  function handleCreate() {
    setEditingVendor(null);
    setShowModal(true);
  }

  async function handleToggleActive(vendor: Vendor) {
    if (!accessToken) return;
    try {
      await vendorsApi.update(accessToken, vendor.id, { isActive: !vendor.isActive });
      loadData();
    } catch (err) {
      console.error('Failed to update vendor:', err);
    }
  }

  async function handleDelete(vendor: Vendor) {
    if (!accessToken) return;
    if (!confirm(`Are you sure you want to delete "${vendor.name}"? This cannot be undone.`)) return;
    try {
      await vendorsApi.delete(accessToken, vendor.id);
      loadData();
    } catch (err) {
      console.error('Failed to delete vendor:', err);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage vendor relationships and contacts
            {!loading && <span className="ml-2 text-gray-400">({vendors.length} total)</span>}
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, contact, or email..."
          className="input-field max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Categories</option>
          {Object.entries(VENDOR_CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
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

      {/* Vendor List */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : vendors.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No vendors found.</p>
          <button className="btn-primary text-sm" onClick={handleCreate}>
            Add your first vendor
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categories</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{v.name}</span>
                      {v.website && (
                        <a
                          href={v.website.startsWith('http') ? v.website : `https://${v.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-primary-600 hover:underline truncate max-w-[200px]"
                        >
                          {v.website}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {v.contacts && v.contacts.length > 0 ? (
                      <div>
                        <span className="text-gray-600">{(v.contacts[0] as ContactEntry).name}</span>
                        {(v.contacts[0] as ContactEntry).role && (
                          <span className="block text-[11px] text-gray-400">{(v.contacts[0] as ContactEntry).role}</span>
                        )}
                        {(v.contacts[0] as ContactEntry).email && (
                          <span className="block text-xs text-gray-400">{(v.contacts[0] as ContactEntry).email}</span>
                        )}
                        {(v.contacts[0] as ContactEntry).phone && (
                          <span className="block text-xs text-gray-400">{(v.contacts[0] as ContactEntry).phone}</span>
                        )}
                        {v.contacts.length > 1 && (
                          <span className="text-xs text-primary-500">+{v.contacts.length - 1} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.categories && v.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(v.categories as string[]).slice(0, 3).map((cat) => (
                          <span key={cat} className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                            {VENDOR_CATEGORIES[cat] || cat}
                          </span>
                        ))}
                        {v.categories.length > 3 && (
                          <span className="text-xs text-gray-400">+{v.categories.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(v)}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(v)}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                      >
                        {v.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
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
        <VendorModal
          vendor={editingVendor}
          onClose={() => {
            setShowModal(false);
            setEditingVendor(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingVendor(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function VendorModal({
  vendor,
  onClose,
  onSaved,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: vendor?.name || '',
    website: vendor?.website || '',
    categories: (vendor?.categories || []) as string[],
    contacts: (vendor?.contacts || []) as ContactEntry[],
    notes: vendor?.notes || '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Category management
  function addCategory(cat: string) {
    const trimmed = cat.trim();
    if (trimmed && !form.categories.includes(trimmed)) {
      setForm((prev) => ({ ...prev, categories: [...prev.categories, trimmed] }));
    }
  }

  function removeCategory(cat: string) {
    setForm((prev) => ({ ...prev, categories: prev.categories.filter((c) => c !== cat) }));
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
        name: form.name,
        website: form.website || undefined,
        categories: form.categories,
        contacts: form.contacts.filter((c) => c.name.trim()),
        notes: form.notes || undefined,
      };

      if (vendor) {
        await vendorsApi.update(accessToken, vendor.id, data);
      } else {
        await vendorsApi.create(accessToken, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {vendor ? 'Edit Vendor' : 'Add Vendor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vendor Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                className="input-field"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Categories — tag picker */}
          <div>
            <label className="label">Categories</label>
            {form.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.categories.map((cat) => (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {VENDOR_CATEGORIES[cat] || cat}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="ml-1.5 text-current opacity-60 hover:opacity-100"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {Object.entries(VENDOR_CATEGORIES)
                .filter(([key]) => !form.categories.includes(key))
                .map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addCategory(key)}
                    className="px-2 py-0.5 text-[11px] rounded bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  >
                    + {label}
                  </button>
                ))}
            </div>
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
                      placeholder="Role (e.g. Sales Rep)"
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
              {isLoading ? 'Saving...' : vendor ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
