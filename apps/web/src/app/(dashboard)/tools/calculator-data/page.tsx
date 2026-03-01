'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  devicesApi,
  calculatorDataApi,
  Device,
  MountConfigData,
  CalcReferenceDataItem,
  ComplianceJurisdictionData,
} from '@/lib/api';

// ============================================================
// Types
// ============================================================

type TabName = 'Device Specs' | 'Mount Configs' | 'Reference Data' | 'Compliance Rules';

const TABS: TabName[] = ['Device Specs', 'Mount Configs', 'Reference Data', 'Compliance Rules'];

const CATEGORY_LABELS: Record<string, string> = {
  camera: 'Camera',
  access_control: 'Access Control',
  networking: 'Networking',
  av: 'Audio / Video',
  sensor: 'Sensor',
  mount: 'Mount',
  accessory: 'Accessory',
};

// ============================================================
// Main Page
// ============================================================

export default function CalculatorDataPage() {
  const router = useRouter();
  const { accessToken, user, roles } = useAuthStore();
  const isAdmin =
    user?.globalRole === 'global_admin' ||
    roles.includes('org_admin') ||
    roles.includes('org_manager');

  const [activeTab, setActiveTab] = useState<TabName>('Device Specs');

  // Global toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  if (!isAdmin) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push('/tools')} className="text-sm text-gray-400 hover:text-gray-600">
              Tools
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-700">Calculator Data</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Calculator Data</h1>
        </div>
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">
            You do not have permission to access this page. Admin, Org Admin, or Org Manager role required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => router.push('/tools')} className="text-sm text-gray-400 hover:text-gray-600">
            Tools
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">Calculator Data</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Calculator Data Manager</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage device specs, mount configurations, reference data, and compliance rules for calculators
        </p>
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
      {activeTab === 'Device Specs' && <DeviceSpecsTab showToast={showToast} />}
      {activeTab === 'Mount Configs' && <MountConfigsTab showToast={showToast} />}
      {activeTab === 'Reference Data' && <ReferenceDataTab showToast={showToast} />}
      {activeTab === 'Compliance Rules' && <ComplianceRulesTab showToast={showToast} />}
    </div>
  );
}

// ============================================================
// Shared Components
// ============================================================

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

