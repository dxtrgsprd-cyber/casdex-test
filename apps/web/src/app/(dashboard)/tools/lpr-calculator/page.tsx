'use client';

import { useState, useMemo } from 'react';
import { useCalcDevices } from '@/hooks/useCalcDevices';
import { useCalcReference } from '@/hooks/useCalcReference';

// ============================================================
// NDAA LPR Engine — Sensor Database
// ============================================================

interface LprSensor {
  resH: number;
  sensorH: number; // mm
  fpsMax: number;
}

// ============================================================
// Calculation Engine
// ============================================================

interface LprResult {
  slopeDistance: number;
  requiredFocalLength: number;
  shutterSpeed: number;
  shutterFraction: string;
  verticalAngle: number;
  anglePass: boolean;
  recommendedFps: number;
  fpsWarning: boolean;
  opticalTarget: string;
  plateHeightPx: number;
}

function calculateLpr(
  sensor: LprSensor,
  heightFt: number,
  distanceFt: number,
  speedMph: number,
  shutterSteps: number[],
  lprPpf: number,
): LprResult {
  // 1. Slope distance
  const slopeDistance = Math.sqrt(heightFt * heightFt + distanceFt * distanceFt);

  // 2. Required focal length for 32 PPF plate height
  const plateWidthFt = sensor.resH / lprPpf;
  const requiredFocalLength = (sensor.sensorH * slopeDistance) / plateWidthFt;

  // 3. Shutter speed: 1/(speed*20), snap to nearest step
  const rawShutter = speedMph * 20;
  let shutterSpeed = shutterSteps[0];
  for (const step of shutterSteps) {
    if (step >= rawShutter) {
      shutterSpeed = step;
      break;
    }
    shutterSpeed = step;
  }
  if (rawShutter > shutterSteps[shutterSteps.length - 1]) {
    shutterSpeed = shutterSteps[shutterSteps.length - 1];
  }
  const shutterFraction = `1/${shutterSpeed}s`;

  // 4. Vertical angle (capture angle)
  const verticalAngle = Math.atan(heightFt / distanceFt) * (180 / Math.PI);
  const anglePass = verticalAngle <= 30;

  // 5. Recommended FPS
  const recommendedFps = speedMph > 45 ? 60 : 30;
  const fpsWarning = recommendedFps > sensor.fpsMax;

  // 6. Optical target
  const coverageFt = sensor.resH / lprPpf;
  const opticalTarget = coverageFt < 16 ? 'Single Lane' : 'Multi-Lane';

  // Plate height in pixels (standard US plate ~1ft tall)
  const plateHeightPx = lprPpf;

  return {
    slopeDistance,
    requiredFocalLength,
    shutterSpeed,
    shutterFraction,
    verticalAngle,
    anglePass,
    recommendedFps,
    fpsWarning,
    opticalTarget,
    plateHeightPx,
  };
}

// ============================================================
// Page Component
// ============================================================

