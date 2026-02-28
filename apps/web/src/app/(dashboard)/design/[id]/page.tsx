'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  designsApi,
  devicesApi,
  oppsApi,
  DesignDetail,
  PlacedDeviceData,
  Device,
  Opportunity,
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

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-700 bg-green-100',
  medium: 'text-amber-700 bg-amber-100',
  high: 'text-red-700 bg-red-100',
  critical: 'text-red-900 bg-red-200',
};

type TabType = 'devices' | 'hardware-schedule' | 'sow';

// ============================================================
// FOV Analysis (embedded from FOV Calculator engine)
// ============================================================

interface FovSensorSpec { resW: number; resH: number; sW: number; sH: number; }
const DESIGN_FOV_DB: Record<string, Record<string, FovSensorSpec>> = {
  Hanwha: {
    'PNM-C12083RVD': { resW: 3328, resH: 1872, sW: 5.1, sH: 2.9 },
    'XND-8082RV': { resW: 3072, resH: 1728, sW: 5.1, sH: 2.9 },
    'XNO-9083R': { resW: 3840, resH: 2160, sW: 5.8, sH: 3.2 },
    'XND-6083RV': { resW: 2048, resH: 1536, sW: 4.8, sH: 3.6 },
    'XNV-8082R': { resW: 3072, resH: 1728, sW: 5.1, sH: 2.9 },
    'PNM-9322VQP': { resW: 2560, resH: 1440, sW: 5.1, sH: 2.9 },
  },
  Axis: {
    'P3268-LVE': { resW: 3840, resH: 2160, sW: 5.8, sH: 3.2 },
    'Q1656': { resW: 2688, resH: 1512, sW: 5.3, sH: 3.0 },
    'M3116-LVE': { resW: 2688, resH: 1512, sW: 5.3, sH: 3.0 },
    'P3265-LVE': { resW: 1920, resH: 1080, sW: 4.8, sH: 2.7 },
    'Q6135-LE': { resW: 1920, resH: 1080, sW: 4.8, sH: 2.7 },
  },
};
const DEFAULT_SENSOR: FovSensorSpec = { resW: 3072, resH: 1728, sW: 5.1, sH: 2.9 };
const PPF_OPTIONS = [
  { value: 76, label: 'Identification (76 PPF)' },
  { value: 38, label: 'Recognition (38 PPF)' },
  { value: 19, label: 'Observation (19 PPF)' },
  { value: 10, label: 'Detection (10 PPF)' },
];
function calcFovAnalysis(sensor: FovSensorSpec, heightFt: number, distFt: number, ppf: number) {
  const slope = Math.sqrt(heightFt * heightFt + distFt * distFt);
  const reqWidth = sensor.resW / ppf;
  const focal = (sensor.sW * slope) / reqWidth;
  const tiltDeg = Math.atan(heightFt / distFt) * (180 / Math.PI);
  const vfov = 2 * Math.atan(sensor.sH / (2 * focal)) * (180 / Math.PI);
  const hfov = 2 * Math.atan(sensor.sW / (2 * focal)) * (180 / Math.PI);
  const lowerEdge = tiltDeg + vfov / 2;
  const blindSpot = lowerEdge < 90 ? heightFt / Math.tan(lowerEdge * Math.PI / 180) : 0;
  const quality = tiltDeg <= 30 ? 'OPTIMAL' : 'OVERVIEW';
  return { focal, tiltDeg, hfov, vfov, blindSpot, quality, slope };
}

// ============================================================
// Mount BOM (embedded from Mounting Calculator engine)
// ============================================================

