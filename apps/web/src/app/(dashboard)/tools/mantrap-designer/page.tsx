'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  POWER_SPECS,
  CONTROLLER_BRANDS,
  LOCK_BRANDS,
} from '@/lib/access-control-rules';

// ===== Types =====

interface WireSpec {
  type: string;
  gauge: string;
  conductors: string;
  conduit: string;
}

interface SchematicResult {
  wiringSchedule: { component: string; spec: WireSpec }[];
  totalDraw: number;
  minPsu: number;
  conduitSummary: { emt: number; flex: number };
  schematicLines: string[];
  notes: string[];
}

const INTERCOM_BRANDS = ['Verkada', 'Avigilon', 'Aiphone'];

// ===== Calculation Logic =====

function calculateMantrap(
  ctrlBrand: string,
  ctrlModel: string,
  lock1Brand: string,
  lock1Model: string,
  lock2Brand: string,
  lock2Model: string,
  hasIntercom: boolean,
  intercomBrand: string,
  intercomModel: string,
  hasAdo: boolean,
): SchematicResult {
  const ctrlDraw = POWER_SPECS[ctrlBrand]?.[ctrlModel] ?? 0.5;
  const lock1Draw = POWER_SPECS[lock1Brand]?.[lock1Model] ?? 0.5;
  const lock2Draw = POWER_SPECS[lock2Brand]?.[lock2Model] ?? 0.5;

  let totalDraw = ctrlDraw + lock1Draw + lock2Draw;

  // Wiring schedule
  const wiringSchedule: { component: string; spec: WireSpec }[] = [
    {
      component: 'Controller (OSDP Reader)',
      spec: { type: 'Shielded OSDP', gauge: '22 AWG', conductors: '4C', conduit: '3/4" EMT' },
    },
    {
      component: `Door 1 Lock (${lock1Brand} ${lock1Model})`,
      spec: { type: 'Stranded', gauge: '18 AWG', conductors: '2C', conduit: '3/4" EMT' },
    },
    {
      component: 'Door 1 DPS/Status',
      spec: { type: 'Stranded', gauge: '22 AWG', conductors: '2C', conduit: '3/4" EMT' },
    },
    {
      component: 'Door 1 REX',
      spec: { type: 'Stranded', gauge: '22 AWG', conductors: '4C', conduit: '3/4" EMT' },
    },
    {
      component: `Door 2 Lock (${lock2Brand} ${lock2Model})`,
      spec: { type: 'Stranded', gauge: '18 AWG', conductors: '2C', conduit: '3/4" EMT' },
    },
    {
      component: 'Door 2 DPS/Status',
      spec: { type: 'Stranded', gauge: '22 AWG', conductors: '2C', conduit: '3/4" EMT' },
    },
    {
      component: 'Door 2 REX',
      spec: { type: 'Stranded', gauge: '22 AWG', conductors: '4C', conduit: '3/4" EMT' },
    },
    {
      component: 'Interlock Relay (Fire Alarm Tie)',
      spec: { type: 'Stranded', gauge: '18 AWG', conductors: '2C', conduit: '3/4" EMT' },
    },
  ];

  let emtCount = 8;
  let flexCount = 0;

  if (hasIntercom) {
    const icomDraw = POWER_SPECS[intercomBrand]?.[intercomModel] ?? 0.4;
    totalDraw += icomDraw;
    wiringSchedule.push({
      component: `Intercom (${intercomBrand} ${intercomModel})`,
      spec: { type: 'Shielded', gauge: '18 AWG', conductors: '4C', conduit: '3/4" EMT' },
    });
    emtCount++;
  }

  if (hasAdo) {
    totalDraw += 0.2; // ADO relay draw estimate
    wiringSchedule.push({
      component: 'Auto-Operator Door 1',
      spec: { type: 'Stranded', gauge: '18 AWG', conductors: '4C', conduit: '1/2" Flex' },
    });
    wiringSchedule.push({
      component: 'Auto-Operator Door 2',
      spec: { type: 'Stranded', gauge: '18 AWG', conductors: '4C', conduit: '1/2" Flex' },
    });
    flexCount += 2;
  }

  const minPsu = totalDraw * 1.25;

  // Schematic text lines
  const schematicLines: string[] = [
    '=== MANTRAP INTERLOCK SCHEMATIC ===',
    '',
    `  [${ctrlBrand} ${ctrlModel}]`,
    '       |',
    '       |--- OSDP (22AWG 4C Shielded)',
    '       |',
    '  [READER 1]          [READER 2]',
    '       |                   |',
    '  [INTERLOCK CONTROLLER]',
    '       |         |',
    `  [DOOR 1]     [DOOR 2]`,
    `  ${lock1Brand}   ${lock2Brand}`,
    `  ${lock1Model}   ${lock2Model}`,
    '       |         |',
    '  [DPS + REX]  [DPS + REX]',
    '       |         |',
    '  [FACP TIE-IN -- ALL LOCKS DROP ON FIRE ALARM]',
  ];

  if (hasIntercom) {
    schematicLines.push('       |');
    schematicLines.push(`  [INTERCOM: ${intercomBrand} ${intercomModel}]`);
  }

  if (hasAdo) {
    schematicLines.push('       |         |');
    schematicLines.push('  [ADO DOOR 1] [ADO DOOR 2]');
    schematicLines.push('  (BEA Br3-X Sequencer: Latch-then-Open)');
  }

  const notes: string[] = [
    'Both doors must never be unlocked simultaneously (interlock logic required).',
    'All locks must release on fire alarm activation (FACP dry contact tie-in).',
    'LASFM/NFPA 101: Mantrap interlocks must provide free egress path on fire alarm.',
    'PIR REX sensors required at each door for code-compliant egress.',
  ];

  if (hasAdo) {
    notes.push('ADA auto-operators require BEA Br3-X sequencer for latch-then-open timing.');
    notes.push('Sequencer prevents door from pulling against locked latch.');
  }

  notes.push('NDAA: Verify all access control hardware is SEC. 889 compliant.');

  return {
    wiringSchedule,
    totalDraw,
    minPsu,
    conduitSummary: { emt: emtCount, flex: flexCount },
    schematicLines,
    notes,
  };
}

