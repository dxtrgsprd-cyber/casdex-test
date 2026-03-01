'use client';

import { useState, useMemo } from 'react';
import { useMountConfigs } from '@/hooks/useMountConfigs';

// ============================================================
// NDAA Mount Expert — Manufacturer Mount Databases
// ============================================================

type LocationType = 'Wall' | 'Corner' | 'Pole' | 'Flush';
type FinishColor = 'White' | 'Black';

interface MountBomEntry {
  component: string;
  partBase: string;
  description: string;
}

interface MountConfig {
  [location: string]: MountBomEntry[];
}

interface ModelOverride {
  [location: string]: MountBomEntry[];
}

interface ManufacturerMountDb {
  generic: MountConfig;
  models: Record<string, ModelOverride>;
  colorSuffix: Record<string, string>; // { White: 'W1', Black: 'B1' } etc.
  colorPattern: 'suffix' | 'replace-last'; // how color is applied to part numbers
}

const LOCATION_TYPES: LocationType[] = ['Wall', 'Corner', 'Pole', 'Flush'];
const FINISH_COLORS: FinishColor[] = ['White', 'Black'];

// ============================================================
// BOM Resolution Logic
// ============================================================

interface ResolvedBomLine {
  component: string;
  partNumber: string;
  description: string;
}

function resolveMountBom(
  db: Record<string, ManufacturerMountDb>,
  manufacturer: string,
  model: string,
  location: LocationType,
  color: FinishColor,
): ResolvedBomLine[] {
  const mfrDb = db[manufacturer];
  if (!mfrDb) return [];

  // Model-specific override first, then generic fallback
  const modelOverrides = mfrDb.models[model];
  const locationEntries = modelOverrides?.[location] || mfrDb.generic[location];
  if (!locationEntries) return [];

  const suffix = mfrDb.colorSuffix[color] || '';

  return locationEntries.map((entry) => {
    let partNumber = entry.partBase;
    if (mfrDb.colorPattern === 'suffix') {
      partNumber = entry.partBase + suffix;
    } else if (mfrDb.colorPattern === 'replace-last' && suffix) {
      partNumber = entry.partBase + suffix;
    }

    const colorLabel = color === 'White' ? '(White)' : '(Black)';
    return {
      component: entry.component,
      partNumber,
      description: `${entry.description} ${colorLabel}`,
    };
  });
}

// ============================================================
// Page Component
// ============================================================

export default function MountingCalculatorPage() {
  const { configs: mountData, loading: mountsLoading } = useMountConfigs();

  // Build MOUNT_DB-compatible hierarchical structure from flat API data
  const mountDbCompat: Record<string, ManufacturerMountDb> = {};
  for (const mc of mountData) {
    if (!mountDbCompat[mc.manufacturer]) {
      mountDbCompat[mc.manufacturer] = { generic: {}, models: {}, colorSuffix: mc.colorSuffix || {}, colorPattern: (mc.colorPattern || 'suffix') as 'suffix' | 'replace-last' };
    }
    const mfgData = mountDbCompat[mc.manufacturer];
    // Update color info from any entry
    if (mc.colorSuffix && Object.keys(mc.colorSuffix).length > 0) {
      mfgData.colorSuffix = mc.colorSuffix;
    }
    if (mc.colorPattern) mfgData.colorPattern = mc.colorPattern as 'suffix' | 'replace-last';

    if (!mc.cameraModel) {
      // Generic config
      mfgData.generic[mc.locationType] = mc.components;
    } else {
      // Model-specific config
      if (!mfgData.models[mc.cameraModel]) mfgData.models[mc.cameraModel] = {};
      mfgData.models[mc.cameraModel][mc.locationType] = mc.components;
    }
  }

  const manufacturers = Object.keys(mountDbCompat);
  const [manufacturer, setManufacturer] = useState(manufacturers[0] || '');
  const mfrDb = mountDbCompat[manufacturer];
  const modelNames = mfrDb ? ['Generic', ...Object.keys(mfrDb.models)] : ['Generic'];
  const [model, setModel] = useState('Generic');
  const [location, setLocation] = useState<LocationType>('Wall');
  const [color, setColor] = useState<FinishColor>('White');

  // Set defaults when data loads
  useMemo(() => {
    if (manufacturers.length > 0 && !manufacturer) {
      setManufacturer(manufacturers[0]);
    }
  }, [manufacturers.length]);

  function handleManufacturerChange(mfr: string) {
    setManufacturer(mfr);
    setModel('Generic');
  }

  const bomLines = useMemo(() => {
    const effectiveModel = model === 'Generic' ? '__generic__' : model;
    return resolveMountBom(mountDbCompat, manufacturer, effectiveModel, location, color);
  }, [manufacturer, model, location, color, mountData]);

  const hasModelOverride = model !== 'Generic' && mountDbCompat[manufacturer]?.models[model]?.[location];

  if (mountsLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mounting Calculator</h1>
          <p className="text-sm text-gray-500 mt-1">Loading mount configuration data...</p>
        </div>
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">Loading mount configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mounting Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          NDAA-compliant mount BOM generator — find the right adapter and bracket for any camera installation
        </p>
      </div>

      {/* NDAA Banner */}
      <div className="bg-green-50 border border-green-200 rounded px-4 py-2 mb-6">
        <span className="text-sm font-semibold text-green-800">SEC. 889 NDAA COMPLIANT</span>
        <span className="text-sm text-green-600 ml-2">All listed mounting hardware meets federal compliance requirements</span>
      </div>

      {/* Input Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mount Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              {modelNames.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Location Type</label>
            <select
              className="input-field"
              value={location}
              onChange={(e) => setLocation(e.target.value as LocationType)}
            >
              {LOCATION_TYPES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Finish / Color</label>
            <select
              className="input-field"
              value={color}
              onChange={(e) => setColor(e.target.value as FinishColor)}
            >
              {FINISH_COLORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {hasModelOverride && (
          <p className="text-xs text-blue-600 mt-3">
            Model-specific mount configuration applied for {model}
          </p>
        )}
        {model !== 'Generic' && !hasModelOverride && (
          <p className="text-xs text-gray-400 mt-3">
            No model-specific override for {model} {location} — using {manufacturer} generic mounts
          </p>
        )}
      </div>

      {/* BOM Output */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mounting Hardware BOM</h2>
        {bomLines.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Component</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Part Number</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody>
              {bomLines.map((line, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium text-gray-900">{line.component}</td>
                  <td className="py-3 px-3 font-mono text-sm text-primary-700">{line.partNumber}</td>
                  <td className="py-3 px-3 text-gray-500">{line.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No mount configuration available for this combination</p>
        )}
      </div>

      {/* Quick Reference — All Locations */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Reference — {manufacturer} {model !== 'Generic' ? model : 'Generic'} ({color})
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Location</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Components</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Part Numbers</th>
            </tr>
          </thead>
          <tbody>
            {LOCATION_TYPES.map((loc) => {
              const effectiveModel = model === 'Generic' ? '__generic__' : model;
              const lines = resolveMountBom(mountDbCompat, manufacturer, effectiveModel, loc, color);
              const isActive = loc === location;
              return (
                <tr
                  key={loc}
                  className={`border-b border-gray-100 ${isActive ? 'bg-primary-50' : ''}`}
                >
                  <td className="py-2 px-3 font-medium text-gray-900">{loc}</td>
                  <td className="py-2 px-3 text-gray-500">
                    {lines.map((l) => l.component).join(' + ')}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-600">
                    {lines.map((l) => l.partNumber).join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
