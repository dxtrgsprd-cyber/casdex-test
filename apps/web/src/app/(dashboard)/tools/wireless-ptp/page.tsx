'use client';

import { useState, useMemo } from 'react';
import { useCalcDevices } from '@/hooks/useCalcDevices';

// ============================================================
// Wireless Radio Database
// ============================================================

interface RadioSpec {
  freq: number;    // GHz
  cap: number;     // Mbps max throughput
  fadeMax: number;  // dB fade margin
  windArea: number; // sq ft for wind calc
}

type LinkMode = 'PtP' | 'PtMP';
type MountLocation = 'Pole' | 'Rooftop' | 'Tower';

const CAM_BITRATE = 6.0; // Mbps per camera (4K Hanwha WiseStream III baseline)
const WIND_SPEED_MPH = 80; // baseline wind speed for load calculation

// ============================================================
// Calculation Engines
// ============================================================

interface LinkAuditResult {
  totalVideoLoad: number;
  effectiveCap: number;
  utilization: number;
  status: string;
  rainLossDb: number;
  fadeMargin: number;
  rainStatus: string;
}

function calculateLinkAudit(
  radio: RadioSpec,
  mode: LinkMode,
  sites: number,
  camerasPerSite: number,
  distanceMi: number,
  rainRate: number,
): LinkAuditResult {
  const totalCameras = sites * camerasPerSite;
  const totalVideoLoad = totalCameras * CAM_BITRATE;
  const effectiveCap = mode === 'PtMP' ? radio.cap * 0.75 : radio.cap;
  const utilization = (totalVideoLoad / effectiveCap) * 100;
  const status = utilization < 70 ? 'STABLE' : utilization < 90 ? 'WARNING' : 'CRITICAL';

  // Rain attenuation (ITU-R P.838-3)
  const distKm = distanceMi * 1.60934;
  const k = radio.freq >= 50 ? 0.65 : 0.04;
  const alpha = radio.freq >= 50 ? 0.81 : 1.15;
  const rainLossDb = k * Math.pow(rainRate, alpha) * distKm;
  const fadeMargin = radio.fadeMax - rainLossDb;
  const rainStatus = fadeMargin > 5 ? 'STABLE' : fadeMargin > 0 ? 'MARGINAL' : 'FAIL';

  return { totalVideoLoad, effectiveCap, utilization, status, rainLossDb, fadeMargin, rainStatus };
}

interface PoeUplinkResult {
  camPower: number;
  radioPower: number;
  totalPoe: number;
  switchRecommendation: string;
  uplinkType: string;
  totalBandwidth: number;
}

function calculatePoeUplink(
  radio: RadioSpec,
  camerasPerSite: number,
): PoeUplinkResult {
  const camPower = camerasPerSite * 12.95;
  const radioPower = radio.freq > 50 ? 20 : 10;
  const totalPoe = (camPower + radioPower) * 1.25; // 25% safety

  const switchRecommendation = camerasPerSite > 8
    ? '24-Port Managed PoE+ (370W+)'
    : '8-Port Industrial PoE+';

  const totalBandwidth = camerasPerSite * CAM_BITRATE;
  const uplinkType = totalBandwidth > 90 ? 'Gigabit SFP' : 'Standard RJ45';

  return { camPower, radioPower, totalPoe, switchRecommendation, uplinkType, totalBandwidth };
}

interface LosWindResult {
  fresnelRadius: number;
  minHeight: number;
  losPassA: boolean;
  losPassB: boolean;
  losStatus: string;
  windForce: number;
}

