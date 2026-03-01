'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCalcReference } from '@/hooks/useCalcReference';

// ===== Types =====

interface CameraGroup {
  id: number;
  label: string;
  count: number;
  resolution: string;
  fps: number;
  cameraType: string;
  smartCodec: string;
  recordMode: string;
  motionPercent: number;
}

interface GroupResult {
  group: CameraGroup;
  baseMbps: number;
  cameraMbps: number;
  groupMbps: number;
  groupStorageTB: number;
  wattsPerCam: number;
  groupWatts: number;
  poeStandard: string;
}

interface RaidRow {
  driveSize: number;
  totalDrives: number;
  dataDrives: number;
  parityDrives: number;
  rawLabelTB: number;
  actualUsableTB: number;
  writeLoadMbps: number;
  writeLoadStatus: string;
  chassis: string;
}

// ===== Constants =====

const RESOLUTIONS = ['720p', '1080p', '4MP', '5MP', '4K'] as const;

const FPS_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

const BINARY_CONVERSION = 0.909; // decimal to binary OS conversion

const MECHANICAL_DRIVE_LIMIT_MBPS = 1440; // 180 MB/s = 1440 Mbps

const POE_SAFETY_BUFFER = 1.25; // 25% safety margin

const DRIVE_COST_PER_TB = 28; // surveillance-grade
const CLOUD_MONTHLY_RATE = 7; // $/TB/month

// ===== Calculation Functions =====

let groupCounter = 1;

function createGroup(): CameraGroup {
  return {
    id: groupCounter++,
    label: '',
    count: 1,
    resolution: '4MP',
    fps: 15,
    cameraType: 'ir_enhanced',
    smartCodec: 'h265_standard',
    recordMode: 'always',
    motionPercent: 100,
  };
}

function getPoeStandard(watts: number): string {
  const withSafety = watts * POE_SAFETY_BUFFER;
  if (withSafety <= 15.4) return '802.3af (PoE)';
  if (withSafety <= 30) return '802.3at (PoE+)';
  return '802.3bt (Hi-PoE/PoE++)';
}

function getNetworkUplink(totalMbps: number): string {
  if (totalMbps <= 90) return '100 Mbps Uplink';
  return '1 Gbps Uplink';
}

function getCloudReplication(totalMbps: number) {
  const reqUploadMbps = totalMbps * 1.20; // 20% protocol overhead
  const monthlyTransferTB = (totalMbps * 3600 * 24 * 30) / 8_000_000;

  let ispTier: string;
  if (reqUploadMbps <= 35) ispTier = 'Standard Business Cable';
  else if (reqUploadMbps <= 100) ispTier = 'Mid-Tier Fiber (100 Mbps Upload Required)';
  else ispTier = 'Dedicated Enterprise Fiber (High Bandwidth Load)';

  return { reqUploadMbps, monthlyTransferTB, ispTier };
}

function calculate5YearTCO(rawStorageTB: number, totalDrives: number, selectedDriveSize: number) {
  // Local
  const upfrontHddCost = totalDrives * selectedDriveSize * DRIVE_COST_PER_TB;
  const localTCO5yr = upfrontHddCost * 1.25; // 25% maintenance/electricity/labor

  // Cloud
  const monthlyBill = rawStorageTB * CLOUD_MONTHLY_RATE;
  const cloudTCO5yr = monthlyBill * 12 * 5;

  return {
    upfrontHddCost,
    localTCO5yr,
    monthlyBill,
    cloudTCO5yr,
    recommendation: localTCO5yr <= cloudTCO5yr ? 'local' : 'cloud',
  };
}

// ===== Component =====

