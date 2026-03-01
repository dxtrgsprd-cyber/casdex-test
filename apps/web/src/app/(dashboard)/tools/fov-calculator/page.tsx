'use client';

import { useState, useMemo } from 'react';

// ============================================================
// NDAA FOV Engine — Camera Sensor Database
// ============================================================

interface SensorSpec {
  resW: number;
  resH: number;
  sW: number; // sensor width mm
  sH: number; // sensor height mm
}

const FOV_DB: Record<string, Record<string, SensorSpec>> = {
  Hanwha: {
    'PNM-C12083RVD': { resW: 3328, resH: 1872, sW: 5.1, sH: 2.9 },
    'XND-8082RV':    { resW: 3072, resH: 1728, sW: 5.1, sH: 2.9 },
    'XNO-9083R':     { resW: 3840, resH: 2160, sW: 5.8, sH: 3.2 },
    'XND-6083RV':    { resW: 2048, resH: 1536, sW: 4.8, sH: 3.6 },
    'XNV-8082R':     { resW: 3072, resH: 1728, sW: 5.1, sH: 2.9 },
    'PNM-9322VQP':   { resW: 2560, resH: 1440, sW: 5.1, sH: 2.9 },
  },
  Axis: {
    'P3268-LVE':  { resW: 3840, resH: 2160, sW: 5.8, sH: 3.2 },
    'Q1656':      { resW: 2688, resH: 1512, sW: 5.3, sH: 3.0 },
    'M3116-LVE':  { resW: 2688, resH: 1512, sW: 5.3, sH: 3.0 },
    'P3265-LVE':  { resW: 1920, resH: 1080, sW: 4.8, sH: 2.7 },
    'Q6135-LE':   { resW: 1920, resH: 1080, sW: 4.8, sH: 2.7 },
  },
};

const PPF_PRESETS = [
  { value: 76, label: 'Identification (76 PPF)', desc: 'Face capture, forensic detail' },
  { value: 38, label: 'Recognition (38 PPF)', desc: 'Identify known individuals' },
  { value: 19, label: 'Observation (19 PPF)', desc: 'See activity and body movement' },
  { value: 10, label: 'Detection (10 PPF)', desc: 'Detect presence / motion only' },
];

// ============================================================
// Calculation Engine
// ============================================================

interface FovResult {
  slopeDistance: number;
  requiredWidthFt: number;
  focalLength: number;
  tiltAngle: number;
  vfov: number;
  hfov: number;
  lowerEdgeAngle: number;
  blindSpot: number;
  quality: string;
  qualityDetail: string;
  ppfLabel: string;
}

function calculateFov(
  sensor: SensorSpec,
  heightFt: number,
  distanceFt: number,
  targetPpf: number,
): FovResult {
  const slopeDistance = Math.sqrt(heightFt * heightFt + distanceFt * distanceFt);
  const requiredWidthFt = sensor.resW / targetPpf;
  const focalLength = (sensor.sW * slopeDistance) / requiredWidthFt;

  const tiltAngle = Math.atan(heightFt / distanceFt) * (180 / Math.PI);

  const vfov = 2 * Math.atan(sensor.sH / (2 * focalLength)) * (180 / Math.PI);
  const hfov = 2 * Math.atan(sensor.sW / (2 * focalLength)) * (180 / Math.PI);

  const lowerEdgeAngleDeg = tiltAngle + vfov / 2;
  const lowerEdgeAngleRad = lowerEdgeAngleDeg * (Math.PI / 180);
  const blindSpot = lowerEdgeAngleDeg < 90
    ? heightFt / Math.tan(lowerEdgeAngleRad)
    : 0;

  const quality = tiltAngle <= 30 ? 'OPTIMAL' : 'OVERVIEW';
  const qualityDetail = tiltAngle <= 30
    ? 'Face Capture — Angle allows forensic identification'
    : 'Steep Angle — Reduced facial detail, top-down perspective';

  const ppfPreset = PPF_PRESETS.find((p) => p.value === targetPpf);
  const ppfLabel = ppfPreset ? ppfPreset.label : `${targetPpf} PPF`;

  return {
    slopeDistance,
    requiredWidthFt,
    focalLength,
    tiltAngle,
    vfov,
    hfov,
    lowerEdgeAngle: lowerEdgeAngleDeg,
    blindSpot,
    quality,
    qualityDetail,
    ppfLabel,
  };
}

// ============================================================
// Page Component
// ============================================================

