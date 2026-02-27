'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { vendorsApi, Vendor } from '@/lib/api';

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

const CATEGORY_COLORS: Record<string, string> = {
  cameras: 'bg-blue-100 text-blue-700',
  access_control: 'bg-purple-100 text-purple-700',
  networking: 'bg-cyan-100 text-cyan-700',
  av: 'bg-amber-100 text-amber-700',
  sensors: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function VendorsPage() {
  const { accessToken } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [total, setTotal] = useState(0);

  const loadVendors = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (categoryFilter) query.category = categoryFilter;
      if (showInactive) query.includeInactive = 'true';

      const res = await vendorsApi.list(accessToken, query);
      setVendors(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, categoryFilter, showInactive]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  async function handleDeactivate(id: string) {
    if (!accessToken) return;
    try {
      await vendorsApi.delete(accessToken, id);
      loadVendors();
    } catch (err) {
      console.error('Failed to deactivate vendor:', err);
    }
  }

  async function handleReactivate(id: string) {
    if (!accessToken) return;
    try {
      await vendorsApi.reactivate(accessToken, id);
      loadVendors();
    } catch (err) {
      console.error('Failed to reactivate vendor:', err);
    }
  }

  function openEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setShowModal(true);
  }

  function openCreate() {
    setEditingVendor(null);
    setShowModal(true);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage vendor relationships and contacts ({total} total)
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
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
          className="input-field max-w-[180px]"
        >
          <option value="">All Categories</option>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show inactive
        </label>
      </div>

      {/* Category pills */}
      {!categoryFilter && (
        <div className="flex flex-wrap gap-2 mb-4">
          {VENDOR_CATEGORIES.map((c) => {
            const count = vendors.filter((v) => v.category === c.value).length;
            if (count === 0) return null;
            return (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[c.value]}`}
              >
                {c.label} ({count})
              </button>
            );
          })}
          {(() => {
            const uncategorized = vendors.filter((v) => !v.category).length;
            if (uncategorized === 0) return null;
            return (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Uncategorized ({uncategorized})
              </span>
            );
          })()}
        </div>
      )}

      {/* Vendor List */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : vendors.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            {search || categoryFilter ? 'No vendors match your filters.' : 'No vendors added yet.'}
          </p>
          {!search && !categoryFilter && (
            <button className="btn-primary text-sm" onClick={openCreate}>
              Add your first vendor
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{vendor.name}</td>
                  <td className="px-4 py-3">
                    {vendor.category ? (
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[vendor.category] || 'bg-gray-100 text-gray-700'}`}>
                        {CATEGORY_LABELS[vendor.category] || vendor.category}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{vendor.contact || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{vendor.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{vendor.phone || '-'}</td>
                  <td className="px-4 py-3">
                    {vendor.isActive ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(vendor)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Edit
                      </button>
                      {vendor.isActive ? (
                        <button
                          onClick={() => handleDeactivate(vendor.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(vendor.id)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Reactivate
                        </button>
                      )}
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
            loadVendors();
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

          <div>
            <label className="label">Category</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            >
              <option value="">Select category...</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
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
              <label className="label">Phone</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
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
              <label className="label">Website</label>
              <input
                className="input-field"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://..."
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
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
