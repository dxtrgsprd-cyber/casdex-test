'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ===== Types =====

interface HardwareSet {
  controllerBrand: string;
  controllerModel: string;
  lockType: string;
  hasRex: boolean;
  rexType: string;
  hasDps: boolean;
  hasCloser: boolean;
}

interface Violation {
  code: string;
  message: string;
  severity: 'violation' | 'warning' | 'info';
}

interface AuditResult {
  doorType: string;
  state: string;
  hardware: HardwareSet;
  violations: Violation[];
  recommendations: string[];
  passCount: number;
  failCount: number;
}

// ===== Constants =====

const DOOR_TYPES = [
  'Standard Interior',
  'Fire-Rated',
  'Fire-Rated Stairwell',
  'Glass Storefront',
  'Emergency Exit',
  'Mantrap',
] as const;

const STATES = [
  'Louisiana (LASFM/NFPA 101)',
  'Texas (TFC/NFPA 101)',
  'Generic (IBC/NFPA 101)',
] as const;

const CONTROLLER_BRANDS: Record<string, string[]> = {
  Verkada: ['AC42', 'AC41'],
  Brivo: ['ACS6000', 'ACS300'],
  Avigilon: ['Alta_Reader'],
};

const LOCK_TYPES = [
  'Electric Strike (Fail-Secure)',
  'Electric Strike (Fail-Safe)',
  'Maglock (Fail-Safe)',
  'Mortise Lock (Fail-Secure)',
  'Mortise Lock (Fail-Safe)',
  'Panic Hardware - Electric Latch Retraction',
  'Panic Hardware - Electrified Trim',
] as const;

const REX_TYPES = [
  'PIR Motion Sensor',
  'Push Button',
  'Pneumatic Push-to-Exit Bar',
  'Touch Sense Bar',
] as const;

// ===== Audit Logic =====

function runAudit(doorType: string, state: string, hw: HardwareSet): AuditResult {
  const violations: Violation[] = [];
  const recommendations: string[] = [];
  let passCount = 0;
  let failCount = 0;

  // --- ADA Height Check ---
  recommendations.push('ADA: Mount readers and actuators between 34" and 48" AFF (Above Finished Floor).');
  passCount++;

  // --- REX Device Check ---
  if (!hw.hasRex) {
    violations.push({
      code: 'NFPA 101',
      message: 'Request-to-Exit (REX) device is required on all access-controlled doors for free egress.',
      severity: 'violation',
    });
    failCount++;
  } else {
    passCount++;
  }

  // --- DPS Check ---
  if (!hw.hasDps) {
    violations.push({
      code: 'BEST PRACTICE',
      message: 'Door Position Switch (DPS) not included. Forced-open and held-open alarms will not function.',
      severity: 'warning',
    });
    failCount++;
  } else {
    passCount++;
  }

  // --- Fire-Rated Door Rules ---
  const isFireRated = doorType.includes('Fire-Rated');
  if (isFireRated) {
    // Must be fail-safe
    if (!hw.lockType.includes('Fail-Safe')) {
      violations.push({
        code: 'NFPA 101 / LASFM',
        message: 'Fire-rated doors require Fail-Safe hardware. Lock must release on power loss to allow egress.',
        severity: 'violation',
      });
      failCount++;
    } else {
      passCount++;
    }

    // Must have closer
    if (!hw.hasCloser) {
      violations.push({
        code: 'NFPA 80',
        message: 'Fire-rated doors require a self-closing device (door closer). Frame integrity is compromised without one.',
        severity: 'violation',
      });
      failCount++;
    } else {
      passCount++;
    }

    recommendations.push('FACP Integration: Fail-Safe hardware on fire-rated doors must tie to the Fire Alarm Control Panel (FACP) for automatic release on alarm.');
  }

  // --- Emergency Exit Rules ---
  if (doorType === 'Emergency Exit') {
    if (hw.lockType.includes('Maglock')) {
      violations.push({
        code: 'NFPA 101',
        message: 'Maglocks on emergency exits require both PIR REX and a pneumatic push-to-exit device for code compliance.',
        severity: 'violation',
      });
      failCount++;

      if (hw.hasRex && hw.rexType !== 'PIR Motion Sensor') {
        violations.push({
          code: 'NFPA 101',
          message: 'REX type must be PIR Motion Sensor when using maglocks on emergency exits.',
          severity: 'warning',
        });
      }
    } else {
      passCount++;
    }

    recommendations.push('Emergency exits must provide unimpeded egress at all times per NFPA 101 Life Safety Code.');
  }

  // --- Maglock General Rules ---
  if (hw.lockType.includes('Maglock')) {
    if (state.includes('Louisiana')) {
      violations.push({
        code: 'LASFM',
        message: 'Louisiana State Fire Marshal: Maglocks require PIR REX plus pneumatic push-to-exit for compliance.',
        severity: 'violation',
      });
      failCount++;
    }
    recommendations.push('Maglocks are Fail-Safe by nature. Ensure backup power (UPS) if sustained locking is required during outages.');
  }

  // --- Mantrap Rules ---
  if (doorType === 'Mantrap') {
    recommendations.push('Mantrap interlock: Both doors must never be unlocked simultaneously. Interlock controller required.');
    if (isFireRated || state.includes('Louisiana')) {
      recommendations.push('LASFM/NFPA: Mantrap interlocks must drop all locks on Fire Alarm activation.');
    }
  }

  // --- Glass Storefront Rules ---
  if (doorType === 'Glass Storefront') {
    if (hw.lockType.includes('Maglock')) {
      recommendations.push('Glass storefront maglocks: Verify maglock holding force is rated for the door weight. Header-mount preferred over surface mount.');
    }
    if (!hw.hasCloser) {
      recommendations.push('Glass storefront doors typically require a closer or floor spring for controlled operation.');
    }
  }

  // --- Panic Hardware Rules ---
  if (hw.lockType.includes('Panic Hardware')) {
    passCount++;
    recommendations.push('Panic hardware provides mechanical free egress. Electric latch retraction adds remote unlock capability.');
    if (hw.lockType.includes('Electric Latch Retraction')) {
      recommendations.push('ELR devices draw higher current (0.9A typical). Verify PSU capacity and wire gauge (18 AWG 2C minimum).');
    }
  }

  // --- Closer Check for Non-Fire-Rated ---
  if (!isFireRated && hw.hasCloser) {
    passCount++;
    recommendations.push('Door closer installed. Verify ADA compliance: closing time must be >= 5 seconds from 90 degrees to 12 degrees.');
  }

  // --- NDAA Compliance Note ---
  recommendations.push('NDAA: Verify all access control hardware is SEC. 889 compliant. Check manufacturer NDAA certification status.');

  return {
    doorType,
    state,
    hardware: hw,
    violations,
    recommendations,
    passCount,
    failCount,
  };
}

