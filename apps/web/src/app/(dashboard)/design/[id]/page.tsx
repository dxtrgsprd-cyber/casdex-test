'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  designsApi,
  devicesApi,
  DesignDetail,
  PlacedDeviceData,
  Device,
  HardwareSchedule,
  SOW,
} from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  exported: 'Exported',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  exported: 'bg-purple-100 text-purple-700',
};

const NEXT_STATUS: Record<string, { label: string; status: string } | null> = {
  draft: { label: 'Start Work', status: 'in_progress' },
  in_progress: { label: 'Mark Complete', status: 'completed' },
  completed: { label: 'Mark Exported', status: 'exported' },
  exported: null,
};

const CATEGORY_LABELS: Record<string, string> = {
  camera: 'Camera',
  access_control: 'Access Control',
  networking: 'Networking',
  av: 'Audio / Video',
  sensor: 'Sensor',
  mount: 'Mount',
  accessory: 'Accessory',
};

type TabType = 'devices' | 'hardware-schedule' | 'sow';

export default function DesignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const designId = params.id as string;
  const { accessToken, roles } = useAuthStore();

  const [design, setDesign] = useState<DesignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('devices');

  const canManage = roles.includes('admin') || roles.includes('manager') || roles.includes('presales');

  const loadDesign = useCallback(async () => {
    if (!accessToken || !designId) return;
    setLoading(true);
    try {
      const res = await designsApi.get(accessToken, designId);
      setDesign(res.data);
    } catch {
      router.push('/design');
    } finally {
      setLoading(false);
    }
  }, [accessToken, designId, router]);

  useEffect(() => {
    loadDesign();
  }, [loadDesign]);

  async function handleStatusChange(status: string) {
    if (!accessToken || !design) return;
    try {
      await designsApi.changeStatus(accessToken, design.id, status);
      loadDesign();
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">Loading design...</div>
    );
  }

  if (!design) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">Design not found</div>
    );
  }

  const nextStatus = NEXT_STATUS[design.status];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => router.push('/design')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Designs
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">{design.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{design.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[design.status]}`}>
                {STATUS_LABELS[design.status]}
              </span>
              <span className="text-sm text-gray-400">V{design.version}</span>
              {design.opportunity && (
                <span className="text-sm text-gray-500">
                  <span className="font-mono text-xs text-gray-400">{design.opportunity.oppNumber}</span>
                  <span className="ml-1">{design.opportunity.customerName}</span>
                </span>
              )}
              <span className="text-xs text-gray-400">
                {design.placedDevices.length} devices
              </span>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              {design.status !== 'draft' && (
                <button
                  onClick={() => handleStatusChange(design.status === 'in_progress' ? 'draft' : 'in_progress')}
                  className="btn-secondary text-sm"
                >
                  Revert to {design.status === 'in_progress' ? 'Draft' : 'In Progress'}
                </button>
              )}
              {nextStatus && (
                <button
                  onClick={() => handleStatusChange(nextStatus.status)}
                  className="btn-primary text-sm"
                >
                  {nextStatus.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {[
            { key: 'devices' as TabType, label: 'Devices' },
            { key: 'hardware-schedule' as TabType, label: 'Hardware Schedule' },
            { key: 'sow' as TabType, label: 'Statement of Work' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'devices' && (
        <DevicesTab
          design={design}
          canManage={canManage}
          onRefresh={loadDesign}
        />
      )}
      {tab === 'hardware-schedule' && (
        <HardwareScheduleTab designId={design.id} />
      )}
      {tab === 'sow' && (
        <SOWTab designId={design.id} />
      )}
    </div>
  );
}

// ===== Devices Tab =====

function DevicesTab({
  design,
  canManage,
  onRefresh,
}: {
  design: DesignDetail;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PlacedDeviceData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Group placed devices by area > floor > room
  const grouped = groupDevicesByLocation(design.placedDevices);

  async function handleRemove(placedDeviceId: string) {
    if (!accessToken) return;
    try {
      await designsApi.removeDevice(accessToken, design.id, placedDeviceId);
      setDeleteConfirm(null);
      onRefresh();
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4">
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
            Add Device
          </button>
        </div>
      )}

      {design.placedDevices.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No devices in this design yet</p>
          {canManage && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
              Add First Device
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((area) => (
            <div key={area.area} className="card overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-semibold text-sm text-gray-800">{area.area}</h3>
              </div>
              {area.floors.map((floor) => (
                <div key={floor.floor}>
                  {floor.floor !== area.area && (
                    <div className="px-4 py-1.5 bg-gray-25 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {floor.floor}
                      </span>
                    </div>
                  )}
                  {floor.rooms.map((room) => (
                    <div key={room.room}>
                      {room.room !== floor.floor && (
                        <div className="px-6 py-1 border-b border-gray-50">
                          <span className="text-xs text-gray-400">{room.room}</span>
                        </div>
                      )}
                      {room.devices.map((pd) => (
                        <div
                          key={pd.id}
                          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {pd.device?.manufacturer} {pd.device?.model}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                <span className="font-mono">{pd.device?.partNumber}</span>
                                <span className="capitalize">
                                  {CATEGORY_LABELS[pd.device?.category || ''] || pd.device?.category}
                                </span>
                                {pd.fovAngle != null && <span>FOV: {pd.fovAngle} deg</span>}
                                {pd.fovDistance != null && <span>Dist: {pd.fovDistance} ft</span>}
                                {pd.cameraHeight != null && <span>Height: {pd.cameraHeight} ft</span>}
                              </div>
                              {pd.notes && (
                                <p className="text-xs text-gray-400 mt-1">{pd.notes}</p>
                              )}
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              <button
                                onClick={() => setEditingDevice(pd)}
                                className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(pd.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <AddDeviceModal
          designId={design.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            onRefresh();
          }}
        />
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <EditDeviceModal
          designId={design.id}
          placedDevice={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSaved={() => {
            setEditingDevice(null);
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Device</h3>
            <p className="text-sm text-gray-600 mb-4">
              Remove this device from the design?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                onClick={() => handleRemove(deleteConfirm)}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Add Device Modal =====

function AddDeviceModal({
  designId,
  onClose,
  onAdded,
}: {
  designId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [step, setStep] = useState<'select' | 'configure'>('select');

  // Device selection
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMfr, setFilterMfr] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Placement config
  const [area, setArea] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [fovAngle, setFovAngle] = useState('');
  const [fovDistance, setFovDistance] = useState('');
  const [cameraHeight, setCameraHeight] = useState('');
  const [tilt, setTilt] = useState('');
  const [notes, setNotes] = useState('');
  const [installDetails, setInstallDetails] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDevices = useCallback(async () => {
    if (!accessToken) return;
    setLoadingDevices(true);
    try {
      const query: Record<string, string> = { status: 'active' };
      if (searchTerm) query.search = searchTerm;
      if (filterCat) query.category = filterCat;
      if (filterMfr) query.manufacturer = filterMfr;
      const res = await devicesApi.list(accessToken, query);
      setDevices(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingDevices(false);
    }
  }, [accessToken, searchTerm, filterCat, filterMfr]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (!accessToken) return;
    devicesApi.manufacturers(accessToken).then((res) => setManufacturers(res.data)).catch(() => {});
  }, [accessToken]);

  function selectDevice(device: Device) {
    setSelectedDevice(device);
    setFovAngle(device.hfov != null ? String(device.hfov) : '');
    setFovDistance(device.maxDistance != null ? String(device.maxDistance) : '');
    setStep('configure');
  }

  async function handleAdd() {
    if (!accessToken || !selectedDevice) return;
    setSaving(true);
    setError('');
    try {
      // Add the specified quantity of devices
      for (let i = 0; i < quantity; i++) {
        await designsApi.addDevice(accessToken, designId, {
          deviceId: selectedDevice.id,
          area: area || undefined,
          floor: floor || undefined,
          room: room || undefined,
          fovAngle: fovAngle ? Number(fovAngle) : undefined,
          fovDistance: fovDistance ? Number(fovDistance) : undefined,
          cameraHeight: cameraHeight ? Number(cameraHeight) : undefined,
          tilt: tilt ? Number(tilt) : undefined,
          notes: notes || undefined,
          installDetails: installDetails || undefined,
        });
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add device');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'select' ? 'Select Device from Library' : `Configure: ${selectedDevice?.manufacturer} ${selectedDevice?.model}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>

        {step === 'select' ? (
          <div className="p-6">
            {/* Search/Filter */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="Search devices..."
                className="input-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <select
                className="input-field"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
              >
                <option value="">All Categories</option>
                {['camera', 'access_control', 'networking', 'av', 'sensor', 'mount', 'accessory'].map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <select
                className="input-field"
                value={filterMfr}
                onChange={(e) => setFilterMfr(e.target.value)}
              >
                <option value="">All Manufacturers</option>
                {manufacturers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Device list */}
            <div className="border rounded max-h-96 overflow-y-auto">
              {loadingDevices ? (
                <div className="p-4 text-center text-sm text-gray-400">Loading devices...</div>
              ) : devices.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No devices found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Manufacturer</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Model</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Part #</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Res.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => selectDevice(d)}
                        className="border-b border-gray-100 hover:bg-primary-50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2 font-medium text-gray-900">{d.manufacturer}</td>
                        <td className="px-3 py-2 text-gray-700">{d.model}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono text-xs">{d.partNumber}</td>
                        <td className="px-3 py-2 text-gray-500 capitalize">{CATEGORY_LABELS[d.category] || d.category}</td>
                        <td className="px-3 py-2 text-gray-500">{d.resolution || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setStep('select')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Change device
              </button>
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Area</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Building A"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Floor</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Floor 1"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Room</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Main Lobby"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>
            </div>

            {/* Camera specs */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="label">FOV Angle (deg)</label>
                <input
                  type="number"
                  className="input-field"
                  value={fovAngle}
                  onChange={(e) => setFovAngle(e.target.value)}
                />
              </div>
              <div>
                <label className="label">FOV Distance (ft)</label>
                <input
                  type="number"
                  className="input-field"
                  value={fovDistance}
                  onChange={(e) => setFovDistance(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Camera Height (ft)</label>
                <input
                  type="number"
                  className="input-field"
                  value={cameraHeight}
                  onChange={(e) => setCameraHeight(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Tilt (deg)</label>
                <input
                  type="number"
                  className="input-field"
                  value={tilt}
                  onChange={(e) => setTilt(e.target.value)}
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="w-32">
              <label className="label">Quantity</label>
              <input
                type="number"
                className="input-field"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Camera coverage notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Install Details</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Installation requirements..."
                  value={installDetails}
                  onChange={(e) => setInstallDetails(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary text-sm">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Adding...' : `Add ${quantity > 1 ? `${quantity} Devices` : 'Device'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Edit Device Modal =====

function EditDeviceModal({
  designId,
  placedDevice,
  onClose,
  onSaved,
}: {
  designId: string;
  placedDevice: PlacedDeviceData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [area, setArea] = useState(placedDevice.area || '');
  const [floor, setFloor] = useState(placedDevice.floor || '');
  const [room, setRoom] = useState(placedDevice.room || '');
  const [fovAngle, setFovAngle] = useState(placedDevice.fovAngle != null ? String(placedDevice.fovAngle) : '');
  const [fovDistance, setFovDistance] = useState(placedDevice.fovDistance != null ? String(placedDevice.fovDistance) : '');
  const [cameraHeight, setCameraHeight] = useState(placedDevice.cameraHeight != null ? String(placedDevice.cameraHeight) : '');
  const [tilt, setTilt] = useState(placedDevice.tilt != null ? String(placedDevice.tilt) : '');
  const [notes, setNotes] = useState(placedDevice.notes || '');
  const [installDetails, setInstallDetails] = useState(placedDevice.installDetails || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      await designsApi.updateDevice(accessToken, designId, placedDevice.id, {
        area: area || undefined,
        floor: floor || undefined,
        room: room || undefined,
        fovAngle: fovAngle ? Number(fovAngle) : undefined,
        fovDistance: fovDistance ? Number(fovDistance) : undefined,
        cameraHeight: cameraHeight ? Number(cameraHeight) : undefined,
        tilt: tilt ? Number(tilt) : undefined,
        notes: notes || undefined,
        installDetails: installDetails || undefined,
      } as Partial<PlacedDeviceData>);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit: {placedDevice.device?.manufacturer} {placedDevice.device?.model}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Area</label>
              <input type="text" className="input-field" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
            <div>
              <label className="label">Floor</label>
              <input type="text" className="input-field" value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
            <div>
              <label className="label">Room</label>
              <input type="text" className="input-field" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label">FOV Angle (deg)</label>
              <input type="number" className="input-field" value={fovAngle} onChange={(e) => setFovAngle(e.target.value)} />
            </div>
            <div>
              <label className="label">FOV Distance (ft)</label>
              <input type="number" className="input-field" value={fovDistance} onChange={(e) => setFovDistance(e.target.value)} />
            </div>
            <div>
              <label className="label">Camera Height (ft)</label>
              <input type="number" className="input-field" value={cameraHeight} onChange={(e) => setCameraHeight(e.target.value)} />
            </div>
            <div>
              <label className="label">Tilt (deg)</label>
              <input type="number" className="input-field" value={tilt} onChange={(e) => setTilt(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="label">Install Details</label>
              <textarea className="input-field" rows={2} value={installDetails} onChange={(e) => setInstallDetails(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Hardware Schedule Tab =====

function HardwareScheduleTab({ designId }: { designId: string }) {
  const { accessToken } = useAuthStore();
  const [schedule, setSchedule] = useState<HardwareSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    designsApi
      .hardwareSchedule(accessToken, designId)
      .then((res) => setSchedule(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, designId]);

  if (loading) return <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>;
  if (!schedule) return <div className="card p-8 text-center text-sm text-gray-500">Failed to load hardware schedule</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="card p-4 flex items-center gap-8">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Total Devices</span>
          <p className="text-xl font-bold text-gray-900">{schedule.totalDevices}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Unique Models</span>
          <p className="text-xl font-bold text-gray-900">{schedule.uniqueDevices}</p>
        </div>
      </div>

      {/* Table */}
      {schedule.items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          No devices in this design
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Manufacturer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Model</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Part Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Areas</th>
              </tr>
            </thead>
            <tbody>
              {schedule.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-bold text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-700">{item.manufacturer}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.model}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.partNumber}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {CATEGORY_LABELS[item.category] || item.category}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{item.areas.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== SOW Tab =====

function SOWTab({ designId }: { designId: string }) {
  const { accessToken } = useAuthStore();
  const [sow, setSOW] = useState<SOW | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    designsApi
      .sow(accessToken, designId)
      .then((res) => setSOW(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, designId]);

  if (loading) return <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>;
  if (!sow) return <div className="card p-8 text-center text-sm text-gray-500">Failed to load statement of work</div>;

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Design</span>
            <p className="font-medium text-gray-900">{sow.designName} V{sow.version}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Created By</span>
            <p className="text-gray-700">{sow.createdBy}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Total Devices</span>
            <p className="font-bold text-gray-900">{sow.totalDevices}</p>
          </div>
          {sow.opportunity && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Project</span>
              <p className="text-gray-700">{sow.opportunity.customerName} - {sow.opportunity.projectName}</p>
              {sow.opportunity.installAddress && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {sow.opportunity.installAddress}, {sow.opportunity.installCity} {sow.opportunity.installState} {sow.opportunity.installZip}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Areas breakdown */}
      {sow.areas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          No devices placed in this design
        </div>
      ) : (
        sow.areas.map((area) => (
          <div key={area.area} className="card overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2">
              <h3 className="font-semibold text-sm">{area.area}</h3>
            </div>

            {area.floors.map((floor) => (
              <div key={floor.floor}>
                <div className="bg-gray-100 px-4 py-1.5 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {floor.floor}
                  </span>
                </div>

                {floor.rooms.map((room) => (
                  <div key={room.room} className="border-b border-gray-100 last:border-0">
                    <div className="px-4 py-1.5 bg-gray-50">
                      <span className="text-xs font-medium text-gray-500">{room.room}</span>
                    </div>

                    {room.devices.map((device) => (
                      <div
                        key={device.id}
                        className="px-6 py-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {device.manufacturer} {device.model}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{device.partNumber}</p>
                          </div>
                          <span className="text-xs text-gray-400 capitalize">
                            {CATEGORY_LABELS[device.category] || device.category}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                          {device.cameraHeight != null && (
                            <div>
                              <span className="text-gray-400">Height:</span>{' '}
                              <span className="text-gray-600">{device.cameraHeight} ft</span>
                            </div>
                          )}
                          {device.fovAngle != null && (
                            <div>
                              <span className="text-gray-400">FOV:</span>{' '}
                              <span className="text-gray-600">{device.fovAngle} deg</span>
                            </div>
                          )}
                          {device.fovDistance != null && (
                            <div>
                              <span className="text-gray-400">Distance:</span>{' '}
                              <span className="text-gray-600">{device.fovDistance} ft</span>
                            </div>
                          )}
                          {device.tilt != null && (
                            <div>
                              <span className="text-gray-400">Tilt:</span>{' '}
                              <span className="text-gray-600">{device.tilt} deg</span>
                            </div>
                          )}
                        </div>

                        {device.notes && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Notes:</span> {device.notes}
                          </p>
                        )}
                        {device.installDetails && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-medium">Install:</span> {device.installDetails}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ===== Helpers =====

interface GroupedArea {
  area: string;
  floors: {
    floor: string;
    rooms: {
      room: string;
      devices: PlacedDeviceData[];
    }[];
  }[];
}

function groupDevicesByLocation(devices: PlacedDeviceData[]): GroupedArea[] {
  const areaMap = new Map<string, Map<string, Map<string, PlacedDeviceData[]>>>();

  for (const pd of devices) {
    const areaKey = pd.area || 'Unassigned';
    const floorKey = pd.floor || 'Unassigned';
    const roomKey = pd.room || 'Unassigned';

    if (!areaMap.has(areaKey)) areaMap.set(areaKey, new Map());
    const floors = areaMap.get(areaKey)!;
    if (!floors.has(floorKey)) floors.set(floorKey, new Map());
    const rooms = floors.get(floorKey)!;
    if (!rooms.has(roomKey)) rooms.set(roomKey, []);
    rooms.get(roomKey)!.push(pd);
  }

  return Array.from(areaMap.entries()).map(([area, floors]) => ({
    area,
    floors: Array.from(floors.entries()).map(([floor, rooms]) => ({
      floor,
      rooms: Array.from(rooms.entries()).map(([room, devices]) => ({
        room,
        devices,
      })),
    })),
  }));
}