export default function FovCalculatorPage() {
  const manufacturers = Object.keys(FOV_DB);
  const [manufacturer, setManufacturer] = useState(manufacturers[0]);
  const models = Object.keys(FOV_DB[manufacturer] || {});
  const [model, setModel] = useState(models[0] || '');
  const [heightFt, setHeightFt] = useState('15');
  const [distanceFt, setDistanceFt] = useState('45');
  const [targetPpf, setTargetPpf] = useState(76);

  function handleManufacturerChange(mfr: string) {
    setManufacturer(mfr);
    const newModels = Object.keys(FOV_DB[mfr] || {});
    setModel(newModels[0] || '');
  }

  const sensor = FOV_DB[manufacturer]?.[model];
  const height = parseFloat(heightFt) || 0;
  const distance = parseFloat(distanceFt) || 0;

  const result = useMemo(() => {
    if (!sensor || height <= 0 || distance <= 0) return null;
    return calculateFov(sensor, height, distance, targetPpf);
  }, [sensor, height, distance, targetPpf]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">FOV Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          NDAA-compliant field-of-view analysis — lens selection, tilt angle, blind spot, and forensic quality assessment
        </p>
      </div>

      {/* NDAA Banner */}
      <div className="bg-green-50 border border-green-200 rounded px-4 py-2 mb-6">
        <span className="text-sm font-semibold text-green-800">SEC. 889 NDAA COMPLIANT</span>
        <span className="text-sm text-green-600 ml-2">All listed cameras meet federal compliance requirements</span>
      </div>

      {/* Input Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Camera Configuration</h2>
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
            <label className="label">Target PPF</label>
            <select
              className="input-field"
              value={targetPpf}
              onChange={(e) => setTargetPpf(Number(e.target.value))}
            >
              {PPF_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sensor specs display */}
        {sensor && (
          <div className="mt-4 text-xs text-gray-400 flex gap-6">
            <span>Resolution: {sensor.resW} x {sensor.resH}</span>
            <span>Sensor: {sensor.sW} x {sensor.sH} mm</span>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ResultCard
              label="Camera"
              value={`${manufacturer} ${model}`}
              sub={`${sensor.resW}x${sensor.resH}`}
            />
            <ResultCard
              label="Required Lens"
              value={`${result.focalLength.toFixed(1)} mm`}
              sub="Focal length"
            />
            <ResultCard
              label="PPF Goal"
              value={`${targetPpf} PPF`}
              sub={PPF_PRESETS.find((p) => p.value === targetPpf)?.desc || ''}
            />
            <ResultCard
              label="Installer Tilt"
              value={`${result.tiltAngle.toFixed(1)} deg`}
              sub="Angle down from horizontal"
            />
            <ResultCard
              label="Blind Spot"
              value={`${result.blindSpot.toFixed(1)} ft`}
              sub="From base of pole/wall"
            />
            <div className={`card p-4 border-l-4 ${result.quality === 'OPTIMAL' ? 'border-l-green-500' : 'border-l-amber-500'}`}>
              <p className="text-xs text-gray-400 mb-1">Forensic Quality</p>
              <p className={`text-lg font-bold ${result.quality === 'OPTIMAL' ? 'text-green-700' : 'text-amber-700'}`}>
                {result.quality}
              </p>
              <p className="text-xs text-gray-500 mt-1">{result.qualityDetail}</p>
            </div>
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
                <DetailRow label="Tilt Angle" value={`${result.tiltAngle.toFixed(1)} deg`} />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Optics</h4>
                <DetailRow label="Required Focal Length" value={`${result.focalLength.toFixed(1)} mm`} />
                <DetailRow label="Horizontal FOV" value={`${result.hfov.toFixed(1)} deg`} />
                <DetailRow label="Vertical FOV" value={`${result.vfov.toFixed(1)} deg`} />
                <DetailRow label="Coverage Width" value={`${result.requiredWidthFt.toFixed(1)} ft`} />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Blind Spot Analysis</h4>
                <DetailRow label="Lower Edge Angle" value={`${result.lowerEdgeAngle.toFixed(1)} deg`} />
                <DetailRow label="Blind Spot Distance" value={`${result.blindSpot.toFixed(1)} ft`} />
                <p className="text-xs text-gray-400">
                  Area directly below camera that cannot be captured. Lower focal length = smaller blind spot.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Quality Assessment</h4>
                <DetailRow
                  label="Forensic Status"
                  value={result.quality}
                  valueClass={result.quality === 'OPTIMAL' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}
                />
                <DetailRow label="PPF at Target" value={`${targetPpf} PPF`} />
                <p className="text-xs text-gray-400">{result.qualityDetail}</p>
              </div>
            </div>
          </div>

          {/* PPF Reference Table */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PPF Reference</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">PPF</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Quality Level</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Use Case</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Focal Length</th>
                </tr>
              </thead>
              <tbody>
                {PPF_PRESETS.map((preset) => {
                  const ppfResult = calculateFov(sensor, height, distance, preset.value);
                  const isSelected = preset.value === targetPpf;
                  return (
                    <tr
                      key={preset.value}
                      className={`border-b border-gray-100 ${isSelected ? 'bg-primary-50' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono font-semibold">{preset.value}</td>
                      <td className="py-2 px-3">{preset.label.split('(')[0].trim()}</td>
                      <td className="py-2 px-3 text-gray-500">{preset.desc}</td>
                      <td className="py-2 px-3 font-mono">{ppfResult.focalLength.toFixed(1)} mm</td>
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
          <p className="text-sm text-gray-500">Enter camera configuration and mounting parameters above to see FOV analysis</p>
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