function Modal({ open, title, onClose, children, wide }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 overflow-y-auto">
      <div className={`card p-6 w-full mx-4 mb-8 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface TabProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

// ============================================================
// Tab 1: Device Specs
// ============================================================

function DeviceSpecsTab({ showToast }: TabProps) {
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit state
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editSpecs, setEditSpecs] = useState('');
  const [savingSpecs, setSavingSpecs] = useState(false);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    manufacturer: '',
    model: '',
    partNumber: '',
    category: 'camera',
    description: '',
    ndaaCompliant: true,
    specs: '{}',
  });
  const [addSaving, setAddSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);

  const loadDevices = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (filterCategory) query.category = filterCategory;
      if (filterManufacturer) query.manufacturer = filterManufacturer;
      const res = await devicesApi.list(accessToken, query);
      setDevices(res.data);
    } catch {
      showToast('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, filterCategory, filterManufacturer, showToast]);

  const loadFilters = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [mfrs, cats] = await Promise.all([
        devicesApi.manufacturers(accessToken),
        devicesApi.categories(accessToken),
      ]);
      setManufacturers(mfrs.data);
      setCategories(cats.data);
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  function handleExpandAndEdit(device: Device) {
    if (expandedId === device.id) {
      setExpandedId(null);
      setEditingDevice(null);
    } else {
      setExpandedId(device.id);
      setEditingDevice(device);
      setEditSpecs(JSON.stringify(device.specs || {}, null, 2));
    }
  }

  async function handleSaveSpecs() {
    if (!accessToken || !editingDevice) return;
    setSavingSpecs(true);
    try {
      const parsedSpecs = JSON.parse(editSpecs);
      await devicesApi.update(accessToken, editingDevice.id, { specs: parsedSpecs });
      showToast('Device specs updated', 'success');
      setEditingDevice(null);
      setExpandedId(null);
      loadDevices();
    } catch (err) {
      showToast(err instanceof SyntaxError ? 'Invalid JSON format' : 'Failed to save specs', 'error');
    } finally {
      setSavingSpecs(false);
    }
  }

  async function handleAddDevice() {
    if (!accessToken) return;
    setAddSaving(true);
    try {
      const parsedSpecs = JSON.parse(addForm.specs);
      await devicesApi.create(accessToken, {
        manufacturer: addForm.manufacturer,
        model: addForm.model,
        partNumber: addForm.partNumber,
        category: addForm.category,
        description: addForm.description || undefined,
        ndaaCompliant: addForm.ndaaCompliant,
        specs: parsedSpecs,
      });
      showToast('Device created', 'success');
      setShowAddModal(false);
      setAddForm({ manufacturer: '', model: '', partNumber: '', category: 'camera', description: '', ndaaCompliant: true, specs: '{}' });
      loadDevices();
    } catch (err) {
      showToast(err instanceof SyntaxError ? 'Invalid JSON in specs field' : 'Failed to create device', 'error');
    } finally {
      setAddSaving(false);
    }
  }

  async function handleDeleteDevice() {
    if (!accessToken || !deleteTarget) return;
    try {
      await devicesApi.delete(accessToken, deleteTarget.id);
      showToast('Device deleted', 'success');
      setDeleteTarget(null);
      if (expandedId === deleteTarget.id) setExpandedId(null);
      loadDevices();
    } catch {
      showToast('Failed to delete device', 'error');
    }
  }

  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const res = await devicesApi.bulkImport(accessToken, items);
      showToast(`Imported ${res.imported} device(s)${res.errors.length > 0 ? `, ${res.errors.length} error(s)` : ''}`, res.errors.length > 0 ? 'error' : 'success');
      loadDevices();
    } catch {
      showToast('Failed to parse or import JSON file', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function getCalcSpecsSummary(device: Device): string[] {
    const tags: string[] = [];
    const specs = device.specs || {};
    if (device.hfov || specs.hfov || specs.fov) tags.push('FOV');
    if (specs.lpr || specs.lprMinPpf || specs.lprMaxDistance) tags.push('LPR');
    if (specs.wireless || specs.wirelessRange || specs.wirelessFrequency) tags.push('Wireless');
    if (specs.powerConsumption || specs.poeClass || specs.power) tags.push('Power');
    if (specs.storage || specs.edgeStorage) tags.push('Storage');
    if (specs.analytics || specs.aiFeatures) tags.push('Analytics');
    if (Object.keys(specs).length > 0 && tags.length === 0) tags.push('Custom');
    return tags;
  }

  return (
    <div>
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{devices.length} device(s) loaded</p>
        <div className="flex gap-2">
          <label className="btn-secondary text-sm cursor-pointer">
            Upload JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleBulkImport}
              className="hidden"
            />
          </label>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
            Add Device
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search model, part #, manufacturer..."
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
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
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
        </div>
      </div>

      {/* Device list */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">No devices match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => {
            const specTags = getCalcSpecsSummary(device);
            return (
              <div key={device.id} className="card">
                <button
                  onClick={() => handleExpandAndEdit(device)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-medium text-gray-900 text-sm whitespace-nowrap">
                      {device.manufacturer}
                    </span>
                    <span className="text-sm text-gray-700 truncate">{device.model}</span>
                    <span className="text-xs text-gray-400 font-mono">{device.partNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      CATEGORY_LABELS[device.category]
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {CATEGORY_LABELS[device.category] || device.category}
                    </span>
                    {specTags.map((tag) => (
                      <span key={tag} className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                        {tag}
                      </span>
                    ))}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(device); }}
                      className="text-xs text-red-400 hover:text-red-600 ml-2"
                    >
                      Delete
                    </button>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === device.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedId === device.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      {device.description && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-gray-400 text-xs uppercase tracking-wide">Description</span>
                          <p className="text-gray-700 mt-0.5">{device.description}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400 text-xs uppercase tracking-wide">NDAA</span>
                        <p className="mt-0.5">
                          <span className={`text-xs font-medium ${device.ndaaCompliant ? 'text-green-700' : 'text-red-600'}`}>
                            {device.ndaaCompliant ? 'Compliant' : 'Non-Compliant'}
                          </span>
                        </p>
                      </div>
                      {device.resolution && (
                        <div>
                          <span className="text-gray-400 text-xs uppercase tracking-wide">Resolution</span>
                          <p className="text-gray-700 mt-0.5">{device.resolution}</p>
                        </div>
                      )}
                      {device.hfov != null && (
                        <div>
                          <span className="text-gray-400 text-xs uppercase tracking-wide">HFOV</span>
                          <p className="text-gray-700 mt-0.5">{device.hfov} degrees</p>
                        </div>
                      )}
                      {device.maxDistance != null && (
                        <div>
                          <span className="text-gray-400 text-xs uppercase tracking-wide">Max Distance</span>
                          <p className="text-gray-700 mt-0.5">{device.maxDistance} ft</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">Calculator Specs (JSON)</label>
                      <textarea
                        className="input-field font-mono text-xs"
                        rows={10}
                        value={editSpecs}
                        onChange={(e) => setEditSpecs(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setExpandedId(null); setEditingDevice(null); }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveSpecs}
                          disabled={savingSpecs}
                          className="btn-primary text-sm"
                        >
                          {savingSpecs ? 'Saving...' : 'Save Specs'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Device Modal */}
      <Modal open={showAddModal} title="Add Device" onClose={() => setShowAddModal(false)} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Manufacturer</label>
              <input
                type="text"
                className="input-field"
                value={addForm.manufacturer}
                onChange={(e) => setAddForm((f) => ({ ...f, manufacturer: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Model</label>
              <input
                type="text"
                className="input-field"
                value={addForm.model}
                onChange={(e) => setAddForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Part Number</label>
              <input
                type="text"
                className="input-field"
                value={addForm.partNumber}
                onChange={(e) => setAddForm((f) => ({ ...f, partNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input-field"
                value={addForm.category}
                onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              className="input-field"
              value={addForm.description}
              onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ndaa-add"
              checked={addForm.ndaaCompliant}
              onChange={(e) => setAddForm((f) => ({ ...f, ndaaCompliant: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="ndaa-add" className="text-sm text-gray-700">NDAA Compliant</label>
          </div>
          <div>
            <label className="label">Calculator Specs (JSON)</label>
            <textarea
              className="input-field font-mono text-xs"
              rows={6}
              value={addForm.specs}
              onChange={(e) => setAddForm((f) => ({ ...f, specs: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleAddDevice}
              disabled={addSaving || !addForm.manufacturer || !addForm.model || !addForm.partNumber}
              className="btn-primary text-sm"
            >
              {addSaving ? 'Creating...' : 'Create Device'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Device"
        message={`Are you sure you want to delete "${deleteTarget?.manufacturer} ${deleteTarget?.model}"? This action cannot be undone.`}
        onConfirm={handleDeleteDevice}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ============================================================
// Tab 2: Mount Configs
// ============================================================

function MountConfigsTab({ showToast }: TabProps) {
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [configs, setConfigs] = useState<MountConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterCamera, setFilterCamera] = useState('');

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MountConfigData | null>(null);
  const [form, setForm] = useState({
    manufacturer: '',
    cameraModel: '',
    locationType: '',
    components: '[]',
    colorSuffix: '{}',
    colorPattern: '',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<MountConfigData | null>(null);

  const loadConfigs = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (filterManufacturer) query.manufacturer = filterManufacturer;
      if (filterCamera) query.cameraModel = filterCamera;
      const res = await calculatorDataApi.listMountConfigs(accessToken, query);
      setConfigs(res.data);
    } catch {
      showToast('Failed to load mount configs', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filterManufacturer, filterCamera, showToast]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  function openAddModal() {
    setEditingConfig(null);
    setForm({
      manufacturer: '',
      cameraModel: '',
      locationType: '',
      components: '[]',
      colorSuffix: '{}',
      colorPattern: '',
      sortOrder: 0,
    });
    setShowModal(true);
  }

  function openEditModal(config: MountConfigData) {
    setEditingConfig(config);
    setForm({
      manufacturer: config.manufacturer,
      cameraModel: config.cameraModel || '',
      locationType: config.locationType,
      components: JSON.stringify(config.components, null, 2),
      colorSuffix: JSON.stringify(config.colorSuffix, null, 2),
      colorPattern: config.colorPattern || '',
      sortOrder: config.sortOrder,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      const parsedComponents = JSON.parse(form.components);
      const parsedColorSuffix = JSON.parse(form.colorSuffix);
      const payload = {
        manufacturer: form.manufacturer,
        cameraModel: form.cameraModel || null,
        locationType: form.locationType,
        components: parsedComponents,
        colorSuffix: parsedColorSuffix,
        colorPattern: form.colorPattern || null,
        sortOrder: form.sortOrder,
      };

      if (editingConfig) {
        await calculatorDataApi.updateMountConfig(accessToken, editingConfig.id, payload);
        showToast('Mount config updated', 'success');
      } else {
        await calculatorDataApi.createMountConfig(accessToken, payload);
        showToast('Mount config created', 'success');
      }
      setShowModal(false);
      loadConfigs();
    } catch (err) {
      showToast(err instanceof SyntaxError ? 'Invalid JSON format' : 'Failed to save mount config', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !deleteTarget) return;
    try {
      await calculatorDataApi.deleteMountConfig(accessToken, deleteTarget.id);
      showToast('Mount config deleted', 'success');
      setDeleteTarget(null);
      loadConfigs();
    } catch {
      showToast('Failed to delete mount config', 'error');
    }
  }

  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const res = await calculatorDataApi.bulkImportMountConfigs(accessToken, items);
      showToast(`Imported ${res.imported} config(s)${res.errors.length > 0 ? `, ${res.errors.length} error(s)` : ''}`, res.errors.length > 0 ? 'error' : 'success');
      loadConfigs();
    } catch {
      showToast('Failed to parse or import JSON file', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Derive filter options from loaded data
  const mfrOptions = Array.from(new Set(configs.map((c) => c.manufacturer))).sort();
  const cameraOptions = Array.from(new Set(configs.map((c) => c.cameraModel).filter(Boolean))).sort() as string[];

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{configs.length} mount config(s)</p>
        <div className="flex gap-2">
          <label className="btn-secondary text-sm cursor-pointer">
            Upload JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleBulkImport}
              className="hidden"
            />
          </label>
          <button onClick={openAddModal} className="btn-primary text-sm">
            Add Config
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            className="input-field"
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
          >
            <option value="">All Manufacturers</option>
            {mfrOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterCamera}
            onChange={(e) => setFilterCamera(e.target.value)}
          >
            <option value="">All Camera Models</option>
            {cameraOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading mount configs...</div>
      ) : configs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">No mount configurations found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Manufacturer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Camera Model</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Components</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Color Pattern</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{config.manufacturer}</td>
                  <td className="px-4 py-3 text-gray-700">{config.cameraModel || <span className="text-gray-400 italic">Generic</span>}</td>
                  <td className="px-4 py-3 text-gray-700">{config.locationType}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {config.components.length} part(s)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{config.colorPattern || '--'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(config)} className="text-xs text-primary-600 hover:text-primary-800">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(config)} className="text-xs text-red-500 hover:text-red-700">
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

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        title={editingConfig ? 'Edit Mount Config' : 'Add Mount Config'}
        onClose={() => setShowModal(false)}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Manufacturer</label>
              <input
                type="text"
                className="input-field"
                value={form.manufacturer}
                onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Camera Model (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Leave blank for generic"
                value={form.cameraModel}
                onChange={(e) => setForm((f) => ({ ...f, cameraModel: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Location Type</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. wall, pole, ceiling"
                value={form.locationType}
                onChange={(e) => setForm((f) => ({ ...f, locationType: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Color Pattern</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. -W for white, -B for black"
                value={form.colorPattern}
                onChange={(e) => setForm((f) => ({ ...f, colorPattern: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Sort Order</label>
            <input
              type="number"
              className="input-field w-24"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="label">Components (JSON array)</label>
            <textarea
              className="input-field font-mono text-xs"
              rows={6}
              placeholder='[{"component": "Wall Mount", "partBase": "WM-100", "description": "Standard wall mount"}]'
              value={form.components}
              onChange={(e) => setForm((f) => ({ ...f, components: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Color Suffix Map (JSON object)</label>
            <textarea
              className="input-field font-mono text-xs"
              rows={3}
              placeholder='{"white": "-W", "black": "-B"}'
              value={form.colorSuffix}
              onChange={(e) => setForm((f) => ({ ...f, colorSuffix: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.manufacturer || !form.locationType}
              className="btn-primary text-sm"
            >
              {saving ? 'Saving...' : editingConfig ? 'Update Config' : 'Create Config'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Mount Config"
        message={`Are you sure you want to delete the "${deleteTarget?.manufacturer} - ${deleteTarget?.locationType}" mount config? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ============================================================
// Tab 3: Reference Data
// ============================================================

function ReferenceDataTab({ showToast }: TabProps) {
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<CalcReferenceDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('');

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CalcReferenceDataItem | null>(null);
  const [form, setForm] = useState({
    category: '',
    key: '',
    label: '',
    data: '{}',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<CalcReferenceDataItem | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await calculatorDataApi.listReference(accessToken, filterCategory || undefined);
      setItems(res.data);
    } catch {
      showToast('Failed to load reference data', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filterCategory, showToast]);

  const loadCategories = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await calculatorDataApi.listReferenceCategories(accessToken);
      setCategories(res.data);
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function openAddModal() {
    setEditingItem(null);
    setForm({ category: '', key: '', label: '', data: '{}', sortOrder: 0 });
    setShowModal(true);
  }

  function openEditModal(item: CalcReferenceDataItem) {
    setEditingItem(item);
    setForm({
      category: item.category,
      key: item.key,
      label: item.label,
      data: JSON.stringify(item.data, null, 2),
      sortOrder: item.sortOrder,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      const parsedData = JSON.parse(form.data);
      const payload = {
        category: form.category,
        key: form.key,
        label: form.label,
        data: parsedData,
        sortOrder: form.sortOrder,
      };

      if (editingItem) {
        await calculatorDataApi.updateReference(accessToken, editingItem.id, payload);
        showToast('Reference data updated', 'success');
      } else {
        await calculatorDataApi.createReference(accessToken, payload);
        showToast('Reference data created', 'success');
      }
      setShowModal(false);
      loadData();
      loadCategories();
    } catch (err) {
      showToast(err instanceof SyntaxError ? 'Invalid JSON format' : 'Failed to save reference data', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !deleteTarget) return;
    try {
      await calculatorDataApi.deleteReference(accessToken, deleteTarget.id);
      showToast('Reference data deleted', 'success');
      setDeleteTarget(null);
      loadData();
    } catch {
      showToast('Failed to delete reference data', 'error');
    }
  }

  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importItems = Array.isArray(parsed) ? parsed : [parsed];
      const res = await calculatorDataApi.bulkImportReference(accessToken, importItems);
      showToast(`Imported ${res.imported} item(s)${res.errors.length > 0 ? `, ${res.errors.length} error(s)` : ''}`, res.errors.length > 0 ? 'error' : 'success');
      loadData();
      loadCategories();
    } catch {
      showToast('Failed to parse or import JSON file', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function truncateJson(data: Record<string, unknown>): string {
    const str = JSON.stringify(data);
    return str.length > 60 ? str.slice(0, 60) + '...' : str;
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} reference item(s)</p>
        <div className="flex gap-2">
          <label className="btn-secondary text-sm cursor-pointer">
            Upload JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleBulkImport}
              className="hidden"
            />
          </label>
          <button onClick={openAddModal} className="btn-primary text-sm">
            Add Entry
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-4">
        <select
          className="input-field max-w-xs"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading reference data...</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">No reference data found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Key</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Label</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.key}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-xs truncate">{truncateJson(item.data)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(item)} className="text-xs text-primary-600 hover:text-primary-800">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(item)} className="text-xs text-red-500 hover:text-red-700">
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

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        title={editingItem ? 'Edit Reference Data' : 'Add Reference Data'}
        onClose={() => setShowModal(false)}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. camera_power_type, smart_codec"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
              {categories.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Existing: {categories.join(', ')}
                </p>
              )}
            </div>
            <div>
              <label className="label">Key</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. poe_plus, h265"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Label</label>
              <input
                type="text"
                className="input-field"
                placeholder="Human-readable label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input
                type="number"
                className="input-field"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Data (JSON)</label>
            <textarea
              className="input-field font-mono text-xs"
              rows={8}
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.category || !form.key || !form.label}
              className="btn-primary text-sm"
            >
              {saving ? 'Saving...' : editingItem ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Reference Data"
        message={`Are you sure you want to delete "${deleteTarget?.category} / ${deleteTarget?.key}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ============================================================
// Tab 4: Compliance Rules
// ============================================================

const FLAG_LABELS: { key: keyof ComplianceJurisdictionData; label: string }[] = [
  { key: 'maglockRequiresPirRex', label: 'Maglock PIR REX' },
  { key: 'maglockRequiresPneumaticPte', label: 'Maglock Pneumatic PTE' },
  { key: 'fireRatedFailSafeRequired', label: 'Fire-Rated Fail-Safe' },
  { key: 'fireRatedCloserRequired', label: 'Fire-Rated Closer' },
  { key: 'facpTieInRequired', label: 'FACP Tie-In' },
  { key: 'stairwellReIlluminationRequired', label: 'Stairwell Re-illumination' },
  { key: 'panicHardwareOnEgressDoors', label: 'Panic Hardware Egress' },
];

function ComplianceRulesTab({ showToast }: TabProps) {
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jurisdictions, setJurisdictions] = useState<ComplianceJurisdictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingJurisdiction, setEditingJurisdiction] = useState<ComplianceJurisdictionData | null>(null);
  const [form, setForm] = useState({
    stateLabel: '',
    code: '',
    authority: '',
    adoptedCodes: '',
    maglockRequiresPirRex: false,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: false,
    panicHardwareOnEgressDoors: true,
    additionalNotes: '',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ComplianceJurisdictionData | null>(null);

  const loadJurisdictions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await calculatorDataApi.listJurisdictions(accessToken);
      setJurisdictions(res.data);
    } catch {
      showToast('Failed to load jurisdictions', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    loadJurisdictions();
  }, [loadJurisdictions]);

  function openAddModal() {
    setEditingJurisdiction(null);
    setForm({
      stateLabel: '',
      code: '',
      authority: '',
      adoptedCodes: '',
      maglockRequiresPirRex: false,
      maglockRequiresPneumaticPte: false,
      fireRatedFailSafeRequired: true,
      fireRatedCloserRequired: true,
      facpTieInRequired: true,
      stairwellReIlluminationRequired: false,
      panicHardwareOnEgressDoors: true,
      additionalNotes: '',
      sortOrder: 0,
    });
    setShowModal(true);
  }

  function openEditModal(j: ComplianceJurisdictionData) {
    setEditingJurisdiction(j);
    setForm({
      stateLabel: j.stateLabel,
      code: j.code,
      authority: j.authority,
      adoptedCodes: j.adoptedCodes.join(', '),
      maglockRequiresPirRex: j.maglockRequiresPirRex,
      maglockRequiresPneumaticPte: j.maglockRequiresPneumaticPte,
      fireRatedFailSafeRequired: j.fireRatedFailSafeRequired,
      fireRatedCloserRequired: j.fireRatedCloserRequired,
      facpTieInRequired: j.facpTieInRequired,
      stairwellReIlluminationRequired: j.stairwellReIlluminationRequired,
      panicHardwareOnEgressDoors: j.panicHardwareOnEgressDoors,
      additionalNotes: j.additionalNotes.join('\n'),
      sortOrder: j.sortOrder,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      const payload = {
        stateLabel: form.stateLabel,
        code: form.code,
        authority: form.authority,
        adoptedCodes: form.adoptedCodes.split(',').map((s) => s.trim()).filter(Boolean),
        maglockRequiresPirRex: form.maglockRequiresPirRex,
        maglockRequiresPneumaticPte: form.maglockRequiresPneumaticPte,
        fireRatedFailSafeRequired: form.fireRatedFailSafeRequired,
        fireRatedCloserRequired: form.fireRatedCloserRequired,
        facpTieInRequired: form.facpTieInRequired,
        stairwellReIlluminationRequired: form.stairwellReIlluminationRequired,
        panicHardwareOnEgressDoors: form.panicHardwareOnEgressDoors,
        additionalNotes: form.additionalNotes.split('\n').map((s) => s.trim()).filter(Boolean),
        sortOrder: form.sortOrder,
      };

      if (editingJurisdiction) {
        await calculatorDataApi.updateJurisdiction(accessToken, editingJurisdiction.id, payload);
        showToast('Jurisdiction updated', 'success');
      } else {
        await calculatorDataApi.createJurisdiction(accessToken, payload);
        showToast('Jurisdiction created', 'success');
      }
      setShowModal(false);
      loadJurisdictions();
    } catch {
      showToast('Failed to save jurisdiction', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !deleteTarget) return;
    try {
      await calculatorDataApi.deleteJurisdiction(accessToken, deleteTarget.id);
      showToast('Jurisdiction deleted', 'success');
      setDeleteTarget(null);
      if (expandedId === deleteTarget.id) setExpandedId(null);
      loadJurisdictions();
    } catch {
      showToast('Failed to delete jurisdiction', 'error');
    }
  }

  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importItems = Array.isArray(parsed) ? parsed : [parsed];
      const res = await calculatorDataApi.bulkImportJurisdictions(accessToken, importItems);
      showToast(`Imported ${res.imported} jurisdiction(s)${res.errors.length > 0 ? `, ${res.errors.length} error(s)` : ''}`, res.errors.length > 0 ? 'error' : 'success');
      loadJurisdictions();
    } catch {
      showToast('Failed to parse or import JSON file', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleExport() {
    if (!accessToken) return;
    try {
      const res = await calculatorDataApi.exportJurisdictions(accessToken);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-jurisdictions-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export downloaded', 'success');
    } catch {
      showToast('Failed to export jurisdictions', 'error');
    }
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{jurisdictions.length} jurisdiction(s)</p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm">
            Export JSON
          </button>
          <label className="btn-secondary text-sm cursor-pointer">
            Upload JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleBulkImport}
              className="hidden"
            />
          </label>
          <button onClick={openAddModal} className="btn-primary text-sm">
            Add Jurisdiction
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading jurisdictions...</div>
      ) : jurisdictions.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">No compliance jurisdictions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jurisdictions.map((j) => (
            <div key={j.id} className="card">
              <button
                onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-medium text-gray-900 text-sm whitespace-nowrap">{j.stateLabel}</span>
                  <span className="text-xs text-gray-400 font-mono">{j.code}</span>
                  <span className="text-sm text-gray-500 truncate">{j.authority}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-4 shrink-0">
                  {FLAG_LABELS.map(({ key, label }) => (
                    <span
                      key={key}
                      title={label}
                      className={`inline-flex w-2 h-2 rounded-full ${
                        j[key] ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(j); }}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(j); }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ml-2 ${expandedId === j.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === j.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">Adopted Codes</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {j.adoptedCodes.length > 0 ? j.adoptedCodes.map((code, i) => (
                          <span key={i} className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {code}
                          </span>
                        )) : (
                          <span className="text-xs text-gray-400">None specified</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">Sort Order</span>
                      <p className="text-sm text-gray-700 mt-0.5">{j.sortOrder}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Compliance Flags</span>
                    <div className="grid grid-cols-2 gap-2">
                      {FLAG_LABELS.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            j[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {j[key] ? 'Required' : 'Not Required'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {j.additionalNotes.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">Additional Notes</span>
                      <div className="mt-1 space-y-1">
                        {j.additionalNotes.map((note, i) => (
                          <p key={i} className="text-sm text-gray-600">-- {note}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        title={editingJurisdiction ? 'Edit Jurisdiction' : 'Add Jurisdiction'}
        onClose={() => setShowModal(false)}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">State Label</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Florida"
                value={form.stateLabel}
                onChange={(e) => setForm((f) => ({ ...f, stateLabel: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Code</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. FL"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Authority</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Florida State Fire Marshal"
              value={form.authority}
              onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Adopted Codes (comma-separated)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. IFC 2021, NFPA 101"
              value={form.adoptedCodes}
              onChange={(e) => setForm((f) => ({ ...f, adoptedCodes: e.target.value }))}
            />
          </div>

          <div>
            <span className="label">Compliance Flags</span>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {([
                { key: 'maglockRequiresPirRex', label: 'Maglock Requires PIR REX' },
                { key: 'maglockRequiresPneumaticPte', label: 'Maglock Requires Pneumatic PTE' },
                { key: 'fireRatedFailSafeRequired', label: 'Fire-Rated Fail-Safe Required' },
                { key: 'fireRatedCloserRequired', label: 'Fire-Rated Closer Required' },
                { key: 'facpTieInRequired', label: 'FACP Tie-In Required' },
                { key: 'stairwellReIlluminationRequired', label: 'Stairwell Re-illumination Required' },
                { key: 'panicHardwareOnEgressDoors', label: 'Panic Hardware on Egress Doors' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`flag-${key}`}
                    checked={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`flag-${key}`} className="text-sm text-gray-700">{label}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Additional Notes (one per line)</label>
              <textarea
                className="input-field text-sm"
                rows={4}
                placeholder="Enter notes, one per line"
                value={form.additionalNotes}
                onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input
                type="number"
                className="input-field"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.stateLabel || !form.code || !form.authority}
              className="btn-primary text-sm"
            >
              {saving ? 'Saving...' : editingJurisdiction ? 'Update Jurisdiction' : 'Create Jurisdiction'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Jurisdiction"
        message={`Are you sure you want to delete "${deleteTarget?.stateLabel} (${deleteTarget?.code})"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