export default function LprCalculatorPage() {
  const { grouped: lprDb, loading: devicesLoading } = useCalcDevices('lpr');
  const { data: shutterData, loading: shutterLoading } = useCalcReference('shutter_step');
  const { data: lprStdData } = useCalcReference('lpr_standard');

  // Build compatible data structures from API data
  const lprDbCompat: Record<string, Record<string, { resH: number; sensorH: number; fpsMax: number }>> = {};
  for (const [mfg, devices] of Object.entries(lprDb)) {
    lprDbCompat[mfg] = {};
    for (const d of devices) {
      const s = d.specs as any;
      lprDbCompat[mfg][d.model] = { resH: s.resH, sensorH: s.sensorH, fpsMax: s.fpsMax };
    }
  }
  const shutterSteps = shutterData.map(d => (d.data as any).value as number);
  const lprPpf = lprStdData.length > 0 ? ((lprStdData[0].data as any).value as number) : 32;

  const manufacturers = Object.keys(lprDbCompat);
  const [manufacturer, setManufacturer] = useState(manufacturers[0]);
  const models = Object.keys(lprDbCompat[manufacturer] || {});
  const [model, setModel] = useState(models[0] || '');
  const [heightFt, setHeightFt] = useState('12');
  const [distanceFt, setDistanceFt] = useState('70');
  const [speedMph, setSpeedMph] = useState('55');

  function handleManufacturerChange(mfr: string) {
    setManufacturer(mfr);
    const newModels = Object.keys(lprDbCompat[mfr] || {});
    setModel(newModels[0] || '');
  }

  const sensor = lprDbCompat[manufacturer]?.[model];
  const height = parseFloat(heightFt) || 0;
  const distance = parseFloat(distanceFt) || 0;
  const speed = parseFloat(speedMph) || 0;

  const result = useMemo(() => {
    if (!sensor || height <= 0 || distance <= 0 || speed <= 0 || shutterSteps.length === 0) return null;
    return calculateLpr(sensor, height, distance, speed, shutterSteps, lprPpf);
  }, [sensor, height, distance, speed, shutterSteps, lprPpf]);

  if (devicesLoading || shutterLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500">Loading LPR calculator data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LPR Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          NDAA-compliant license plate recognition setup — focal length, shutter speed, capture angle, and FPS analysis
        </p>
      </div>

      {/* NDAA Banner */}
      <div className="bg-green-50 border border-green-200 rounded px-4 py-2 mb-6">
        <span className="text-sm font-semibold text-green-800">SEC. 889 NDAA COMPLIANT</span>
        <span className="text-sm text-green-600 ml-2">All listed LPR cameras meet federal compliance requirements</span>
      </div>

      {/* Input Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">LPR Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="label">Manufacturer</label>
            <select
              className="input-field"
              value={manufacturer}
              onChange={(e) => handleManufacturerChange(e.target.value)}
            >
              {manufacturers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Camera Model</label>
            <select
              className="input-field"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mount Height (ft)</label>
            <input
              type="number"
              className="input-field"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              min={1}
              step={0.5}
            />
          </div>
          <div>
            <label className="label">Target Distance (ft)</label>
            <input
              type="number"
              className="input-field"
              value={distanceFt}
              onChange={(e) => setDistanceFt(e.target.value)}
              min={1}
              step={1}
            />
          </div>
          <div>
            <label className="label">Vehicle Speed (mph)</label>
            <input
              type="number"
              className="input-field"
              value={speedMph}
              onChange={(e) => setSpeedMph(e.target.value)}
              min={5}
              step={5}
            />
          </div>
        </div>

        {sensor && (
          <div className="mt-4 text-xs text-gray-400 flex gap-6">
            <span>Vertical Resolution: {sensor.resH}px</span>
            <span>Sensor Height: {sensor.sensorH}mm</span>
            <span>Max FPS: {sensor.fpsMax}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <ResultCard
              label="Required Lens"
              value={`${result.requiredFocalLength.toFixed(1)} mm`}
              sub="Focal length for 32 PPF"
            />
            <ResultCard
              label="Shutter Speed"
              value={result.shutterFraction}
              sub={`Motion freeze at ${speed} mph`}
            />
            <div className={`card p-4 border-l-4 ${result.anglePass ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <p className="text-xs text-gray-400 mb-1">Capture Angle</p>
              <p className={`text-lg font-bold ${result.anglePass ? 'text-green-700' : 'text-red-700'}`}>
                {result.verticalAngle.toFixed(1)} deg
              </p>
              <p className={`text-xs mt-1 ${result.anglePass ? 'text-green-600' : 'text-red-600'}`}>
                {result.anglePass ? 'PASS — Good OCR angle' : 'FAIL — Too steep for OCR'}
              </p>
            </div>
            <div className={`card p-4 border-l-4 ${result.fpsWarning ? 'border-l-amber-500' : 'border-l-green-500'}`}>
              <p className="text-xs text-gray-400 mb-1">Frame Rate</p>
              <p className="text-lg font-bold text-gray-900">{result.recommendedFps} fps</p>
              {result.fpsWarning ? (
                <p className="text-xs text-amber-600 mt-1">
                  Camera max: {sensor.fpsMax} fps — consider faster model
                </p>
              ) : (
                <p className="text-xs text-green-600 mt-1">Camera supports {sensor.fpsMax} fps</p>
              )}
            </div>
            <ResultCard
              label="Optical Coverage"
              value={result.opticalTarget}
              sub={`${(sensor.resH / lprPpf).toFixed(0)} ft coverage width`}
            />
          </div>

          {/* Detailed Analysis */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Geometry</h4>
                <DetailRow label="Mount Height" value={`${height.toFixed(1)} ft`} />
                <DetailRow label="Ground Distance" value={`${distance.toFixed(1)} ft`} />
                <DetailRow label="Slope Distance" value={`${result.slopeDistance.toFixed(1)} ft`} />
                <DetailRow label="Vertical Angle" value={`${result.verticalAngle.toFixed(1)} deg`} />
                <DetailRow
                  label="Angle Status"
                  value={result.anglePass ? 'PASS (<=30 deg)' : 'FAIL (>30 deg)'}
                  valueClass={result.anglePass ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}
                />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Optics</h4>
                <DetailRow label="Required Focal Length" value={`${result.requiredFocalLength.toFixed(1)} mm`} />
                <DetailRow label="LPR Standard" value={`${lprPpf} PPF (pixels/ft)`} />
                <DetailRow label="Plate Height" value={`${result.plateHeightPx} px`} />
                <DetailRow label="Coverage Width" value={`${(sensor.resH / lprPpf).toFixed(1)} ft`} />
                <DetailRow label="Optical Target" value={result.opticalTarget} />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Motion Control</h4>
                <DetailRow label="Vehicle Speed" value={`${speed} mph`} />
                <DetailRow label="Required Shutter" value={result.shutterFraction} />
                <DetailRow label="Raw Shutter Value" value={`1/${(speed * 20).toFixed(0)}s`} />
                <DetailRow label="Snapped to Step" value={result.shutterFraction} />
                <p className="text-xs text-gray-400">
                  Formula: 1 / (speed x 20) — ensures motion freeze
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Frame Rate</h4>
                <DetailRow label="Recommended FPS" value={`${result.recommendedFps} fps`} />
                <DetailRow label="Camera Max FPS" value={`${sensor.fpsMax} fps`} />
                <DetailRow
                  label="FPS Status"
                  value={result.fpsWarning ? 'Exceeds Camera Max' : 'Camera Capable'}
                  valueClass={result.fpsWarning ? 'text-amber-700 font-semibold' : 'text-green-700 font-semibold'}
                />
                <p className="text-xs text-gray-400">
                  60 fps recommended for speeds above 45 mph for reliable capture
                </p>
              </div>
            </div>
          </div>

          {/* Speed Reference Table */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Speed / Shutter Reference</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Speed (mph)</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Raw Shutter</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Recommended Shutter</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Recommended FPS</th>
                </tr>
              </thead>
              <tbody>
                {[15, 25, 35, 45, 55, 65, 75].map((s) => {
                  const raw = s * 20;
                  let snapped = shutterSteps[0];
                  for (const step of shutterSteps) {
                    if (step >= raw) { snapped = step; break; }
                    snapped = step;
                  }
                  const isActive = s === speed;
                  return (
                    <tr key={s} className={`border-b border-gray-100 ${isActive ? 'bg-primary-50' : ''}`}>
                      <td className="py-2 px-3 font-medium">{s}</td>
                      <td className="py-2 px-3 text-gray-500">1/{raw}s</td>
                      <td className="py-2 px-3 font-mono">1/{snapped}s</td>
                      <td className="py-2 px-3">{s > 45 ? '60' : '30'} fps</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!result && (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">Enter LPR configuration above to see capture analysis</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================

function ResultCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass || 'font-medium text-gray-900'}>{value}</span>
    </div>
  );
}
