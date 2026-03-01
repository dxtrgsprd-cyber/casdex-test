'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { devicesApi, Device } from '@/lib/api';

const CATEGORIES = [
  'camera',
  'access_control',
  'networking',
  'av',
  'sensor',
  'mount',
  'accessory',
];

const CATEGORY_LABELS: Record<string, string> = {
  camera: 'Camera',
  access_control: 'Access Control',
  networking: 'Networking',
  av: 'Audio / Video',
  sensor: 'Sensor',
  mount: 'Mount',
  accessory: 'Accessory',
};

const FORM_FACTORS = ['dome', 'bullet', 'PTZ', 'fisheye', 'turret', 'box', 'multi-sensor', 'panoramic'];

const RESOLUTIONS = ['8MP', '4K', '6MP', '5MP', '4MP', '3MP', '2MP', '1080p', '720p'];

const EMPTY_FORM: Partial<Device> = {
  manufacturer: '',
  category: 'camera',
  model: '',
  partNumber: '',
  description: '',
  resolution: '',
  formFactor: '',
  indoor: false,
  outdoor: false,
  vandal: false,
  hfov: null,
  maxDistance: null,
  focalLength: '',
  imager: '',
  mountOptions: [],
  msrp: null,
  ndaaCompliant: false,
};

export default function AdminDevicesPage() {
  const { accessToken } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [form, setForm] = useState<Partial<Device>>(EMPTY_FORM);
  const [mountOptionsText, setMountOptionsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (filterCategory) query.category = filterCategory;
      if (filterManufacturer) query.manufacturer = filterManufacturer;
      if (filterStatus) query.status = filterStatus;
      const res = await devicesApi.list(accessToken, query);
      setDevices(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, filterCategory, filterManufacturer, filterStatus]);

  const loadManufacturers = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await devicesApi.manufacturers(accessToken);
      setManufacturers(res.data);
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadManufacturers();
  }, [loadManufacturers]);

  function openCreate() {
    setEditingDevice(null);
    setForm({ ...EMPTY_FORM });
    setMountOptionsText('');
    setError('');
    setShowModal(true);
  }

  function openEdit(device: Device) {
    setEditingDevice(device);
    setForm({
      manufacturer: device.manufacturer,
      category: device.category,
      model: device.model,
      partNumber: device.partNumber,
      description: device.description || '',
      resolution: device.resolution || '',
      formFactor: device.formFactor || '',
      indoor: device.indoor || false,
      outdoor: device.outdoor || false,
      vandal: device.vandal || false,
      hfov: device.hfov,
      maxDistance: device.maxDistance,
      focalLength: device.focalLength || '',
      imager: device.imager || '',
      mountOptions: device.mountOptions || [],
      msrp: device.msrp,
      ndaaCompliant: device.ndaaCompliant ?? false,
    });
    setMountOptionsText(
      Array.isArray(device.mountOptions) ? device.mountOptions.join(', ') : ''
    );
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!accessToken) return;
    if (!form.manufacturer || !form.category || !form.model || !form.partNumber) {
      setError('Manufacturer, category, model, and part number are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        mountOptions: mountOptionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        hfov: form.hfov ? Number(form.hfov) : undefined,
        maxDistance: form.maxDistance ? Number(form.maxDistance) : undefined,
        msrp: form.msrp ? Number(form.msrp) : undefined,
      };
      if (editingDevice) {
        await devicesApi.update(accessToken, editingDevice.id, data);
      } else {
        await devicesApi.create(accessToken, data);
      }
      setShowModal(false);
      loadDevices();
      loadManufacturers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save device');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    try {
      await devicesApi.delete(accessToken, id);
      setShowDeleteConfirm(null);
      loadDevices();
    } catch {
      // ignore
    }
  }

  async function handleToggleActive(device: Device) {
    if (!accessToken) return;
    try {
      await devicesApi.update(accessToken, device.id, { isActive: !device.isActive } as Partial<Device>);
      loadDevices();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Device Library</h1>
          <p className="text-sm text-gray-500 mt-1">
            Global device catalog used across all organizations
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          Add Device
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search model, part #, or manufacturer..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
          >
            <option value="">All Manufacturers</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 mb-3">No devices found</p>
            <button onClick={openCreate} className="btn-primary text-sm">
              Add First Device
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Manufacturer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Model</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Part Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Form Factor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resolution</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NDAA</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{device.manufacturer}</td>
                  <td className="px-4 py-3 text-gray-700">{device.model}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{device.partNumber}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {CATEGORY_LABELS[device.category] || device.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{device.formFactor || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{device.resolution || '-'}</td>
                  <td className="px-4 py-3">
                    {device.ndaaCompliant ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Compliant
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                        Non-Compliant
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        device.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {device.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(device)}
                      className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(device)}
                      className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                    >
                      {device.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(device.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDevice ? 'Edit Device' : 'Add Device'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                x
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Manufacturer *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Hanwha, AXIS, Verkada"
                    value={form.manufacturer || ''}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select
                    className="input-field"
                    value={form.category || 'camera'}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Model *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. XNV-8080R"
                    value={form.model || ''}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Part Number *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. XNV-8080R"
                    value={form.partNumber || ''}
                    onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Brief description of the device"
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Resolution</label>
                  <select
                    className="input-field"
                    value={form.resolution || ''}
                    onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                  >
                    <option value="">Select</option>
                    {RESOLUTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Form Factor</label>
                  <select
                    className="input-field"
                    value={form.formFactor || ''}
                    onChange={(e) => setForm({ ...form, formFactor: e.target.value })}
                  >
                    <option value="">Select</option>
                    {FORM_FACTORS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">MSRP ($)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={form.msrp ?? ''}
                    onChange={(e) => setForm({ ...form, msrp: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">HFOV (degrees)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 112"
                    value={form.hfov ?? ''}
                    onChange={(e) => setForm({ ...form, hfov: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <label className="label">Max Distance (ft)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 100"
                    value={form.maxDistance ?? ''}
                    onChange={(e) => setForm({ ...form, maxDistance: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <label className="label">Focal Length</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 2.8mm"
                    value={form.focalLength || ''}
                    onChange={(e) => setForm({ ...form, focalLength: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Imager</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder='e.g. 1/2.8"'
                    value={form.imager || ''}
                    onChange={(e) => setForm({ ...form, imager: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Compatible Mount Part Numbers</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Comma-separated part numbers"
                    value={mountOptionsText}
                    onChange={(e) => setMountOptionsText(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Separate multiple part numbers with commas</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.indoor || false}
                    onChange={(e) => setForm({ ...form, indoor: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Indoor
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.outdoor || false}
                    onChange={(e) => setForm({ ...form, outdoor: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Outdoor
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.vandal || false}
                    onChange={(e) => setForm({ ...form, vandal: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Vandal Resistant
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.ndaaCompliant || false}
                    onChange={(e) => setForm({ ...form, ndaaCompliant: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  NDAA Compliant
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-sm"
              >
                {saving ? 'Saving...' : editingDevice ? 'Update Device' : 'Add Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Device</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this device? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