function calculateLosWind(
  radio: RadioSpec,
  distanceMi: number,
  heightA: number,
  heightB: number,
): LosWindResult {
  // Fresnel zone radius
  const fresnelRadius = 43.3 * Math.sqrt(distanceMi / radio.freq);

  // Min clearance height
  const earthCurvature = (distanceMi * distanceMi) / 8;
  const minHeight = fresnelRadius * 0.60 + earthCurvature;

  const losPassA = heightA >= minHeight;
  const losPassB = heightB >= minHeight;
  const losStatus = losPassA && losPassB ? 'PASS' : 'FAIL';

  // Wind force at 80mph baseline
  const windForce = radio.windArea * 0.00256 * (WIND_SPEED_MPH * WIND_SPEED_MPH);

  return { fresnelRadius, minHeight, losPassA, losPassB, losStatus, windForce };
}

// ============================================================
// Page Component
// ============================================================

export default function WirelessPtpPage() {
  const { grouped: wirelessDb, loading: devicesLoading } = useCalcDevices('wireless');

  // Build WIRELESS_DB-compatible structure from API data
  const wirelessDbCompat: Record<string, Record<string, RadioSpec>> = {};
  for (const [mfg, devices] of Object.entries(wirelessDb)) {
    wirelessDbCompat[mfg] = {};
    for (const d of devices) {
      const s = d.specs as any;
      wirelessDbCompat[mfg][d.model] = { freq: s.frequency, cap: s.maxThroughput, fadeMax: s.fadeMargin, windArea: s.windArea };
    }
  }

  const manufacturers = Object.keys(wirelessDbCompat);
  const [manufacturer, setManufacturer] = useState(manufacturers[0] || '');
  const models = Object.keys(wirelessDbCompat[manufacturer] || {});
  const [model, setModel] = useState(models[0] || '');
  const [mode, setMode] = useState<LinkMode>('PtP');
  const [distanceMi, setDistanceMi] = useState('0.5');
  const [sites, setSites] = useState('1');
  const [camerasPerSite, setCamerasPerSite] = useState('20');
  const [heightA, setHeightA] = useState('30');
  const [heightB, setHeightB] = useState('30');
  const [, setMountLocation] = useState<MountLocation>('Pole');
  const [rainRate, setRainRate] = useState('25');

  // Set defaults when data loads
  useMemo(() => {
    if (manufacturers.length > 0 && !manufacturer) {
      setManufacturer(manufacturers[0]);
      const firstModels = Object.keys(wirelessDbCompat[manufacturers[0]] || {});
      setModel(firstModels[0] || '');
    }
  }, [manufacturers.length]);

  function handleManufacturerChange(mfr: string) {
    setManufacturer(mfr);
    const newModels = Object.keys(wirelessDbCompat[mfr] || {});
    setModel(newModels[0] || '');
  }

  const radio = wirelessDbCompat[manufacturer]?.[model];

  if (devicesLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Wireless Point-to-Point Calculator</h1>
          <p className="text-sm text-gray-500 mt-1">Loading wireless radio data...</p>
        </div>
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">Loading devices...</p>
        </div>
      </div>
    );
  }
  const dist = parseFloat(distanceMi) || 0;
  const numSites = parseInt(sites) || 1;
  const camsPerSite = parseInt(camerasPerSite) || 0;
  const hA = parseFloat(heightA) || 0;
  const hB = parseFloat(heightB) || 0;
  const rain = parseFloat(rainRate) || 0;

  const linkResult = useMemo(() => {
    if (!radio || dist <= 0 || camsPerSite <= 0) return null;
    return calculateLinkAudit(radio, mode, numSites, camsPerSite, dist, rain);
  }, [radio, mode, numSites, camsPerSite, dist, rain]);

  const poeResult = useMemo(() => {
    if (!radio || camsPerSite <= 0) return null;
    return calculatePoeUplink(radio, camsPerSite);
  }, [radio, camsPerSite]);

  const losResult = useMemo(() => {
    if (!radio || dist <= 0 || hA <= 0 || hB <= 0) return null;
    return calculateLosWind(radio, dist, hA, hB);
  }, [radio, dist, hA, hB]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'STABLE': case 'PASS': return 'text-green-700 bg-green-100';
      case 'WARNING': case 'MARGINAL': return 'text-amber-700 bg-amber-100';
      case 'CRITICAL': case 'FAIL': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wireless Point-to-Point Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          NDAA-compliant wireless CCTV infrastructure design — link audit, PoE budget, line-of-sight, and wind analysis
        </p>
      </div>

      {/* NDAA Banner */}
      <div className="bg-green-50 border border-green-200 rounded px-4 py-2 mb-6">
        <span className="text-sm font-semibold text-green-800">SEC. 889 NDAA COMPLIANT</span>
        <span className="text-sm text-green-600 ml-2">All listed wireless radios meet federal compliance requirements</span>
      </div>

      {/* Input Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Link Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="label">Manufacturer</label>
            <select className="input-field" value={manufacturer} onChange={(e) => handleManufacturerChange(e.target.value)}>
              {manufacturers.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Radio Model</label>
            <select className="input-field" value={model} onChange={(e) => setModel(e.target.value)}>
              {models.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Mode</label>
            <select className="input-field" value={mode} onChange={(e) => setMode(e.target.value as LinkMode)}>
              <option value="PtP">Point-to-Point</option>
              <option value="PtMP">Point-to-MultiPoint</option>
            </select>
          </div>
          <div>
            <label className="label">Distance (miles)</label>
            <input type="number" className="input-field" value={distanceMi} onChange={(e) => setDistanceMi(e.target.value)} min={0.1} step={0.1} />
          </div>
          <div>
            <label className="label">Rain Rate (mm/hr)</label>
            <input type="number" className="input-field" value={rainRate} onChange={(e) => setRainRate(e.target.value)} min={0} step={5} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div>
            <label className="label">Sites</label>
            <input type="number" className="input-field" value={sites} onChange={(e) => setSites(e.target.value)} min={1} />
          </div>
          <div>
            <label className="label">Cameras / Site</label>
            <input type="number" className="input-field" value={camerasPerSite} onChange={(e) => setCamerasPerSite(e.target.value)} min={1} />
          </div>
          <div>
            <label className="label">Height - End A (ft)</label>
            <input type="number" className="input-field" value={heightA} onChange={(e) => setHeightA(e.target.value)} min={1} />
          </div>
          <div>
            <label className="label">Height - End B (ft)</label>
            <input type="number" className="input-field" value={heightB} onChange={(e) => setHeightB(e.target.value)} min={1} />
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input-field" onChange={(e) => setMountLocation(e.target.value as MountLocation)}>
              <option value="Pole">Pole</option>
              <option value="Rooftop">Rooftop</option>
              <option value="Tower">Tower</option>
            </select>
          </div>
        </div>

        {radio && (
          <div className="mt-4 text-xs text-gray-400 flex gap-6">
            <span>Frequency: {radio.freq} GHz</span>
            <span>Max Throughput: {radio.cap} Mbps</span>
            <span>Fade Margin: {radio.fadeMax} dB</span>
            <span>Wind Area: {radio.windArea} sq ft</span>
          </div>
        )}
      </div>

      {/* Results */}
      {linkResult && poeResult && losResult && (
        <div className="space-y-6">
          {/* Audit 1: Capacity & Link */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">1. Capacity and Link Audit</h3>
              <span className={`inline-flex px-3 py-1 rounded text-sm font-semibold ${statusColor(linkResult.status)}`}>
                {linkResult.status}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="Total Video Load" value={`${linkResult.totalVideoLoad.toFixed(1)} Mbps`} />
              <StatCard label="Effective Capacity" value={`${linkResult.effectiveCap.toFixed(0)} Mbps`} />
              <StatCard label="Utilization" value={`${linkResult.utilization.toFixed(1)}%`} />
              <StatCard label="Available Headroom" value={`${(linkResult.effectiveCap - linkResult.totalVideoLoad).toFixed(1)} Mbps`} />
            </div>

            {/* Utilization bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className={`h-3 rounded-full transition-all ${
                  linkResult.utilization < 70 ? 'bg-green-500' :
                  linkResult.utilization < 90 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(linkResult.utilization, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Rain Attenuation" value={`${linkResult.rainLossDb.toFixed(1)} dB`} />
              <StatCard label="Fade Margin Remaining" value={`${linkResult.fadeMargin.toFixed(1)} dB`} />
              <div className="card p-3 bg-gray-50">
                <p className="text-xs text-gray-400">Rain Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-1 ${statusColor(linkResult.rainStatus)}`}>
                  {linkResult.rainStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Audit 2: Remote Site PoE & Uplink */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Remote Site PoE and Uplink</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Camera Power" value={`${poeResult.camPower.toFixed(1)} W`} />
              <StatCard label="Radio Power" value={`${poeResult.radioPower.toFixed(0)} W`} />
              <StatCard label="Total PoE Budget (25% safety)" value={`${poeResult.totalPoe.toFixed(1)} W`} />
              <StatCard label="Switch Recommendation" value={poeResult.switchRecommendation} />
              <StatCard label="Site Bandwidth" value={`${poeResult.totalBandwidth.toFixed(1)} Mbps`} />
              <StatCard label="Uplink Type" value={poeResult.uplinkType} />
            </div>
          </div>

          {/* Audit 3: Line-of-Sight & Wind */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">3. Physical Line-of-Sight and Wind</h3>
              <span className={`inline-flex px-3 py-1 rounded text-sm font-semibold ${statusColor(losResult.losStatus)}`}>
                LOS: {losResult.losStatus}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Fresnel Radius" value={`${losResult.fresnelRadius.toFixed(1)} ft`} />
              <StatCard label="Min Required Height" value={`${losResult.minHeight.toFixed(1)} ft`} />
              <div className="card p-3 bg-gray-50">
                <p className="text-xs text-gray-400">End A ({hA} ft)</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-1 ${statusColor(losResult.losPassA ? 'PASS' : 'FAIL')}`}>
                  {losResult.losPassA ? 'PASS' : `FAIL — Need ${losResult.minHeight.toFixed(1)} ft`}
                </span>
              </div>
              <div className="card p-3 bg-gray-50">
                <p className="text-xs text-gray-400">End B ({hB} ft)</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-1 ${statusColor(losResult.losPassB ? 'PASS' : 'FAIL')}`}>
                  {losResult.losPassB ? 'PASS' : `FAIL — Need ${losResult.minHeight.toFixed(1)} ft`}
                </span>
              </div>
              <StatCard label={`Wind Force (${WIND_SPEED_MPH} mph)`} value={`${losResult.windForce.toFixed(1)} lbs`} />
              <StatCard label="Distance" value={`${dist} mi (${(dist * 1.60934).toFixed(2)} km)`} />
            </div>
          </div>

          {/* Radio Comparison Table */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Radio Comparison — {manufacturer}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Model</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Freq</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Max Throughput</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Effective ({mode})</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Utilization</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Fade Margin</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(wirelessDbCompat[manufacturer] || {}).map(([m, r]) => {
                  const audit = calculateLinkAudit(r, mode, numSites, camsPerSite, dist, rain);
                  const isActive = m === model;
                  return (
                    <tr key={m} className={`border-b border-gray-100 ${isActive ? 'bg-primary-50' : ''}`}>
                      <td className="py-2 px-3 font-medium">{m}</td>
                      <td className="py-2 px-3">{r.freq} GHz</td>
                      <td className="py-2 px-3">{r.cap} Mbps</td>
                      <td className="py-2 px-3">{audit.effectiveCap} Mbps</td>
                      <td className="py-2 px-3 font-mono">{audit.utilization.toFixed(1)}%</td>
                      <td className="py-2 px-3">{audit.fadeMargin.toFixed(1)} dB</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${statusColor(audit.status)}`}>
                          {audit.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!linkResult || !poeResult || !losResult) && (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">Enter link configuration above to see wireless audit results</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 bg-gray-50">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
