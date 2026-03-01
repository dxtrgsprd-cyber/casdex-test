'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { runComplianceAudit } from '@/lib/access-control-rules';
import { useCalcDevices } from '@/hooks/useCalcDevices';
import { useJurisdictions } from '@/hooks/useJurisdictions';
import { useCalcReference } from '@/hooks/useCalcReference';

export default function DoorCompliancePage() {
  const router = useRouter();

  // Hooks for API data
  const { devices: powerDevices, loading: powerLoading } = useCalcDevices('power');
  const { byLabel: jurisdictionsByLabel, jurisdictions: jurisdictionsList, loading: jurLoading } = useJurisdictions();
  const { data: doorTypeData, loading: dtLoading } = useCalcReference('door_type');
  const { data: lockTypeData } = useCalcReference('lock_type');
  const { data: rexTypeData } = useCalcReference('rex_type');
  const { data: controllerBrandData } = useCalcReference('controller_brand');
  const { data: lockBrandData } = useCalcReference('lock_brand');

  // Build compatible data structures from hook data
  const powerSpecs: Record<string, Record<string, number>> = {};
  for (const d of powerDevices) {
    const s = d.specs as any;
    if (!powerSpecs[d.manufacturer]) powerSpecs[d.manufacturer] = {};
    powerSpecs[d.manufacturer][d.model] = s.powerDrawAmps;
  }

  const stateKeys = jurisdictionsList.map(j => j.stateLabel);
  const doorTypes = doorTypeData.map(d => d.label);
  // Include Mantrap in door types for compliance auditor
  const doorTypesWithMantrap = doorTypes.includes('Mantrap') ? doorTypes : [...doorTypes, 'Mantrap'];
  const lockTypes = lockTypeData.map(d => d.label);
  const rexTypes = rexTypeData.map(d => d.label);

  const controllerBrandModels: Record<string, string[]> = {};
  for (const d of controllerBrandData) { controllerBrandModels[d.label] = ((d.data as any).models || []) as string[]; }

  const [doorType, setDoorType] = useState<string>('Standard Interior');
  const [state, setState] = useState<string>(stateKeys[0] || '');
  const [controllerBrand, setControllerBrand] = useState('Verkada');
  const [controllerModel, setControllerModel] = useState('AC42');
  const [lockType, setLockType] = useState<string>('Electric Strike (Fail-Secure)');
  const [hasRex, setHasRex] = useState(true);
  const [rexType, setRexType] = useState<string>('PIR Motion Sensor');
  const [hasDps, setHasDps] = useState(true);
  const [hasCloser, setHasCloser] = useState(false);

  const models = controllerBrandModels[controllerBrand] || [];

  const isLoading = powerLoading || jurLoading || dtLoading;

  const result = runComplianceAudit(doorType, state, {
    controllerBrand,
    controllerModel,
    lockType,
    hasRex,
    rexType,
    hasDps,
    hasCloser,
  }, jurisdictionsByLabel as any);

  const totalChecks = result.passCount + result.failCount;
  const violationCount = result.violations.filter((v) => v.severity === 'violation').length;
  const warningCount = result.violations.filter((v) => v.severity === 'warning').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Loading calculator data...</p>
      </div>
    );
  }

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
          <span className="text-sm font-medium text-gray-700">Door Compliance Auditor</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Door Compliance Auditor</h1>
        <p className="text-sm text-gray-500 mt-1">
          ADA, NFPA 101, and state fire marshal compliance checks for access-controlled doors
        </p>
      </div>

      {/* Inputs */}
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Door Configuration</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label text-xs">Door Type</label>
            <select
              className="input-field text-sm"
              value={doorType}
              onChange={(e) => setDoorType(e.target.value)}
            >
              {doorTypesWithMantrap.map((dt) => (
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
              {stateKeys.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Controller Brand</label>
            <select
              className="input-field text-sm"
              value={controllerBrand}
              onChange={(e) => {
                setControllerBrand(e.target.value);
                const newModels = controllerBrandModels[e.target.value] || [];
                setControllerModel(newModels[0] || '');
              }}
            >
              {Object.keys(controllerBrandModels).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Hardware Selection</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label text-xs">Controller Model</label>
            <select
              className="input-field text-sm"
              value={controllerModel}
              onChange={(e) => setControllerModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Lock Type</label>
            <select
              className="input-field text-sm"
              value={lockType}
              onChange={(e) => setLockType(e.target.value)}
            >
              {lockTypes.map((lt) => (
                <option key={lt} value={lt}>{lt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">REX Type</label>
            <select
              className="input-field text-sm"
              value={rexType}
              onChange={(e) => setRexType(e.target.value)}
              disabled={!hasRex}
            >
              {rexTypes.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hasRex}
              onChange={(e) => setHasRex(e.target.checked)}
              className="rounded border-gray-300"
            />
            REX Device
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDps}
              onChange={(e) => setHasDps(e.target.checked)}
              className="rounded border-gray-300"
            />
            Door Position Switch (DPS)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hasCloser}
              onChange={(e) => setHasCloser(e.target.checked)}
              className="rounded border-gray-300"
            />
            Door Closer
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Checks Run</p>
            <p className="text-2xl font-bold text-gray-900">{totalChecks}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-green-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Passed</p>
            <p className="text-2xl font-bold text-green-700">{result.passCount}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-red-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Violations</p>
            <p className="text-2xl font-bold text-red-700">{violationCount}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-amber-500">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Warnings</p>
            <p className="text-2xl font-bold text-amber-700">{warningCount}</p>
          </div>
        </div>

        {/* Overall Status */}
        <div className={`card p-4 border-l-4 ${violationCount > 0 ? 'border-l-red-600 bg-red-50' : 'border-l-green-600 bg-green-50'}`}>
          <p className={`text-sm font-semibold ${violationCount > 0 ? 'text-red-800' : 'text-green-800'}`}>
            {violationCount > 0
              ? `FAIL -- ${violationCount} violation(s) found. Hardware set does not meet compliance requirements.`
              : 'PASS -- No violations detected. Hardware set meets compliance requirements for the selected configuration.'}
          </p>
        </div>

        {/* Violations */}
        {result.violations.length > 0 && (
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Violations & Warnings</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {result.violations.map((v, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${
                    v.severity === 'violation'
                      ? 'bg-red-100 text-red-700'
                      : v.severity === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {v.severity === 'violation' ? 'VIOLATION' : v.severity === 'warning' ? 'WARNING' : 'INFO'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">[{v.code}]</p>
                    <p className="text-sm text-gray-600">{v.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Recommendations & Notes</h3>
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
        )}

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
              <span className="text-gray-700 font-medium">{controllerBrand} {controllerModel}</span>
            </div>
            <div>
              <span className="text-gray-400">Lock:</span>{' '}
              <span className="text-gray-700 font-medium">{lockType}</span>
            </div>
            <div>
              <span className="text-gray-400">REX:</span>{' '}
              <span className="text-gray-700 font-medium">{hasRex ? rexType : 'None'}</span>
            </div>
            <div>
              <span className="text-gray-400">DPS:</span>{' '}
              <span className="text-gray-700 font-medium">{hasDps ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-400">Closer:</span>{' '}
              <span className="text-gray-700 font-medium">{hasCloser ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-4 bg-gray-50">
          <p className="text-xs text-gray-500">
            <strong>Notes:</strong> This tool checks common ADA, NFPA 101 Life Safety Code, NFPA 80 Fire Door,
            and state fire marshal requirements. It does not replace a licensed fire protection engineer review.
            Always verify local AHJ (Authority Having Jurisdiction) requirements for your specific installation.
          </p>
        </div>
      </div>
    </div>
  );
}
