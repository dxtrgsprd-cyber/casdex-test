'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ===== Types =====

interface WireSpec {
  type: string;
  gauge: string;
  conductors: string;
}

interface BuildResult {
  state: string;
  doorType: string;
  electrical: {
    controllerDraw: number;
    lockDraw: number;
    totalDraw: number;
    minPsu: number;
  };
  wiringSchedule: { component: string; spec: WireSpec }[];
  violations: { code: string; message: string }[];
  recommendations: string[];
}

// ===== Constants =====

const POWER_SPECS: Record<string, Record<string, number>> = {
  Verkada: { AC42: 0.5, AC41: 0.4, 'TD52 Intercom': 0.45 },
  Brivo: { ACS6000: 0.6, ACS300: 0.3 },
  'Command Access': { 'ML1 Mortise': 0.15, 'LR Panic': 0.9 },
  Trine: { '3000 Strike': 0.24, '4800 Strike': 0.28 },
  HES: { '1006 Strike': 0.45, '9600 Surface': 0.45 },
  Avigilon: { 'Alta Reader': 0.2, 'Video Intercom': 0.6 },
  Aiphone: { 'IX-DV': 0.35, 'IXG-DM7': 0.5 },
};

const CONTROLLER_BRANDS = ['Verkada', 'Brivo', 'Avigilon'];
const LOCK_BRANDS = ['Command Access', 'Trine', 'HES'];

const DOOR_TYPES = [
  'Standard Interior',
  'Fire-Rated',
  'Fire-Rated Stairwell',
  'Glass Storefront',
  'Emergency Exit',
] as const;

const STATES = [
  'Louisiana (LASFM/NFPA 101)',
  'Texas (TFC/NFPA 101)',
  'Generic (IBC/NFPA 101)',
] as const;

// ===== Calculation Logic =====

function calculateBuild(
  ctrlBrand: string,
  ctrlModel: string,
  doorType: string,
  lockBrand: string,
  lockModel: string,
  hasAdo: boolean,
  isMantrap: boolean,
  state: string,
): BuildResult {
  const ctrlDraw = POWER_SPECS[ctrlBrand]?.[ctrlModel] ?? 0.5;
  const lockDraw = POWER_SPECS[lockBrand]?.[lockModel] ?? 0.5;
  let totalDraw = ctrlDraw + lockDraw;
  if (isMantrap) totalDraw *= 2; // Double hardware for two doors

  const minPsu = totalDraw * 1.3;

  // Wiring schedule
  const wiringSchedule: { component: string; spec: WireSpec }[] = [
    {
      component: 'Reader (OSDP)',
      spec: { type: 'Shielded OSDP', gauge: '22 AWG', conductors: '4C' },
    },
    {
      component: 'Lock',
      spec: { type: 'Stranded', gauge: '18 AWG', conductors: '2C' },
    },
    {
      component: 'DPS / Status',
      spec: { type: 'Stranded', gauge: '22 AWG', conductors: '2C' },
    },
  ];

  if (hasAdo) {
    wiringSchedule.push({
      component: 'Auto-Operator',
      spec: { type: 'Stranded', gauge: '18 AWG', conductors: '4C' },
    });
  }

  if (isMantrap) {
    // Add second set for door 2
    wiringSchedule.push(
      {
        component: 'Door 2 Reader (OSDP)',
        spec: { type: 'Shielded OSDP', gauge: '22 AWG', conductors: '4C' },
      },
      {
        component: 'Door 2 Lock',
        spec: { type: 'Stranded', gauge: '18 AWG', conductors: '2C' },
      },
      {
        component: 'Door 2 DPS / Status',
        spec: { type: 'Stranded', gauge: '22 AWG', conductors: '2C' },
      },
    );
    if (hasAdo) {
      wiringSchedule.push({
        component: 'Door 2 Auto-Operator',
        spec: { type: 'Stranded', gauge: '18 AWG', conductors: '4C' },
      });
    }
  }

  // Compliance
  const violations: { code: string; message: string }[] = [];
  const recommendations: string[] = [];

  // ADA
  recommendations.push('ADA: Mount readers and actuators between 34" and 48" AFF.');

  // Louisiana / NFPA 101
  if (state.includes('Louisiana')) {
    if (doorType.includes('Fire-Rated')) {
      recommendations.push('LASFM: Fail-Safe hardware required on fire-rated doors. Must tie to FACP for automatic release on fire alarm.');
    }
    if (lockModel.toLowerCase().includes('maglock') || lockModel.toLowerCase().includes('mag')) {
      violations.push({
        code: 'LASFM',
        message: 'Maglocks require PIR REX plus pneumatic push-to-exit for Louisiana State Fire Marshal compliance.',
      });
    }
    if (isMantrap) {
      recommendations.push('LASFM: Mantrap interlocks must drop all locks on fire alarm activation.');
    }
  }

  // Fire-rated general
  if (doorType.includes('Fire-Rated')) {
    recommendations.push('NFPA 80: Fire-rated doors require self-closing device. Verify door closer is installed.');
    recommendations.push('NFPA 101: Fail-Safe hardware ensures egress on power loss.');
  }

  // ADO integration
  if (hasAdo) {
    recommendations.push('ADA Integration: Use BEA Br3-X sequencer for latch-then-open timing with auto-operators.');
  }

  // Mantrap
  if (isMantrap) {
    recommendations.push('Interlock: Both doors must never be unlocked simultaneously. Interlock controller required.');
    recommendations.push('FACP: All locks must release on fire alarm (dry contact tie-in).');
  }

  // NDAA
  recommendations.push('NDAA: Verify all access control hardware is SEC. 889 compliant. Check manufacturer certification.');

  return {
    state,
    doorType,
    electrical: {
      controllerDraw: isMantrap ? ctrlDraw * 2 : ctrlDraw,
      lockDraw: isMantrap ? lockDraw * 2 : lockDraw,
      totalDraw,
      minPsu,
    },
    wiringSchedule,
    violations,
    recommendations,
  };
}

