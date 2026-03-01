'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useJurisdictions } from '@/hooks/useJurisdictions';
import { calculatorDataApi, ComplianceJurisdictionData } from '@/lib/api';
import {
  importComplianceRules,
  exportComplianceRules,
  type ComplianceRuleUpload,
} from '@/lib/access-control-rules';

export default function ComplianceRulesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { accessToken } = useAuthStore();

  const { jurisdictions, byLabel, loading, refetch } = useJurisdictions();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [webCheckState, setWebCheckState] = useState<string>('');
  const [webCheckResult, setWebCheckResult] = useState<string | null>(null);
  const [webCheckLoading, setWebCheckLoading] = useState(false);

  const stateKeys = jurisdictions.map((j) => j.stateLabel);
  const selected = selectedState ? byLabel[selectedState] : null;

  async function handleExport() {
    if (!accessToken) return;
    try {
      const res = await calculatorDataApi.exportJurisdictions(accessToken);
      const rules = res.data;
      const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-rules-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to client-side export
      const rules = exportComplianceRules();
      const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-rules-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: ComplianceRuleUpload[];

        if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter((l) => l.trim());
          if (lines.length < 2) {
            setUploadResult({ imported: 0, errors: ['CSV file must have a header row and at least one data row.'] });
            return;
          }
          const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
          parsed = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return {
              stateLabel: obj['stateLabel'] || obj['label'] || '',
              code: obj['code'] || '',
              authority: obj['authority'] || '',
              adoptedCodes: (obj['adoptedCodes'] || '').split(';').filter(Boolean),
              maglockRequiresPirRex: obj['maglockRequiresPirRex'] === 'true',
              maglockRequiresPneumaticPte: obj['maglockRequiresPneumaticPte'] === 'true',
              fireRatedFailSafeRequired: obj['fireRatedFailSafeRequired'] !== 'false',
              fireRatedCloserRequired: obj['fireRatedCloserRequired'] !== 'false',
              facpTieInRequired: obj['facpTieInRequired'] !== 'false',
              stairwellReIlluminationRequired: obj['stairwellReIlluminationRequired'] === 'true',
              panicHardwareOnEgressDoors: obj['panicHardwareOnEgressDoors'] !== 'false',
              additionalNotes: (obj['additionalNotes'] || '').split(';').filter(Boolean),
            };
          });
        } else {
          parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            parsed = [parsed];
          }
        }

        // Import via API
        const result = await calculatorDataApi.bulkImportJurisdictions(accessToken, parsed as Array<Partial<ComplianceJurisdictionData>>);
        setUploadResult({ imported: result.imported, errors: result.errors || [] });
        // Also update client-side constants for backward compatibility
        importComplianceRules(parsed);
        // Refresh from API
        refetch();
      } catch (err) {
        setUploadResult({ imported: 0, errors: [`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`] });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleWebCheck() {
    if (!webCheckState.trim()) return;
    setWebCheckLoading(true);
    setWebCheckResult(null);

    await new Promise((r) => setTimeout(r, 1500));

    const stateNormalized = webCheckState.trim().toLowerCase();
    const matchingKey = stateKeys.find((k) => k.toLowerCase().includes(stateNormalized));

    if (matchingKey) {
      const j = byLabel[matchingKey];
      setWebCheckResult(
        `Found: ${j.stateLabel}\n` +
        `Authority: ${j.authority}\n` +
        `Adopted Codes: ${(j.adoptedCodes || []).join(', ')}\n` +
        `Maglock PIR REX Required: ${j.maglockRequiresPirRex ? 'Yes' : 'No'}\n` +
        `Maglock Pneumatic PTE Required: ${j.maglockRequiresPneumaticPte ? 'Yes' : 'No'}\n` +
        `Fire-Rated Fail-Safe Required: ${j.fireRatedFailSafeRequired ? 'Yes' : 'No'}\n` +
        `FACP Tie-In Required: ${j.facpTieInRequired ? 'Yes' : 'No'}\n\n` +
        `Status: Rules loaded in system.`
      );
    } else {
      setWebCheckResult(
        `State "${webCheckState}" not found in current database.\n\n` +
        `To add this state:\n` +
        `1. Upload a JSON file with the state's compliance rules, or\n` +
        `2. Manually research the state fire marshal code and create a rule entry.\n\n` +
        `Most states adopt IFC/IBC 2021 with state amendments. Check:\n` +
        `-- State Fire Marshal website for adopted codes\n` +
        `-- ICC (iccsafe.org) for state code adoption map\n` +
        `-- NFPA for Life Safety Code (NFPA 101) adoption status`
      );
    }

    setWebCheckLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading compliance rules...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => router.push('/tools')} className="text-sm text-gray-400 hover:text-gray-600">Tools</button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">Compliance Rules Manager</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Rules Manager</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage state jurisdiction compliance rules -- upload, export, and verify fire code requirements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: State List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Jurisdictions ({stateKeys.length})</h3>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {jurisdictions.map((j) => (
                <button
                  key={j.stateLabel}
                  onClick={() => setSelectedState(j.stateLabel)}
                  className={`w-full text-left px-4 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedState === j.stateLabel ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{j.code}</p>
                  <p className="text-xs text-gray-400 truncate">{j.authority}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Upload / Export */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Import / Export</h3>
            <div className="space-y-2">
              <div>
                <label className="btn-primary text-sm cursor-pointer inline-block">
                  Upload Rules (JSON or CSV)
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <button onClick={handleExport} className="btn-secondary text-sm">
                Export All Rules (JSON)
              </button>
            </div>
            {uploadResult && (
              <div className={`p-3 rounded text-sm ${uploadResult.errors.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
                <p className="font-medium">Imported: {uploadResult.imported} rule(s)</p>
                {uploadResult.errors.map((err, i) => (
                  <p key={i} className="text-xs mt-1">{err}</p>
                ))}
              </div>
            )}
          </div>

          {/* Web Check */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Check State Code Online</h3>
            <p className="text-xs text-gray-500">Enter a state name to check if its fire code rules are loaded in the system.</p>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field text-sm flex-1"
                placeholder="e.g. Florida, New York..."
                value={webCheckState}
                onChange={(e) => setWebCheckState(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleWebCheck(); }}
              />
              <button
                onClick={handleWebCheck}
                disabled={webCheckLoading || !webCheckState.trim()}
                className="btn-primary text-sm"
              >
                {webCheckLoading ? 'Checking...' : 'Check'}
              </button>
            </div>
            {webCheckResult && (
              <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded font-mono whitespace-pre-wrap">
                {webCheckResult}
              </pre>
            )}
          </div>
        </div>

        {/* Right: State Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              <div className="card p-4">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{selected.stateLabel}</h2>
                <p className="text-sm text-gray-500">{selected.authority}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selected.adoptedCodes || []).map((code: string, i: number) => (
                    <span key={i} className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800">Rule Flags</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <FlagRow label="Maglock Requires PIR REX" value={selected.maglockRequiresPirRex} />
                  <FlagRow label="Maglock Requires Pneumatic PTE" value={selected.maglockRequiresPneumaticPte} />
                  <FlagRow label="Fire-Rated: Fail-Safe Required" value={selected.fireRatedFailSafeRequired} />
                  <FlagRow label="Fire-Rated: Closer Required" value={selected.fireRatedCloserRequired} />
                  <FlagRow label="FACP Tie-In Required" value={selected.facpTieInRequired} />
                  <FlagRow label="Stairwell Re-illumination" value={selected.stairwellReIlluminationRequired} />
                  <FlagRow label="Panic Hardware on Egress" value={selected.panicHardwareOnEgressDoors} />
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800">State-Specific Notes</h3>
                </div>
                <div className="p-4 space-y-2">
                  {(selected.additionalNotes || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No additional notes</p>
                  ) : (
                    (selected.additionalNotes || []).map((note: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-gray-400 text-sm mt-0.5">--</span>
                        <p className="text-sm text-gray-600">{note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-500">Select a jurisdiction from the list to view its compliance rules.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="card p-4 bg-gray-50 mt-6">
        <p className="text-xs text-gray-500">
          <strong>Notes:</strong> Compliance rules are used by the Door Builder, Compliance Auditor, and Design module.
          Upload JSON or CSV files to add new states. Export to back up your current rules. Web check verifies
          if a state is loaded in the system. Always verify local AHJ (Authority Having Jurisdiction) requirements
          for your specific installation.
        </p>
      </div>
    </div>
  );
}

function FlagRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {value ? 'Required' : 'Not Required'}
      </span>
    </div>
  );
}