// ===== Component =====

export default function MantrapDesignerPage() {
  const router = useRouter();

  const [ctrlBrand, setCtrlBrand] = useState('Verkada');
  const [ctrlModel, setCtrlModel] = useState('AC42');
  const [lock1Brand, setLock1Brand] = useState('Command Access');
  const [lock1Model, setLock1Model] = useState('ML1 Mortise');
  const [lock2Brand, setLock2Brand] = useState('Command Access');
  const [lock2Model, setLock2Model] = useState('ML1 Mortise');
  const [hasIntercom, setHasIntercom] = useState(false);
  const [intercomBrand, setIntercomBrand] = useState('Aiphone');
  const [intercomModel, setIntercomModel] = useState('IX-DV');
  const [hasAdo, setHasAdo] = useState(false);

  const ctrlModels = Object.keys(POWER_SPECS[ctrlBrand] || {});
  const lock1Models = Object.keys(POWER_SPECS[lock1Brand] || {});
  const lock2Models = Object.keys(POWER_SPECS[lock2Brand] || {});
  const intercomModels = Object.keys(POWER_SPECS[intercomBrand] || {}).filter(
    (m) => m.toLowerCase().includes('intercom') || m.startsWith('IX') || m.startsWith('IXG') || m.startsWith('TD')
  );
  // If no intercom-specific models, show all models for that brand
  const icomModelsToShow = intercomModels.length > 0 ? intercomModels : Object.keys(POWER_SPECS[intercomBrand] || {});

  const result = calculateMantrap(
    ctrlBrand, ctrlModel,
    lock1Brand, lock1Model,
    lock2Brand, lock2Model,
    hasIntercom, intercomBrand, intercomModel,
    hasAdo,
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
          <span className="text-sm font-medium text-gray-700">Mantrap Schematic Designer</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Mantrap Schematic Designer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wiring schedule, power calculation, and interlock schematic for mantrap door systems
        </p>
      </div>

      {/* Inputs */}
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Controller</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Door 1 */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Door 1 Lock</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Brand</label>
              <select
                className="input-field text-sm"
                value={lock1Brand}
                onChange={(e) => {
                  setLock1Brand(e.target.value);
                  const models = Object.keys(POWER_SPECS[e.target.value] || {});
                  setLock1Model(models[0] || '');
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
                value={lock1Model}
                onChange={(e) => setLock1Model(e.target.value)}
              >
                {lock1Models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Draw: {(POWER_SPECS[lock1Brand]?.[lock1Model] ?? 0.5).toFixed(2)}A @ 24VDC
          </p>
        </div>

        {/* Door 2 */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Door 2 Lock</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Brand</label>
              <select
                className="input-field text-sm"
                value={lock2Brand}
                onChange={(e) => {
                  setLock2Brand(e.target.value);
                  const models = Object.keys(POWER_SPECS[e.target.value] || {});
                  setLock2Model(models[0] || '');
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
                value={lock2Model}
                onChange={(e) => setLock2Model(e.target.value)}
              >
                {lock2Models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Draw: {(POWER_SPECS[lock2Brand]?.[lock2Model] ?? 0.5).toFixed(2)}A @ 24VDC
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Options</h3>
        <div className="flex flex-wrap gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hasIntercom}
              onChange={(e) => setHasIntercom(e.target.checked)}
              className="rounded border-gray-300"
            />
            Intercom
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAdo}
              onChange={(e) => setHasAdo(e.target.checked)}
              className="rounded border-gray-300"
            />
            ADA Auto-Operator (Both Doors)
          </label>
        </div>

        {hasIntercom && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Intercom Brand</label>
              <select
                className="input-field text-sm"
                value={intercomBrand}
                onChange={(e) => {
                  setIntercomBrand(e.target.value);
                  const models = Object.keys(POWER_SPECS[e.target.value] || {});
                  setIntercomModel(models[0] || '');
                }}
              >
                {INTERCOM_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Model</label>
              <select
                className="input-field text-sm"
                value={intercomModel}
                onChange={(e) => setIntercomModel(e.target.value)}
              >
                {icomModelsToShow.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Mantrap Analysis</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Draw</p>
            <p className="text-2xl font-bold text-gray-900">
              {result.totalDraw.toFixed(2)} <span className="text-sm font-normal text-gray-500">A</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">@ 24VDC</p>
          </div>
          <div className="card p-4 border-l-4 border-l-green-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Min PSU</p>
            <p className="text-2xl font-bold text-gray-900">
              {result.minPsu.toFixed(2)} <span className="text-sm font-normal text-gray-500">A</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">1.25x safety factor</p>
          </div>
          <div className="card p-4 border-l-4 border-l-amber-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">EMT Runs</p>
            <p className="text-2xl font-bold text-gray-900">{result.conduitSummary.emt}</p>
            <p className="text-xs text-gray-400 mt-1">3/4" EMT conduit</p>
          </div>
          <div className="card p-4 border-l-4 border-l-purple-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Flex Runs</p>
            <p className="text-2xl font-bold text-gray-900">{result.conduitSummary.flex}</p>
            <p className="text-xs text-gray-400 mt-1">1/2" Flex conduit</p>
          </div>
        </div>

        {/* Wiring Schedule Table */}
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
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Conduit</th>
                </tr>
              </thead>
              <tbody>
                {result.wiringSchedule.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{row.component}</td>
                    <td className="px-4 py-2 text-gray-700">{row.spec.type}</td>
                    <td className="px-4 py-2 text-gray-700">{row.spec.gauge}</td>
                    <td className="px-4 py-2 text-gray-700">{row.spec.conductors}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{row.spec.conduit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schematic */}
        <div className="card overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Interlock Schematic</h3>
          </div>
          <div className="p-4 bg-gray-900 rounded-b overflow-x-auto">
            <pre className="text-green-400 text-xs font-mono leading-relaxed whitespace-pre">
              {result.schematicLines.join('\n')}
            </pre>
          </div>
        </div>

        {/* Notes */}
        <div className="card overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Compliance Notes</h3>
          </div>
          <div className="p-4 space-y-2">
            {result.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-400 text-sm mt-0.5">--</span>
                <p className="text-sm text-gray-600">{note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Notes */}
        <div className="card p-4 bg-gray-50">
          <p className="text-xs text-gray-500">
            <strong>Notes:</strong> All wiring specifications are for 24VDC access control systems.
            Power draw values sourced from manufacturer datasheets. PSU sizing includes 25% safety factor
            for inrush current and simultaneous activation. Conduit sizing per NEC Article 344 (EMT) and
            Article 348 (Flex). Fire alarm interlock is mandatory per NFPA 101 for mantrap configurations.
          </p>
        </div>
      </div>
    </div>
  );
}