type MountLocation = 'Wall' | 'Corner' | 'Pole' | 'Flush';
interface MountBomLine { component: string; partBase: string; desc: string; }
interface MfrMountDb { generic: Record<string, MountBomLine[]>; models: Record<string, Record<string, MountBomLine[]>>; suffix: Record<string, string>; }
const DESIGN_MOUNT_DB: Record<string, MfrMountDb> = {
  Hanwha: {
    generic: {
      Wall: [{ component: 'Adapter', partBase: 'SBP-300WM', desc: 'Wall Mount' }, { component: 'Bracket', partBase: 'SBP-300NB', desc: 'Wall Bracket' }],
      Corner: [{ component: 'Adapter', partBase: 'SBP-300WM', desc: 'Wall Mount' }, { component: 'Bracket', partBase: 'SBP-300NC', desc: 'Corner Bracket' }],
      Pole: [{ component: 'Adapter', partBase: 'SBP-300WM', desc: 'Wall Mount' }, { component: 'Bracket', partBase: 'SBP-300NP', desc: 'Pole Bracket' }],
      Flush: [{ component: 'Adapter', partBase: 'SBP-300CM', desc: 'Flush Mount' }],
    },
    models: {
      'PNM-C12083RVD': {
        Wall: [{ component: 'Adapter', partBase: 'SBP-300WM', desc: 'Wall Mount' }, { component: 'Bracket', partBase: 'SBP-302CM', desc: 'Multi-Sensor Bracket' }],
      },
    },
    suffix: { White: 'W1', Black: 'B1' },
  },
  Axis: {
    generic: {
      Wall: [{ component: 'Adapter', partBase: 'T91B61', desc: 'Wall Bracket' }, { component: 'Bracket', partBase: 'T94N01D', desc: 'Pendant Kit' }],
      Corner: [{ component: 'Adapter', partBase: 'T91B61', desc: 'Wall Bracket' }, { component: 'Bracket', partBase: 'T94N01D', desc: 'Pendant Kit' }, { component: 'Corner', partBase: 'T91A67', desc: 'Corner Bracket' }],
      Pole: [{ component: 'Adapter', partBase: 'T91B61', desc: 'Wall Bracket' }, { component: 'Bracket', partBase: 'T91A47', desc: 'Pole Adapter' }],
      Flush: [{ component: 'Adapter', partBase: 'T94F01S', desc: 'Flush Mount' }],
    },
    models: {},
    suffix: { White: ' White', Black: ' Black' },
  },
};
function getMountBom(manufacturer: string, model: string, location: MountLocation): { component: string; partNumber: string; desc: string }[] {
  const db = DESIGN_MOUNT_DB[manufacturer];
  if (!db) return [];
  const entries = db.models[model]?.[location] || db.generic[location];
  if (!entries) return [];
  const sfx = db.suffix['White'] || '';
  return entries.map((e) => ({ component: e.component, partNumber: e.partBase + sfx, desc: e.desc }));
}