export default function SystemCalculatorPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<CameraGroup[]>([createGroup()]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [selectedDriveSize, setSelectedDriveSize] = useState(10);
  const [raidLevel, setRaidLevel] = useState('raid5');

  // Load reference data from API
  const { data: cameraTypeData, loading: l1 } = useCalcReference('camera_power_type');
  const { data: codecData, loading: l2 } = useCalcReference('smart_codec');
  const { data: recordData, loading: l3 } = useCalcReference('record_mode');
  const { data: motionData, loading: l4 } = useCalcReference('motion_preset');
  const { data: bitrateData, loading: l5 } = useCalcReference('bitrate_standard');
  const { data: driveData, loading: l6 } = useCalcReference('drive_size');
  const { data: raidData, loading: l7 } = useCalcReference('raid_level');

  const dataLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  // Build compatible data structures from API data
  const CAMERA_TYPES: Record<string, { label: string; watts: number }> = {};
  for (const d of cameraTypeData) { CAMERA_TYPES[d.key] = { label: d.label, watts: (d.data as any).watts }; }

  const SMART_CODECS: Record<string, { label: string; multiplier: number }> = {};
  for (const d of codecData) { SMART_CODECS[d.key] = { label: d.label, multiplier: (d.data as any).multiplier }; }

  const RECORD_MODES: Record<string, { label: string; note: string }> = {};
  for (const d of recordData) { RECORD_MODES[d.key] = { label: d.label, note: (d.data as any).note }; }

  const MOTION_PRESETS = motionData.map(d => ({ value: (d.data as any).percentage as number, label: d.label }));

  const BITRATE_30FPS: Record<string, number> = {};
  for (const d of bitrateData) { BITRATE_30FPS[d.key] = (d.data as any).mbps; }

  const DRIVE_SIZES = driveData.map(d => (d.data as any).tb as number);

  const RAID_LEVELS: Record<string, { label: string; parity: number; penalty: number }> = {};
  for (const d of raidData) { RAID_LEVELS[d.key] = { label: d.label, parity: (d.data as any).parity, penalty: (d.data as any).penalty }; }

  // Calculation functions (depend on API-loaded constants)
  function calculateGroupResult(group: CameraGroup, days: number): GroupResult {
    const baseBitrate = BITRATE_30FPS[group.resolution] ?? 5.0;
    const baseMbps = baseBitrate * (group.fps / 30);
    const codecMultiplier = SMART_CODECS[group.smartCodec]?.multiplier ?? 1.0;
    const cameraMbps = baseMbps * codecMultiplier;

    let effectiveMotion = group.motionPercent / 100;
    if (group.recordMode === 'never') {
      return {
        group,
        baseMbps,
        cameraMbps: 0,
        groupMbps: 0,
        groupStorageTB: 0,
        wattsPerCam: CAMERA_TYPES[group.cameraType]?.watts ?? 13,
        groupWatts: (CAMERA_TYPES[group.cameraType]?.watts ?? 13) * group.count,
        poeStandard: getPoeStandard(CAMERA_TYPES[group.cameraType]?.watts ?? 13),
      };
    }
    if (group.recordMode === 'motion' || group.recordMode === 'motion_lowres') {
      // Motion-based recording uses the motion percentage
      effectiveMotion = group.motionPercent / 100;
    } else {
      // Always recording = 100%
      effectiveMotion = 1.0;
    }

    const groupMbps = cameraMbps * group.count;
    // Storage: (total_mbps * 3600 * 24 * days * motion_pct * 1.15) / 8,000,000
    const rawTB = (groupMbps * 3600 * 24 * days * effectiveMotion * 1.15) / 8_000_000;

    const wattsPerCam = CAMERA_TYPES[group.cameraType]?.watts ?? 13;

    return {
      group,
      baseMbps,
      cameraMbps,
      groupMbps,
      groupStorageTB: rawTB,
      wattsPerCam,
      groupWatts: wattsPerCam * group.count,
      poeStandard: getPoeStandard(wattsPerCam),
    };
  }

  function calculateRaidRows(
    totalMbps: number,
    rawStorageTB: number,
    raidLevelKey: string,
  ): RaidRow[] {
    const raid = RAID_LEVELS[raidLevelKey];
    if (!raid) return [];

    return DRIVE_SIZES.map((driveSize) => {
      const usablePerDrive = driveSize * BINARY_CONVERSION;
      const dataDrives = Math.max(1, Math.ceil(rawStorageTB / usablePerDrive));
      const totalDrives = dataDrives + raid.parity;
      const rawLabelTB = totalDrives * driveSize;
      const actualUsableTB = dataDrives * usablePerDrive;

      // Write penalty check
      const perDriveWriteLoad = totalDrives > 0
        ? (totalMbps * raid.penalty) / totalDrives
        : 0;

      const writeLoadStatus = perDriveWriteLoad > MECHANICAL_DRIVE_LIMIT_MBPS
        ? 'OVERLOAD'
        : 'STABLE';

      // Chassis selection
      let chassis: string;
      if (totalDrives <= 4) chassis = '4-Bay Desktop / 1U Rack';
      else if (totalDrives <= 8) chassis = '8-Bay 2U Rackmount';
      else if (totalDrives <= 12) chassis = '12-Bay 2U Rackmount';
      else chassis = 'High-Density Rackmount';

      return {
        driveSize,
        totalDrives,
        dataDrives,
        parityDrives: raid.parity,
        rawLabelTB,
        actualUsableTB,
        writeLoadMbps: perDriveWriteLoad,
        writeLoadStatus,
        chassis,
      };
    });
  }

  function updateGroup(id: number, updates: Partial<CameraGroup>) {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }

  function removeGroup(id: number) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function addGroup() {
    setGroups((prev) => [...prev, createGroup()]);
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Loading calculator data...</p>
      </div>
    );
  }

  // Calculate all groups
  const results = groups.map((g) => calculateGroupResult(g, retentionDays));

  const totalCameras = groups.reduce((sum, g) => sum + g.count, 0);
  const totalMbps = results.reduce((sum, r) => sum + r.groupMbps, 0);
  const totalStorageTB = results.reduce((sum, r) => sum + r.groupStorageTB, 0);
  const totalWatts = results.reduce((sum, r) => sum + r.groupWatts, 0);
  const totalWattsWithSafety = totalWatts * POE_SAFETY_BUFFER;

  // Determine highest PoE standard needed
  const poeStandards = results.map((r) => r.poeStandard);
  const highestPoe = poeStandards.includes('802.3bt (Hi-PoE/PoE++)')
    ? '802.3bt (Hi-PoE/PoE++)'
    : poeStandards.includes('802.3at (PoE+)')
    ? '802.3at (PoE+)'
    : '802.3af (PoE)';

  // RAID analysis
  const raidRows = calculateRaidRows(totalMbps, totalStorageTB, raidLevel);
  const selectedRaidRow = raidRows.find((r) => r.driveSize === selectedDriveSize);

  // Network
  const networkUplink = getNetworkUplink(totalMbps);

  // Cloud
  const cloud = getCloudReplication(totalMbps);

  // TCO
  const tco = selectedRaidRow
    ? calculate5YearTCO(totalStorageTB, selectedRaidRow.totalDrives, selectedDriveSize)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => router.push('/tools')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Tools
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">System Calculator</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">NDAA-Compliant System Designer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calculate storage, bandwidth, PoE, RAID, and infrastructure requirements for NDAA SEC. 889 compliant systems
        </p>
      </div>

      {/* NDAA Compliance Banner */}
      <div className="card p-3 mb-6 border-l-4 border-l-green-600 bg-green-50">
        <p className="text-sm font-semibold text-green-800">
          SEC. 889 NDAA COMPLIANT -- All codec technologies listed are from NDAA-approved manufacturers
        </p>
      </div>

      {/* Global Settings */}
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Global Settings</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label text-xs">Retention Days</label>
            <input
              type="number"
              className="input-field text-sm"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value) || 30))}
            />
          </div>
          <div>
            <label className="label text-xs">Drive Size (TB)</label>
            <select
              className="input-field text-sm"
              value={selectedDriveSize}
              onChange={(e) => setSelectedDriveSize(Number(e.target.value))}
            >
              {DRIVE_SIZES.map((s) => (
                <option key={s} value={s}>{s} TB</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">RAID Level</label>
            <select
              className="input-field text-sm"
              value={raidLevel}
              onChange={(e) => setRaidLevel(e.target.value)}
            >
              {Object.entries(RAID_LEVELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Camera Groups */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-800">Camera Groups</h3>
        {groups.map((group, index) => (
          <div key={group.id} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">
                Group {index + 1}{group.label ? `: ${group.label}` : ''}
              </h4>
              {groups.length > 1 && (
                <button
                  onClick={() => removeGroup(group.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="label text-xs">Label</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="e.g. Exterior"
                  value={group.label}
                  onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs">Qty</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  min={1}
                  max={999}
                  value={group.count}
                  onChange={(e) => updateGroup(group.id, { count: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div>
                <label className="label text-xs">Resolution</label>
                <select
                  className="input-field text-sm"
                  value={group.resolution}
                  onChange={(e) => updateGroup(group.id, { resolution: e.target.value })}
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">FPS</label>
                <select
                  className="input-field text-sm"
                  value={group.fps}
                  onChange={(e) => updateGroup(group.id, { fps: Number(e.target.value) })}
                >
                  {FPS_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f} fps</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label text-xs">Camera Type</label>
                <select
                  className="input-field text-sm"
                  value={group.cameraType}
                  onChange={(e) => updateGroup(group.id, { cameraType: e.target.value })}
                >
                  {Object.entries(CAMERA_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Smart Codec</label>
                <select
                  className="input-field text-sm"
                  value={group.smartCodec}
                  onChange={(e) => updateGroup(group.id, { smartCodec: e.target.value })}
                >
                  {Object.entries(SMART_CODECS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label} ({(val.multiplier * 100).toFixed(0)}%)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Record Mode</label>
                <select
                  className="input-field text-sm"
                  value={group.recordMode}
                  onChange={(e) => updateGroup(group.id, { recordMode: e.target.value })}
                >
                  {Object.entries(RECORD_MODES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Motion %</label>
                <select
                  className="input-field text-sm"
                  value={group.motionPercent}
                  onChange={(e) => updateGroup(group.id, { motionPercent: Number(e.target.value) })}
                  disabled={group.recordMode === 'always' || group.recordMode === 'never'}
                >
                  {MOTION_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addGroup}
          className="btn-secondary text-sm w-full"
        >
          + Add Camera Group
        </button>
      </div>

      {/* ===== Results ===== */}
      {totalCameras > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900">System Analysis</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 border-l-4 border-l-blue-500">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Cameras</p>
              <p className="text-2xl font-bold text-gray-900">{totalCameras}</p>
            </div>
            <div className="card p-4 border-l-4 border-l-cyan-500">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Bandwidth</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalMbps.toFixed(1)} <span className="text-sm font-normal text-gray-500">Mbps</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{networkUplink}</p>
            </div>
            <div className="card p-4 border-l-4 border-l-amber-500">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Storage Required</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalStorageTB.toFixed(2)} <span className="text-sm font-normal text-gray-500">TB</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{retentionDays} days retention (incl. 15% VBR buffer)</p>
            </div>
            <div className="card p-4 border-l-4 border-l-red-500">
              <p className="text-xs text-gray-400 uppercase tracking-wide">PoE Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalWattsWithSafety.toFixed(0)} <span className="text-sm font-normal text-gray-500">W</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{totalWatts}W + 25% safety | {highestPoe}</p>
            </div>
          </div>

          {/* RAID Analysis Table */}
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">
                RAID Analysis -- {RAID_LEVELS[raidLevel]?.label} (All Drive Sizes)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Drive</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Qty</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Raw Label</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Actual Usable</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Write Load</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Chassis</th>
                  </tr>
                </thead>
                <tbody>
                  {raidRows.map((row) => (
                    <tr
                      key={row.driveSize}
                      className={`border-b border-gray-100 ${row.driveSize === selectedDriveSize ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900">{row.driveSize} TB</td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.totalDrives} ({row.dataDrives}D + {row.parityDrives}P)
                      </td>
                      <td className="px-3 py-2 text-gray-500">{row.rawLabelTB} TB</td>
                      <td className="px-3 py-2 text-gray-700">{row.actualUsableTB.toFixed(1)} TB</td>
                      <td className="px-3 py-2 text-gray-500">{row.writeLoadMbps.toFixed(0)} Mbps</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          row.writeLoadStatus === 'STABLE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {row.writeLoadStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.chassis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PoE Budget Breakdown */}
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">PoE Budget Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Group</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Cameras</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">W/Camera</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Group Total</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">PoE Standard</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.group.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {r.group.label || `Group ${i + 1}`}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.group.count}</td>
                    <td className="px-4 py-2 text-gray-700">{r.wattsPerCam}W</td>
                    <td className="px-4 py-2 text-gray-700">{r.groupWatts}W</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{r.poeStandard}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-gray-900">Total</td>
                  <td className="px-4 py-2 text-gray-900">{totalCameras}</td>
                  <td className="px-4 py-2 text-gray-500">-</td>
                  <td className="px-4 py-2 text-gray-900">{totalWatts}W ({totalWattsWithSafety.toFixed(0)}W with safety)</td>
                  <td className="px-4 py-2 text-gray-700 text-xs">{highestPoe}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cloud Replication */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Cloud Replication & ISP Requirements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Required Upload</p>
                <p className="text-xl font-bold text-gray-900">
                  {cloud.reqUploadMbps.toFixed(1)} <span className="text-sm font-normal text-gray-500">Mbps</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Includes 20% protocol overhead</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Monthly Transfer</p>
                <p className="text-xl font-bold text-gray-900">
                  {cloud.monthlyTransferTB.toFixed(1)} <span className="text-sm font-normal text-gray-500">TB/month</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">ISP Tier Required</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{cloud.ispTier}</p>
                <p className="text-xs text-gray-400 mt-1">Upload must be symmetrical for stable recording</p>
              </div>
            </div>
          </div>

          {/* 5-Year TCO */}
          {tco && selectedRaidRow && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">5-Year TCO Comparison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className={`p-4 rounded border ${tco.recommendation === 'local' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-800">Local On-Premise</h4>
                    {tco.recommendation === 'local' && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Best Long-Term Value</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {selectedRaidRow.totalDrives}x {selectedDriveSize}TB surveillance-grade drives @ ${DRIVE_COST_PER_TB}/TB
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Upfront HDD: ${tco.upfrontHddCost.toLocaleString()} + 25% maintenance/electricity/IT labor
                  </p>
                  <p className="text-2xl font-bold text-gray-900">${tco.localTCO5yr.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">5-year total cost</p>
                </div>
                <div className={`p-4 rounded border ${tco.recommendation === 'cloud' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-800">Cloud Subscription</h4>
                    {tco.recommendation === 'cloud' && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Best Long-Term Value</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {totalStorageTB.toFixed(1)} TB @ ${CLOUD_MONTHLY_RATE}/TB/month (Wasabi / Backblaze B2)
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Monthly: ${tco.monthlyBill.toFixed(0)}/month
                  </p>
                  <p className="text-2xl font-bold text-gray-900">${tco.cloudTCO5yr.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">5-year total cost</p>
                </div>
              </div>
            </div>
          )}

          {/* Per-Group Breakdown */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Per-Group Breakdown</h3>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={r.group.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {r.group.label || `Group ${i + 1}`}
                    <span className="text-gray-400 font-normal ml-2">
                      ({r.group.count}x {r.group.resolution} @ {r.group.fps}fps,{' '}
                      {SMART_CODECS[r.group.smartCodec]?.label},{' '}
                      {CAMERA_TYPES[r.group.cameraType]?.label})
                    </span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Bitrate/cam:</span>{' '}
                      <span className="text-gray-700">{r.cameraMbps.toFixed(2)} Mbps</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Group BW:</span>{' '}
                      <span className="text-gray-700">{r.groupMbps.toFixed(1)} Mbps</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Group storage:</span>{' '}
                      <span className="text-gray-700">{r.groupStorageTB.toFixed(2)} TB</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Group power:</span>{' '}
                      <span className="text-gray-700">{r.groupWatts}W ({r.poeStandard})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-4 bg-gray-50">
            <p className="text-xs text-gray-500">
              <strong>Notes:</strong> All codec technologies listed are from NDAA SEC. 889 compliant manufacturers.
              Storage calculation includes a 15% VBR buffer. Drive usable capacity uses 0.909 binary conversion factor.
              PoE budget includes 25% safety margin for IR activation, AI processing heat, and cable resistance.
              RAID write penalty: RAID 5 = 4x, RAID 6 = 6x operations per write.
              Mechanical drive limit: 180 MB/s (1440 Mbps) per spindle.
              Cloud pricing based on Wasabi/Backblaze B2 rates. Local costs include surveillance-grade drives (Purple Pro / SkyHawk AI).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