// ===== Component =====

export default function DoorCompliancePage() {
  const router = useRouter();

  const [doorType, setDoorType] = useState<string>('Standard Interior');
  const [state, setState] = useState<string>('Louisiana (LASFM/NFPA 101)');
  const [controllerBrand, setControllerBrand] = useState('Verkada');
  const [controllerModel, setControllerModel] = useState('AC42');
  const [lockType, setLockType] = useState<string>('Electric Strike (Fail-Secure)');
  const [hasRex, setHasRex] = useState(true);
  const [rexType, setRexType] = useState<string>('PIR Motion Sensor');
  const [hasDps, setHasDps] = useState(true);
  const [hasCloser, setHasCloser] = useState(false);

  const models = CONTROLLER_BRANDS[controllerBrand] || [];

  const result = runAudit(doorType, state, {
    controllerBrand,
    controllerModel,
    lockType,
    hasRex,
    rexType,
    hasDps,
    hasCloser,
  });

  const totalChecks = result.passCount + result.failCount;
  const violationCount = result.violations.filter((v) => v.severity === 'violation').length;
  const warningCount = result.violations.filter((v) => v.severity === 'warning').length;

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
          <div>
            <label className="label text-xs">Controller Brand</label>
            <select
              className="input-field text-sm"
              value={controllerBrand}
              onChange={(e) => {
                setControllerBrand(e.target.value);
                const newModels = CONTROLLER_BRANDS[e.target.value] || [];
                setControllerModel(newModels[0] || '');
              }}
            >
              {Object.keys(CONTROLLER_BRANDS).map((b) => (
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
              {LOCK_TYPES.map((lt) => (
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
              {REX_TYPES.map((rt) => (
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
            Louisiana checks follow LASFM (Louisiana State Fire Marshal) amendments to NFPA 101.
          </p>
        </div>
      </div>
    </div>
  );
}