export default function DesignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const designId = params.id as string;
  const { accessToken, roles } = useAuthStore();

  const [design, setDesign] = useState<DesignDetail | null>(null);
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('devices');

  const canManage = roles.includes('admin') || roles.includes('manager') || roles.includes('presales');

  const loadDesign = useCallback(async () => {
    if (!accessToken || !designId) return;
    setLoading(true);
    try {
      const res = await designsApi.get(accessToken, designId);
      setDesign(res.data);
      if (res.data.oppId) {
        try {
          const oppRes = await oppsApi.get(accessToken, res.data.oppId);
          setOpp(oppRes.data);
        } catch {
          setOpp(null);
        }
      }
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

  // Dashboard calculations
  const cameraCount = design.placedDevices.filter((pd) => pd.device?.category === 'camera').length;
  const accessControlCount = design.placedDevices.filter((pd) => pd.device?.category === 'access_control').length;
  const avCount = design.placedDevices.filter((pd) => pd.device?.category === 'av').length;

  const nonNdaaDevices = design.placedDevices.filter((pd) => pd.device && !pd.device.ndaaCompliant);
  const allNdaaCompliant = nonNdaaDevices.length === 0 && design.placedDevices.length > 0;

  const categoryGroups: Record<string, number> = {};
  design.placedDevices.forEach((pd) => {
    const cat = pd.device?.category || 'unknown';
    categoryGroups[cat] = (categoryGroups[cat] || 0) + 1;
  });

  const latestRisk = opp?.riskAssessments?.[0] || null;

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
              <span className="text-xs text-gray-400">
                {design.placedDevices.length} devices
              </span>
              {!allNdaaCompliant && design.placedDevices.length > 0 && (
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  {nonNdaaDevices.length} Non-NDAA Device{nonNdaaDevices.length > 1 ? 's' : ''}
                </span>
              )}
              {allNdaaCompliant && (
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  NDAA Compliant
                </span>
              )}
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

      {/* OPP Header */}
      {opp ? (
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">OPP Number</span>
              <p className="font-mono font-medium text-gray-900">{opp.oppNumber}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Project Name</span>
              <p className="text-gray-700">{opp.projectName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Customer</span>
              <p className="text-gray-700">{opp.customerName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Address</span>
              <p className="text-gray-700">
                {opp.installAddress
                  ? `${opp.installAddress}, ${opp.installCity || ''} ${opp.installState || ''} ${opp.installZip || ''}`
                  : '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">POC</span>
              <p className="text-gray-700">{opp.customerContact || '-'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-3 mb-6 text-sm text-gray-400">
          Standalone Design -- no linked opportunity
        </div>
      )}

      {/* Dashboard Panels (3x2 grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Project Requirements */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project Requirements</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Camera Count</span>
              <span className="font-semibold text-gray-900">{cameraCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Port Count</span>
              <span className="font-semibold text-gray-900">{design.placedDevices.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Devices</span>
              <span className="font-semibold text-gray-900">{design.placedDevices.length}</span>
            </div>
          </div>
        </div>

        {/* Devices by Category */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Devices</h3>
          {Object.keys(categoryGroups).length === 0 ? (
            <p className="text-sm text-gray-400">No devices placed</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(categoryGroups)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-gray-500">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Licenses */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Licenses</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Camera License</span>
              <span className="font-semibold text-gray-900">{cameraCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Door License</span>
              <span className="font-semibold text-gray-900">{accessControlCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Intercom License</span>
              <span className="font-semibold text-gray-900">{avCount}</span>
            </div>
          </div>
        </div>

        {/* Hard Drive Calculation */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hard Drive Calc</h3>
          {cameraCount === 0 ? (
            <p className="text-sm text-gray-400">No cameras placed</p>
          ) : (
            <HardDriveQuickCalc cameraCount={cameraCount} />
          )}
        </div>

        {/* Survey Files */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Survey Files</h3>
          {opp && opp.surveys.length > 0 ? (
            <div className="space-y-2">
              {opp.surveys.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">{s.title}</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                    s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {opp ? 'No surveys found' : 'Link an OPP to see surveys'}
            </p>
          )}
        </div>

        {/* Risk / Presales */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Risk / Presales</h3>
          {latestRisk ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Overall</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{latestRisk.overallScore.toFixed(1)}</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${RISK_COLORS[latestRisk.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                    {latestRisk.riskLevel}
                  </span>
                </div>
              </div>
              {latestRisk.cctvScore != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">CCTV</span>
                  <span className="font-medium text-gray-700">{latestRisk.cctvScore.toFixed(1)}</span>
                </div>
              )}
              {latestRisk.acsScore != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ACS</span>
                  <span className="font-medium text-gray-700">{latestRisk.acsScore.toFixed(1)}</span>
                </div>
              )}
              {latestRisk.installScore != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Install</span>
                  <span className="font-medium text-gray-700">{latestRisk.installScore.toFixed(1)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {opp ? 'No risk assessment' : 'Link an OPP to see risk data'}
            </p>
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
        <DevicesTab design={design} canManage={canManage} onRefresh={loadDesign} />
      )}
      {tab === 'hardware-schedule' && (
        <HardwareScheduleTab designId={design.id} design={design} />
      )}
      {tab === 'sow' && (
        <SOWTab designId={design.id} />
      )}
    </div>
  );
}

// ===== Hard Drive Quick Calc =====

function HardDriveQuickCalc({ cameraCount }: { cameraCount: number }) {
  const bitratePerCam = 5.0 * (15 / 30) * 1.0;
  const totalMbps = bitratePerCam * cameraCount;
  const rawTB = (totalMbps * 3600 * 24 * 30 * 0.5 * 1.15) / 8_000_000;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Est. Storage</span>
        <span className="font-semibold text-gray-900">{rawTB.toFixed(1)} TB</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Bandwidth</span>
        <span className="font-semibold text-gray-900">{totalMbps.toFixed(1)} Mbps</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Estimate: 4MP, 15fps, H.265, 30d, 50% motion
      </p>
      <p className="text-xs text-gray-400">
        Use System Calculator for detailed analysis
      </p>
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
                    <div className="px-4 py-1.5 border-b border-gray-100">
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
                                {pd.device?.ndaaCompliant === false && (
                                  <span className="text-red-600 font-medium">Non-NDAA</span>
                                )}
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

      {showAddModal && (
        <AddDeviceModal
          designId={design.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); onRefresh(); }}
        />
      )}

      {editingDevice && (
        <EditDeviceModal
          designId={design.id}
          placedDevice={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSaved={() => { setEditingDevice(null); onRefresh(); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Device</h3>
            <p className="text-sm text-gray-600 mb-4">Remove this device from the design?</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-sm">Cancel</button>
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

function AddDeviceModal({ designId, onClose, onAdded }: { designId: string; onClose: () => void; onAdded: () => void }) {
  const { accessToken } = useAuthStore();
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMfr, setFilterMfr] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
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

  const loadDeviceList = useCallback(async () => {
    if (!accessToken) return;
    setLoadingDevices(true);
    try {
      const query: Record<string, string> = { status: 'active' };
      if (searchTerm) query.search = searchTerm;
      if (filterCat) query.category = filterCat;
      if (filterMfr) query.manufacturer = filterMfr;
      const res = await devicesApi.list(accessToken, query);
      setDevices(res.data);
    } catch { /* ignore */ } finally { setLoadingDevices(false); }
  }, [accessToken, searchTerm, filterCat, filterMfr]);

  useEffect(() => { loadDeviceList(); }, [loadDeviceList]);
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
      for (let i = 0; i < quantity; i++) {
        await designsApi.addDevice(accessToken, designId, {
          deviceId: selectedDevice.id,
          area: area || undefined, floor: floor || undefined, room: room || undefined,
          fovAngle: fovAngle ? Number(fovAngle) : undefined,
          fovDistance: fovDistance ? Number(fovDistance) : undefined,
          cameraHeight: cameraHeight ? Number(cameraHeight) : undefined,
          tilt: tilt ? Number(tilt) : undefined,
          notes: notes || undefined, installDetails: installDetails || undefined,
        });
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add device');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'select' ? 'Select Device from Library' : `Configure: ${selectedDevice?.manufacturer} ${selectedDevice?.model}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>

        {step === 'select' ? (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <input type="text" placeholder="Search devices..." className="input-field" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
              <select className="input-field" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                <option value="">All Categories</option>
                {['camera', 'access_control', 'networking', 'av', 'sensor', 'mount', 'accessory'].map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <select className="input-field" value={filterMfr} onChange={(e) => setFilterMfr(e.target.value)}>
                <option value="">All Manufacturers</option>
                {manufacturers.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
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
                      <th className="text-left px-3 py-2 font-medium text-gray-600">NDAA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.id} onClick={() => selectDevice(d)} className="border-b border-gray-100 hover:bg-primary-50 cursor-pointer transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-900">{d.manufacturer}</td>
                        <td className="px-3 py-2 text-gray-700">{d.model}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono text-xs">{d.partNumber}</td>
                        <td className="px-3 py-2 text-gray-500 capitalize">{CATEGORY_LABELS[d.category] || d.category}</td>
                        <td className="px-3 py-2 text-gray-500">{d.resolution || '-'}</td>
                        <td className="px-3 py-2">
                          {d.ndaaCompliant ? (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
            {selectedDevice && !selectedDevice.ndaaCompliant && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                Warning: This device is not NDAA compliant.
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setStep('select')} className="text-xs text-gray-400 hover:text-gray-600">Change device</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="label">Area</label><input type="text" className="input-field" placeholder="e.g. Building A" value={area} onChange={(e) => setArea(e.target.value)} /></div>
              <div><label className="label">Floor</label><input type="text" className="input-field" placeholder="e.g. Floor 1" value={floor} onChange={(e) => setFloor(e.target.value)} /></div>
              <div><label className="label">Room</label><input type="text" className="input-field" placeholder="e.g. Main Lobby" value={room} onChange={(e) => setRoom(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div><label className="label">FOV Angle (deg)</label><input type="number" className="input-field" value={fovAngle} onChange={(e) => setFovAngle(e.target.value)} /></div>
              <div><label className="label">FOV Distance (ft)</label><input type="number" className="input-field" value={fovDistance} onChange={(e) => setFovDistance(e.target.value)} /></div>
              <div><label className="label">Camera Height (ft)</label><input type="number" className="input-field" value={cameraHeight} onChange={(e) => setCameraHeight(e.target.value)} /></div>
              <div><label className="label">Tilt (deg)</label><input type="number" className="input-field" value={tilt} onChange={(e) => setTilt(e.target.value)} /></div>
            </div>
            {/* FOV Analysis Panel */}
            {selectedDevice?.category === 'camera' && cameraHeight && fovDistance && (
              <FovAnalysisPanel
                manufacturer={selectedDevice.manufacturer}
                model={selectedDevice.model}
                heightFt={parseFloat(cameraHeight) || 0}
                distanceFt={parseFloat(fovDistance) || 0}
                onApplyTilt={(val) => setTilt(String(val.toFixed(1)))}
                onApplyFovAngle={(val) => setFovAngle(String(val.toFixed(1)))}
              />
            )}
            {/* Mount Suggestion */}
            {selectedDevice?.category === 'camera' && (
              <MountSuggestionPanel
                manufacturer={selectedDevice.manufacturer}
                model={selectedDevice.model}
              />
            )}
            <div className="w-32">
              <label className="label">Quantity</label>
              <input type="number" className="input-field" min={1} max={100} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Notes</label><textarea className="input-field" rows={2} placeholder="Camera coverage notes..." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <div><label className="label">Install Details</label><textarea className="input-field" rows={2} placeholder="Installation requirements..." value={installDetails} onChange={(e) => setInstallDetails(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
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

function EditDeviceModal({ designId, placedDevice, onClose, onSaved }: { designId: string; placedDevice: PlacedDeviceData; onClose: () => void; onSaved: () => void }) {
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
    setSaving(true); setError('');
    try {
      await designsApi.updateDevice(accessToken, designId, placedDevice.id, {
        area: area || undefined, floor: floor || undefined, room: room || undefined,
        fovAngle: fovAngle ? Number(fovAngle) : undefined, fovDistance: fovDistance ? Number(fovDistance) : undefined,
        cameraHeight: cameraHeight ? Number(cameraHeight) : undefined, tilt: tilt ? Number(tilt) : undefined,
        notes: notes || undefined, installDetails: installDetails || undefined,
      } as Partial<PlacedDeviceData>);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit: {placedDevice.device?.manufacturer} {placedDevice.device?.model}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Area</label><input type="text" className="input-field" value={area} onChange={(e) => setArea(e.target.value)} /></div>
            <div><label className="label">Floor</label><input type="text" className="input-field" value={floor} onChange={(e) => setFloor(e.target.value)} /></div>
            <div><label className="label">Room</label><input type="text" className="input-field" value={room} onChange={(e) => setRoom(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div><label className="label">FOV Angle (deg)</label><input type="number" className="input-field" value={fovAngle} onChange={(e) => setFovAngle(e.target.value)} /></div>
            <div><label className="label">FOV Distance (ft)</label><input type="number" className="input-field" value={fovDistance} onChange={(e) => setFovDistance(e.target.value)} /></div>
            <div><label className="label">Camera Height (ft)</label><input type="number" className="input-field" value={cameraHeight} onChange={(e) => setCameraHeight(e.target.value)} /></div>
            <div><label className="label">Tilt (deg)</label><input type="number" className="input-field" value={tilt} onChange={(e) => setTilt(e.target.value)} /></div>
          </div>
          {/* FOV Analysis Panel */}
          {placedDevice.device?.category === 'camera' && cameraHeight && fovDistance && (
            <FovAnalysisPanel
              manufacturer={placedDevice.device.manufacturer}
              model={placedDevice.device.model}
              heightFt={parseFloat(cameraHeight) || 0}
              distanceFt={parseFloat(fovDistance) || 0}
              onApplyTilt={(val) => setTilt(String(val.toFixed(1)))}
              onApplyFovAngle={(val) => setFovAngle(String(val.toFixed(1)))}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Notes</label><textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div><label className="label">Install Details</label><textarea className="input-field" rows={2} value={installDetails} onChange={(e) => setInstallDetails(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

// ===== FOV Analysis Panel (shared by AddDeviceModal + EditDeviceModal) =====

function FovAnalysisPanel({
  manufacturer,
  model,
  heightFt,
  distanceFt,
  onApplyTilt,
  onApplyFovAngle,
}: {
  manufacturer: string;
  model: string;
  heightFt: number;
  distanceFt: number;
  onApplyTilt: (deg: number) => void;
  onApplyFovAngle: (deg: number) => void;
}) {
  const [ppf, setPpf] = useState(76);
  const [expanded, setExpanded] = useState(true);

  const sensor = DESIGN_FOV_DB[manufacturer]?.[model] || DEFAULT_SENSOR;
  if (heightFt <= 0 || distanceFt <= 0) return null;

  const result = calcFovAnalysis(sensor, heightFt, distanceFt, ppf);

  return (
    <div className="border border-indigo-200 rounded bg-indigo-50/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-indigo-800"
      >
        <span>FOV Analysis</span>
        <span className="text-xs text-indigo-500">{expanded ? 'collapse' : 'expand'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <select
              className="input-field text-xs py-1"
              value={ppf}
              onChange={(e) => setPpf(Number(e.target.value))}
            >
              {PPF_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${result.quality === 'OPTIMAL' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {result.quality}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400">Focal Length</span>
              <p className="font-semibold text-gray-900">{result.focal.toFixed(1)} mm</p>
            </div>
            <div>
              <span className="text-gray-400">Tilt Angle</span>
              <p className="font-semibold text-gray-900">{result.tiltDeg.toFixed(1)} deg</p>
            </div>
            <div>
              <span className="text-gray-400">Blind Spot</span>
              <p className="font-semibold text-gray-900">{result.blindSpot.toFixed(1)} ft</p>
            </div>
            <div>
              <span className="text-gray-400">HFOV</span>
              <p className="font-semibold text-gray-900">{result.hfov.toFixed(1)} deg</p>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => onApplyTilt(result.tiltDeg)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Apply Tilt
            </button>
            <button
              type="button"
              onClick={() => onApplyFovAngle(result.hfov)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Apply FOV Angle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Mount Suggestion Panel (AddDeviceModal only) =====

function MountSuggestionPanel({ manufacturer, model }: { manufacturer: string; model: string }) {
  const [expanded, setExpanded] = useState(false);
  const [location, setLocation] = useState<MountLocation>('Wall');
  const bom = getMountBom(manufacturer, model, location);

  if (bom.length === 0) return null;

  return (
    <div className="border border-orange-200 rounded bg-orange-50/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-orange-800"
      >
        <span>Suggested Mounts</span>
        <span className="text-xs text-orange-500">{expanded ? 'collapse' : 'expand'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <select
            className="input-field text-xs py-1 w-32"
            value={location}
            onChange={(e) => setLocation(e.target.value as MountLocation)}
          >
            <option value="Wall">Wall</option>
            <option value="Corner">Corner</option>
            <option value="Pole">Pole</option>
            <option value="Flush">Flush</option>
          </select>
          <div className="space-y-1">
            {bom.map((line, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 w-16">{line.component}</span>
                <span className="font-mono text-orange-700 font-medium">{line.partNumber}</span>
                <span className="text-gray-400">{line.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Hardware Schedule Tab (Enhanced) =====

const BINARY_CONVERSION = 0.909;
const RAID_PARITY = 1;
const RAID_PENALTY = 4;
const DRIVE_SIZES = [8, 10, 12, 14, 16, 18, 20];
const MECH_LIMIT = 1440;

function HardwareScheduleTab({ designId, design }: { designId: string; design: DesignDetail }) {
  const { accessToken } = useAuthStore();
  const [schedule, setSchedule] = useState<HardwareSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    designsApi.hardwareSchedule(accessToken, designId)
      .then((res) => setSchedule(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, designId]);

  if (loading) return <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>;
  if (!schedule) return <div className="card p-8 text-center text-sm text-gray-500">Failed to load hardware schedule</div>;

  const cameraCount = design.placedDevices.filter((pd) => pd.device?.category === 'camera').length;
  const bitratePerCam = 5.0 * (15 / 30) * 1.0;
  const totalMbps = bitratePerCam * cameraCount;
  const rawTB = (totalMbps * 3600 * 24 * 30 * 1.0 * 1.15) / 8_000_000;

  const raidRows = DRIVE_SIZES.map((driveSize) => {
    const usable = driveSize * BINARY_CONVERSION;
    const dataDrives = Math.max(1, Math.ceil(rawTB / usable));
    const total = dataDrives + RAID_PARITY;
    const writeLoad = total > 0 ? (totalMbps * RAID_PENALTY) / total : 0;
    return { driveSize, total, dataDrives, rawLabel: total * driveSize, usable: dataDrives * usable, writeLoad, status: writeLoad > MECH_LIMIT ? 'OVERLOAD' : 'STABLE' };
  });

  const wattsPerCam = 13;
  const totalWatts = wattsPerCam * cameraCount;
  const totalWattsSafe = totalWatts * 1.25;
  const uplink = totalMbps <= 90 ? '100 Mbps' : '1 Gbps';
  const cloudUpload = totalMbps * 1.2;
  const monthlyTB = (totalMbps * 3600 * 24 * 30) / 8_000_000;

  const refRow = raidRows.find((r) => r.driveSize === 10) || raidRows[0];
  const localCost = refRow.total * 10 * 28 * 1.25;
  const cloudCost = rawTB * 7 * 12 * 5;

  return (
    <div ref={printRef} className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button onClick={() => window.print()} className="btn-primary text-sm">Export Report</button>
      </div>

      {/* Device List */}
      <div className="card overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Device List</h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Total: <strong className="text-gray-900">{schedule.totalDevices}</strong></span>
              <span>Unique: <strong className="text-gray-900">{schedule.uniqueDevices}</strong></span>
            </div>
          </div>
        </div>
        {schedule.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No devices</div>
        ) : (
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
                  <td className="px-4 py-3 text-gray-500 capitalize">{CATEGORY_LABELS[item.category] || item.category}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{item.areas.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recommended Mounting Hardware */}
      {(() => {
        const cameraItems = schedule.items.filter((item) => item.category === 'camera');
        if (cameraItems.length === 0) return null;
        const mountLines: { partNumber: string; component: string; desc: string; qty: number }[] = [];
        for (const item of cameraItems) {
          const bom = getMountBom(item.manufacturer, item.model, 'Wall');
          for (const line of bom) {
            const existing = mountLines.find((m) => m.partNumber === line.partNumber);
            if (existing) { existing.qty += item.quantity; }
            else { mountLines.push({ ...line, qty: item.quantity }); }
          }
        }
        if (mountLines.length === 0) return null;
        return (
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Recommended Mounting Hardware</h3>
              <p className="text-xs text-gray-400 mt-0.5">Default: Wall mount, White finish — use Mounting Calculator for model-specific overrides</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Qty</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Component</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Part Number</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody>
                {mountLines.map((line, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-bold text-gray-900">{line.qty}</td>
                    <td className="px-4 py-2 text-gray-700">{line.component}</td>
                    <td className="px-4 py-2 font-mono text-xs text-orange-700">{line.partNumber}</td>
                    <td className="px-4 py-2 text-gray-500">{line.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Infrastructure (only if cameras) */}
      {cameraCount > 0 && (
        <>
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Storage -- RAID 5 ({cameraCount} cameras, 4MP, 15fps, H.265, 30d)</h3>
            </div>
            <div className="p-4 flex gap-8 text-sm">
              <div><span className="text-xs text-gray-400 uppercase">Raw Storage</span><p className="font-bold text-gray-900">{rawTB.toFixed(2)} TB</p></div>
              <div><span className="text-xs text-gray-400 uppercase">Bandwidth</span><p className="font-bold text-gray-900">{totalMbps.toFixed(1)} Mbps</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-medium text-gray-600">Drive</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Qty</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Raw</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Usable</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Write Load</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
              </tr></thead>
              <tbody>
                {raidRows.map((row) => (
                  <tr key={row.driveSize} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.driveSize} TB</td>
                    <td className="px-3 py-2 text-gray-700">{row.total} ({row.dataDrives}D+1P)</td>
                    <td className="px-3 py-2 text-gray-500">{row.rawLabel} TB</td>
                    <td className="px-3 py-2 text-gray-700">{row.usable.toFixed(1)} TB</td>
                    <td className="px-3 py-2 text-gray-500">{row.writeLoad.toFixed(0)} Mbps</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${row.status === 'STABLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Network</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Throughput</span><span className="font-bold text-gray-900">{totalMbps.toFixed(1)} Mbps</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Uplink</span><span className="font-bold text-gray-900">{uplink}</span></div>
              </div>
            </div>
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">PoE Budget</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-gray-900">{totalWatts}W ({totalWattsSafe.toFixed(0)}W w/ safety)</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Standard</span><span className="font-bold text-gray-900">802.3at (PoE+)</span></div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Cloud Replication</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-xs text-gray-400 uppercase">Upload</span><p className="font-bold text-gray-900">{cloudUpload.toFixed(1)} Mbps</p></div>
              <div><span className="text-xs text-gray-400 uppercase">ISP Tier</span><p className="font-bold text-gray-900">{cloudUpload <= 35 ? 'Business Cable' : cloudUpload <= 100 ? 'Mid-Tier Fiber' : 'Enterprise Fiber'}</p></div>
              <div><span className="text-xs text-gray-400 uppercase">Monthly</span><p className="font-bold text-gray-900">{monthlyTB.toFixed(1)} TB/mo</p></div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">5-Year TCO (10TB Drives)</h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className={`p-3 rounded border ${localCost <= cloudCost ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800">Local</span>
                  {localCost <= cloudCost && <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Best Value</span>}
                </div>
                <p className="text-xl font-bold text-gray-900">${localCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className={`p-3 rounded border ${cloudCost < localCost ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800">Cloud</span>
                  {cloudCost < localCost && <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Best Value</span>}
                </div>
                <p className="text-xl font-bold text-gray-900">${cloudCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </>
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
    designsApi.sow(accessToken, designId).then((res) => setSOW(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [accessToken, designId]);

  if (loading) return <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>;
  if (!sow) return <div className="card p-8 text-center text-sm text-gray-500">Failed to load statement of work</div>;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-xs text-gray-400 uppercase tracking-wide">Design</span><p className="font-medium text-gray-900">{sow.designName} V{sow.version}</p></div>
          <div><span className="text-xs text-gray-400 uppercase tracking-wide">Created By</span><p className="text-gray-700">{sow.createdBy}</p></div>
          <div><span className="text-xs text-gray-400 uppercase tracking-wide">Total Devices</span><p className="font-bold text-gray-900">{sow.totalDevices}</p></div>
          {sow.opportunity && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Project</span>
              <p className="text-gray-700">{sow.opportunity.customerName} - {sow.opportunity.projectName}</p>
              {sow.opportunity.installAddress && (
                <p className="text-xs text-gray-400 mt-0.5">{sow.opportunity.installAddress}, {sow.opportunity.installCity} {sow.opportunity.installState} {sow.opportunity.installZip}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {sow.areas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">No devices placed in this design</div>
      ) : (
        sow.areas.map((area) => (
          <div key={area.area} className="card overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2"><h3 className="font-semibold text-sm">{area.area}</h3></div>
            {area.floors.map((floor) => (
              <div key={floor.floor}>
                <div className="bg-gray-100 px-4 py-1.5 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{floor.floor}</span>
                </div>
                {floor.rooms.map((room) => (
                  <div key={room.room} className="border-b border-gray-100 last:border-0">
                    <div className="px-4 py-1.5 bg-gray-50"><span className="text-xs font-medium text-gray-500">{room.room}</span></div>
                    {room.devices.map((device) => (
                      <div key={device.id} className="px-6 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{device.manufacturer} {device.model}</p>
                            <p className="text-xs text-gray-400 font-mono">{device.partNumber}</p>
                          </div>
                          <span className="text-xs text-gray-400 capitalize">{CATEGORY_LABELS[device.category] || device.category}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                          {device.cameraHeight != null && <div><span className="text-gray-400">Height:</span> <span className="text-gray-600">{device.cameraHeight} ft</span></div>}
                          {device.fovAngle != null && <div><span className="text-gray-400">FOV:</span> <span className="text-gray-600">{device.fovAngle} deg</span></div>}
                          {device.fovDistance != null && <div><span className="text-gray-400">Distance:</span> <span className="text-gray-600">{device.fovDistance} ft</span></div>}
                          {device.tilt != null && <div><span className="text-gray-400">Tilt:</span> <span className="text-gray-600">{device.tilt} deg</span></div>}
                        </div>
                        {device.notes && <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Notes:</span> {device.notes}</p>}
                        {device.installDetails && <p className="text-xs text-gray-500 mt-0.5"><span className="font-medium">Install:</span> {device.installDetails}</p>}
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
  floors: { floor: string; rooms: { room: string; devices: PlacedDeviceData[] }[] }[];
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
      rooms: Array.from(rooms.entries()).map(([room, devices]) => ({ room, devices })),
    })),
  }));
}
