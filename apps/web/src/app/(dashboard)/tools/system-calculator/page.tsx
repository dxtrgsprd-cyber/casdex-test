'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CameraGroup {
  id: number;
  label: string;
  count: number;
  resolution: string;
  fps: number;
  codec: string;
  recordingHoursPerDay: number;
}

// Bitrate estimates in Mbps per camera by resolution and codec
const BITRATE_TABLE: Record<string, Record<string, number>> = {
  '8MP': { 'H.264': 12, 'H.265': 6 },
  '4K': { 'H.264': 12, 'H.265': 6 },
  '6MP': { 'H.264': 10, 'H.265': 5 },
  '5MP': { 'H.264': 8, 'H.265': 4 },
  '4MP': { 'H.264': 6, 'H.265': 3 },
  '3MP': { 'H.264': 5, 'H.265': 2.5 },
  '2MP': { 'H.264': 4, 'H.265': 2 },
  '1080p': { 'H.264': 4, 'H.265': 2 },
  '720p': { 'H.264': 2, 'H.265': 1 },
};

const RESOLUTIONS = Object.keys(BITRATE_TABLE);
const CODECS = ['H.264', 'H.265'];
const FPS_OPTIONS = [5, 10, 15, 20, 25, 30];

let groupCounter = 1;

function createGroup(): CameraGroup {
  return {
    id: groupCounter++,
    label: '',
    count: 1,
    resolution: '4MP',
    fps: 15,
    codec: 'H.265',
    recordingHoursPerDay: 24,
  };
}

function calculateGroup(group: CameraGroup, retentionDays: number) {
  const baseBitrate = BITRATE_TABLE[group.resolution]?.[group.codec] ?? 4;
  // Scale bitrate by FPS (base assumes 15fps)
  const fpsScale = group.fps / 15;
  const bitratePerCam = baseBitrate * fpsScale;
  const totalBitrate = bitratePerCam * group.count;

  // Storage = bitrate (Mbps) * seconds_per_day * retention_days / 8 / 1e6 (TB)
  const secondsPerDay = group.recordingHoursPerDay * 3600;
  const storagePerCamTB =
    (bitratePerCam * secondsPerDay * retentionDays) / 8 / 1_000_000;
  const totalStorageTB = storagePerCamTB * group.count;

  return {
    bitratePerCam,
    totalBitrate,
    storagePerCamTB,
    totalStorageTB,
  };
}

export default function SystemCalculatorPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<CameraGroup[]>([createGroup()]);
  const [retentionDays, setRetentionDays] = useState(30);

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

  // Calculate totals
  const results = groups.map((g) => ({
    group: g,
    ...calculateGroup(g, retentionDays),
  }));

  const totalCameras = groups.reduce((sum, g) => sum + g.count, 0);
  const totalBandwidthMbps = results.reduce((sum, r) => sum + r.totalBitrate, 0);
  const totalStorageTB = results.reduce((sum, r) => sum + r.totalStorageTB, 0);

  // Recommend server disks (assume 18TB drives for NVR)
  const diskSize = 18;
  const rawDisksNeeded = Math.ceil(totalStorageTB / diskSize);
  // Add 1 for RAID overhead / parity
  const disksRecommended = rawDisksNeeded > 0 ? rawDisksNeeded + 1 : 0;

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
        <h1 className="text-2xl font-bold text-gray-900">System Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calculate storage, bandwidth, and recording infrastructure requirements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Retention */}
          <div className="card p-4">
            <label className="label">Recording Retention (days)</label>
            <input
              type="number"
              className="input-field w-32"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value) || 30))}
            />
          </div>

          {/* Camera Groups */}
          {groups.map((group, index) => (
            <div key={group.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Camera Group {index + 1}
                </h3>
                {groups.length > 1 && (
                  <button
                    onClick={() => removeGroup(group.id)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                  <label className="label text-xs">Camera Count</label>
                  <input
                    type="number"
                    className="input-field text-sm"
                    min={1}
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
                <div>
                  <label className="label text-xs">Codec</label>
                  <select
                    className="input-field text-sm"
                    value={group.codec}
                    onChange={(e) => updateGroup(group.id, { codec: e.target.value })}
                  >
                    {CODECS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Rec. Hours/Day</label>
                  <input
                    type="number"
                    className="input-field text-sm"
                    min={1}
                    max={24}
                    value={group.recordingHoursPerDay}
                    onChange={(e) => updateGroup(group.id, { recordingHoursPerDay: Math.min(24, Math.max(1, Number(e.target.value) || 24)) })}
                  />
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

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="card p-5 border-l-4 border-l-green-500">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wide">
              System Summary
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Cameras</p>
                <p className="text-2xl font-bold text-gray-900">{totalCameras}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Bandwidth</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalBandwidthMbps.toFixed(1)} <span className="text-sm font-normal text-gray-500">Mbps</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Total Storage ({retentionDays} days)
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalStorageTB.toFixed(2)} <span className="text-sm font-normal text-gray-500">TB</span>
                </p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Recommended Disks (18TB drives)
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {disksRecommended} <span className="text-sm font-normal text-gray-500">drives</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Includes 1 parity/spare drive
                </p>
              </div>
            </div>
          </div>

          {/* Per-Group Breakdown */}
          {results.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
                Per-Group Breakdown
              </h3>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={r.group.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {r.group.label || `Group ${i + 1}`}
                      <span className="text-gray-400 font-normal ml-2">
                        ({r.group.count}x {r.group.resolution} @ {r.group.fps}fps {r.group.codec})
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Bitrate/cam:</span>{' '}
                        <span className="text-gray-700">{r.bitratePerCam.toFixed(1)} Mbps</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Group bandwidth:</span>{' '}
                        <span className="text-gray-700">{r.totalBitrate.toFixed(1)} Mbps</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Storage/cam:</span>{' '}
                        <span className="text-gray-700">{r.storagePerCamTB.toFixed(3)} TB</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Group storage:</span>{' '}
                        <span className="text-gray-700">{r.totalStorageTB.toFixed(2)} TB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card p-4 bg-gray-50">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Bitrate estimates are approximate and assume
              typical scenes with medium motion. Actual storage requirements
              may vary based on scene complexity, motion levels, and VMS overhead.
              H.265 typically reduces storage by ~50% compared to H.264.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
