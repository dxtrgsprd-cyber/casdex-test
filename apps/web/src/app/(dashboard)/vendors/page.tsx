'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { vendorsApi, Vendor } from '@/lib/api';

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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
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
                  <td className="px-4 py-3 text-gray-600">{v.contact || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.phone || '-'}</td>
                  <td className="px-4 py-3">
                    {v.category ? (
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[v.category] || 'bg-gray-100 text-gray-600'}`}>
                        {VENDOR_CATEGORIES[v.category] || v.category}
                      </span>
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
      const data = {
        name: form.name,
        contact: form.contact || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        category: form.category || undefined,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {vendor ? 'Edit Vendor' : 'Add Vendor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Vendor Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input
                className="input-field"
                value={form.contact}
                onChange={(e) => updateField('contact', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                <option value="">Select category</option>
                {Object.entries(VENDOR_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input-field"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
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