// ===== Component =====

export default function AccessControlBuilderPage() {
  const router = useRouter();

  const [ctrlBrand, setCtrlBrand] = useState('Verkada');
  const [ctrlModel, setCtrlModel] = useState('AC42');
  const [doorType, setDoorType] = useState<string>('Standard Interior');
  const [lockBrand, setLockBrand] = useState('Command Access');
  const [lockModel, setLockModel] = useState('ML1 Mortise');
  const [hasAdo, setHasAdo] = useState(false);
  const [isMantrap, setIsMantrap] = useState(false);
  const [state, setState] = useState<string>('Louisiana (LASFM/NFPA 101)');

  const ctrlModels = Object.keys(POWER_SPECS[ctrlBrand] || {});
  const lockModels = Object.keys(POWER_SPECS[lockBrand] || {});

  const result = calculateBuild(
    ctrlBrand, ctrlModel,
    doorType,
    lockBrand, lockModel,
    hasAdo, isMantrap,
    state,
  );

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
          <span className="text-sm font-medium text-gray-700">Access Control Door Builder</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Access Control Door Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete door build calculator -- electrical load, wiring schedule, and compliance audit
        </p>
      </div>

      {/* Inputs */}
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Door & Jurisdiction</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label text-xs">Door Type</label>
            <select
              className="input-field text-sm"
              value={doorType}
              onChange={(e) => setDoorType(e.target.value)}
            >
              {DOOR_TYPES.map((dt) => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">State / Jurisdiction</label>
            <select
              className="input-field text-sm"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Controller */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Controller</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Brand</label>
              <select
                className="input-field text-sm"
                value={ctrlBrand}
                onChange={(e) => {
                  setCtrlBrand(e.target.value);
                  const models = Object.keys(POWER_SPECS[e.target.value] || {});
                  setCtrlModel(models[0] || '');
                }}
              >
                {CONTROLLER_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Model</label>
              <select
                className="input-field text-sm"
                value={ctrlModel}
                onChange={(e) => setCtrlModel(e.target.value)}
              >
                {ctrlModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Draw: {(POWER_SPECS[ctrlBrand]?.[ctrlModel] ?? 0.5).toFixed(2)}A @ 24VDC
          </p>
        </div>

        {/* Lock */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Lock Hardware</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Brand</label>
              <select
                className="input-field text-sm"
                value={lockBrand}
                onChange={(e) => {
                  setLockBrand(e.target.value);
                  const models = Object.keys(POWER_SPECS[e.target.value] || {});
                  setLockModel(models[0] || '');
                }}
              >
                {LOCK_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Model</label>
              <select
                className="input-field text-sm"
                value={lockModel}
                onChange={(e) => setLockModel(e.target.value)}
              >
                {lockModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Draw: {(POWER_SPECS[lockBrand]?.[lockModel] ?? 0.5).toFixed(2)}A @ 24VDC
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Options</h3>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAdo}
              onChange={(e) => setHasAdo(e.target.checked)}
              className="rounded border-gray-300"
            />
            ADA Auto-Operator
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isMantrap}
              onChange={(e) => setIsMantrap(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mantrap (Doubles Hardware for Two Doors)
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Door Build Report</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Controller</p>
            <p className="text-lg font-bold text-gray-900">{result.electrical.controllerDraw.toFixed(2)}A</p>
            <p className="text-xs text-gray-400 mt-1">{ctrlBrand} {ctrlModel}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-cyan-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Lock(s)</p>
            <p className="text-lg font-bold text-gray-900">{result.electrical.lockDraw.toFixed(2)}A</p>
            <p className="text-xs text-gray-400 mt-1">{lockBrand} {lockModel}{isMantrap ? ' (x2)' : ''}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-amber-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Draw</p>
            <p className="text-2xl font-bold text-gray-900">
              {result.electrical.totalDraw.toFixed(2)} <span className="text-sm font-normal text-gray-500">A</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">@ 24VDC</p>
          </div>
          <div className="card p-4 border-l-4 border-l-green-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Min PSU</p>
            <p className="text-2xl font-bold text-gray-900">
              {result.electrical.minPsu.toFixed(2)} <span className="text-sm font-normal text-gray-500">A</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">1.3x safety factor</p>
          </div>
        </div>

        {/* Wiring Schedule */}
        <div className="card overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Wiring / Conductor Schedule</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Component</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Wire Type</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Gauge</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Conductors</th>
                </tr>
              </thead>
              <tbody>
                {result.wiringSchedule.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{row.component}</td>
                    <td className="px-4 py-2 text-gray-700">{row.spec.type}</td>
                    <td className="px-4 py-2 text-gray-700">{row.spec.gauge}</td>
                    <td className="px-4 py-2 text-gray-700">{row.spec.conductors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Violations */}
        {result.violations.length > 0 && (
          <div className="card overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <h3 className="text-sm font-semibold text-red-800">Compliance Violations</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {result.violations.map((v, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mt-0.5">
                    {v.code}
                  </span>
                  <p className="text-sm text-gray-700">{v.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="card overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Compliance Notes & Recommendations</h3>
          </div>
          <div className="p-4 space-y-2">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-400 text-sm mt-0.5">--</span>
                <p className="text-sm text-gray-600">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="card p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Configuration Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Door Type:</span>{' '}
              <span className="text-gray-700 font-medium">{doorType}</span>
            </div>
            <div>
              <span className="text-gray-400">Jurisdiction:</span>{' '}
              <span className="text-gray-700 font-medium">{state}</span>
            </div>
            <div>
              <span className="text-gray-400">Controller:</span>{' '}
              <span className="text-gray-700 font-medium">{ctrlBrand} {ctrlModel}</span>
            </div>
            <div>
              <span className="text-gray-400">Lock:</span>{' '}
              <span className="text-gray-700 font-medium">{lockBrand} {lockModel}</span>
            </div>
            <div>
              <span className="text-gray-400">Auto-Operator:</span>{' '}
              <span className="text-gray-700 font-medium">{hasAdo ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-400">Mantrap:</span>{' '}
              <span className="text-gray-700 font-medium">{isMantrap ? 'Yes (2 doors)' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="card p-4 bg-gray-50">
          <p className="text-xs text-gray-500">
            <strong>Notes:</strong> Power draw values sourced from manufacturer datasheets at 24VDC.
            PSU sizing includes 1.3x safety factor for inrush current and simultaneous activation.
            Wiring specifications are for standard runs under 200 feet. For longer runs, increase gauge
            per NEC voltage drop calculations. All hardware should be verified for NDAA SEC. 889 compliance.
            Compliance checks reference NFPA 101, NFPA 80, ADA standards, and state-specific fire marshal codes.
          </p>
        </div>
      </div>
    </div>
  );
}
