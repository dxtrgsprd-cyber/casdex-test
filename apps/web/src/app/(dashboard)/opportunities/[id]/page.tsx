'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { oppsApi, designsApi, Opportunity } from '@/lib/api';
import { StatusPipeline } from '@/components/ui/status-pipeline';

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead', opp_created: 'OPP Created', survey_scheduled: 'Survey Scheduled',
  survey_completed: 'Survey Completed', design_in_progress: 'Design In Progress',
  design_completed: 'Design Completed', rfp_sent: 'RFP Sent',
  ready_for_quoting: 'Ready for Quoting', quote_pending_approval: 'Quote Pending Approval',
  quote_approved: 'Quote Approved', quote_declined: 'Quote Declined',
  customer_review: 'Customer Review', customer_approved: 'Customer Approved',
  customer_declined: 'Customer Declined', awaiting_po: 'Awaiting PO',
  po_received: 'PO Received', ready_for_project: 'Ready for Project',
  project_active: 'Project Active', installation: 'Installation',
  qc_in_progress: 'QC In Progress', qc_complete: 'QC Complete',
  closeout: 'Closeout', closed_won: 'Closed Won', closed_lost: 'Closed Lost',
};

const TEAM_ROLE_LABELS: Record<string, string> = {
  isr: 'Inside Sales Rep', osr: 'Outside Sales Rep',
  presales_architect: 'Presales Architect', presales_engineer: 'Presales Engineer',
  project_manager: 'Project Manager', field_tech: 'Field Technician',
  subcontractor: 'Subcontractor',
};

const OPP_TABS = ['Overview', 'Team', 'Surveys', 'Designs', 'Documents', 'Risk', 'History'] as const;
type OppTab = (typeof OPP_TABS)[number];

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OppTab>('Overview');
  const [error, setError] = useState('');

  const oppId = params.id as string;

  const loadOpp = useCallback(async () => {
    if (!accessToken || !oppId) return;
    setLoading(true);
    try {
      const res = await oppsApi.get(accessToken, oppId);
      setOpp(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  }, [accessToken, oppId]);

  useEffect(() => {
    loadOpp();
  }, [loadOpp]);

  if (loading) {
    return <div className="text-sm text-gray-400 p-8">Loading...</div>;
  }

  if (error || !opp) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-red-600">{error || 'Opportunity not found'}</p>
        <button className="btn-secondary mt-4" onClick={() => router.push('/opportunities')}>
          Back to Opportunities
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => router.push('/opportunities')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          &larr; Back to Opportunities
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {opp.oppNumber}
              {opp.projectNumber && (
                <span className="text-lg text-gray-500 font-normal ml-2">/ {opp.projectNumber}</span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {opp.customerName} &mdash; {opp.projectName}
            </p>
          </div>
          <StatusBadge status={opp.status} />
        </div>
      </div>

      {/* Status Pipeline */}
      <StatusPipeline currentStatus={opp.status} />

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <QuickNavCard label="Surveys" count={opp._count.surveys} onClick={() => setActiveTab('Surveys')} />
        <QuickNavCard label="Designs" count={opp._count.designs} onClick={() => setActiveTab('Designs')} />
        <QuickNavCard label="Documents" count={opp._count.documents} onClick={() => setActiveTab('Documents')} />
        <QuickNavCard label="Team" count={opp.teamMembers.length} onClick={() => setActiveTab('Team')} />
        <QuickNavCard
          label="Risk"
          count={opp.riskAssessments.length > 0 ? opp.riskAssessments[0].riskLevel : 'N/A'}
          onClick={() => setActiveTab('Risk')}
        />
        <QuickNavCard
          label="Project"
          count={opp.project ? opp.project.status : 'N/A'}
          onClick={() => {
            if (opp.project) router.push(`/projects/${opp.project.id}`);
          }}
        />
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-4">
          {OPP_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && <OverviewTab opp={opp} onUpdate={loadOpp} />}
      {activeTab === 'Team' && <TeamTab opp={opp} onUpdate={loadOpp} />}
      {activeTab === 'Surveys' && <SurveysTab opp={opp} />}
      {activeTab === 'Designs' && <DesignsTab opp={opp} onRefresh={loadOpp} />}
      {activeTab === 'Documents' && <DocumentsTab opp={opp} />}
      {activeTab === 'Risk' && <RiskTab opp={opp} />}
      {activeTab === 'History' && <HistoryTab opp={opp} />}
    </div>
  );
}

// --- Status Badge ---
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    closed_won: 'bg-green-100 text-green-800',
    closed_lost: 'bg-gray-200 text-gray-600',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-blue-100 text-blue-800'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// --- Quick Nav Card ---
function QuickNavCard({ label, count, onClick }: { label: string; count: number | string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-3 text-left hover:border-primary-300 transition-colors">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">{count}</p>
    </button>
  );
}

// --- Overview Tab ---
function OverviewTab({ opp, onUpdate }: { opp: Opportunity; onUpdate: () => void }) {
  const { accessToken } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    oppNumber: opp.oppNumber,
    customerName: opp.customerName,
    customerContact: opp.customerContact || '',
    customerEmail: opp.customerEmail || '',
    customerPhone: opp.customerPhone || '',
    projectName: opp.projectName,
    systemName: opp.systemName || '',
    installAddress: opp.installAddress || '',
    installCity: opp.installCity || '',
    installState: opp.installState || '',
    installZip: opp.installZip || '',
    territory: opp.territory || '',
    projectDescription: opp.projectDescription || '',
    notes: opp.notes || '',
    poNumber: opp.poNumber || '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      await oppsApi.update(accessToken, opp.id, form);
      setEditing(false);
      onUpdate();
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left — main fields */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Opportunity Details</h3>
            {!editing ? (
              <button className="btn-secondary text-sm" onClick={() => setEditing(true)}>Edit</button>
            ) : (
              <div className="flex gap-2">
                <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="OPP Number" value={form.oppNumber} editing={editing} onChange={(v) => updateField('oppNumber', v)} />
            <Field label="Customer" value={form.customerName} editing={editing} onChange={(v) => updateField('customerName', v)} />
            <Field label="Project Name" value={form.projectName} editing={editing} onChange={(v) => updateField('projectName', v)} />
            <Field label="Contact" value={form.customerContact} editing={editing} onChange={(v) => updateField('customerContact', v)} />
            <Field label="Email" value={form.customerEmail} editing={editing} onChange={(v) => updateField('customerEmail', v)} />
            <Field label="Phone" value={form.customerPhone} editing={editing} onChange={(v) => updateField('customerPhone', v)} />
            <Field label="System Name" value={form.systemName} editing={editing} onChange={(v) => updateField('systemName', v)} />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Address" value={form.installAddress} editing={editing} onChange={(v) => updateField('installAddress', v)} />
            </div>
            <Field label="City" value={form.installCity} editing={editing} onChange={(v) => updateField('installCity', v)} />
            <Field label="State" value={form.installState} editing={editing} onChange={(v) => updateField('installState', v)} />
            <Field label="ZIP" value={form.installZip} editing={editing} onChange={(v) => updateField('installZip', v)} />
            <Field label="Territory" value={form.territory} editing={editing} onChange={(v) => updateField('territory', v)} />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Project Description</span>
              {editing ? (
                <textarea className="input-field mt-1" rows={3} value={form.projectDescription} onChange={(e) => updateField('projectDescription', e.target.value)} />
              ) : (
                <p className="text-sm mt-1">{form.projectDescription || '-'}</p>
              )}
            </div>
            <div>
              <span className="text-sm text-gray-500">Notes</span>
              {editing ? (
                <textarea className="input-field mt-1" rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
              ) : (
                <p className="text-sm mt-1">{form.notes || '-'}</p>
              )}
            </div>
            <Field label="PO Number" value={form.poNumber} editing={editing} onChange={(v) => updateField('poNumber', v)} />
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        <div className="card p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Info</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">OPP Number</span>
              <span className="font-medium">{opp.oppNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Project Number</span>
              <span className="font-medium">{opp.projectNumber || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created By</span>
              <span className="font-medium">{opp.createdBy.firstName} {opp.createdBy.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span>{new Date(opp.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated</span>
              <span>{new Date(opp.updatedAt).toLocaleDateString()}</span>
            </div>
            {opp.riskScore != null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Risk Score</span>
                <span className="font-medium">{opp.riskScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        {opp.approvals.filter((a) => a.status === 'pending').length > 0 && (
          <div className="card p-4 border-amber-300 bg-amber-50">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Pending Approvals</h4>
            {opp.approvals
              .filter((a) => a.status === 'pending')
              .map((a) => (
                <div key={a.id} className="text-sm text-amber-700 py-1">
                  {a.type.replace(/_/g, ' ')}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Reusable Field ---
function Field({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="text-sm text-gray-500">{label}</span>
      {editing ? (
        <input className="input-field mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="text-sm font-medium mt-1">{value || '-'}</p>
      )}
    </div>
  );
}

// --- Team Tab ---
function TeamTab({ opp, onUpdate }: { opp: Opportunity; onUpdate: () => void }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Team Members</h3>
        <button className="btn-primary text-sm">Add Member</button>
      </div>
      {opp.teamMembers.length === 0 ? (
        <p className="text-sm text-gray-500">No team members assigned.</p>
      ) : (
        <div className="space-y-3">
          {opp.teamMembers.map((tm) => (
            <div key={tm.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{tm.user.firstName} {tm.user.lastName}</p>
                <p className="text-xs text-gray-500">{tm.user.email}</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {TEAM_ROLE_LABELS[tm.role] || tm.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Surveys Tab ---
function SurveysTab({ opp }: { opp: Opportunity }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Surveys</h3>
        <button className="btn-primary text-sm">New Survey</button>
      </div>
      {opp.surveys.length === 0 ? (
        <p className="text-sm text-gray-500">No surveys for this opportunity.</p>
      ) : (
        <div className="space-y-2">
          {opp.surveys.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                {s.scheduledDate && <p className="text-xs text-gray-500">Scheduled: {new Date(s.scheduledDate).toLocaleDateString()}</p>}
              </div>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{s.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Designs Tab ---
function DesignsTab({ opp, onRefresh }: { opp: Opportunity; onRefresh: () => void }) {
  const router = useRouter();
  const { accessToken, roles } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const canManage = roles.includes('admin') || roles.includes('manager') || roles.includes('presales');

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    exported: 'bg-purple-100 text-purple-700',
  };

  async function handleCreate() {
    if (!accessToken || !createName.trim()) return;
    setCreating(true);
    try {
      const res = await designsApi.create(accessToken, {
        name: createName.trim(),
        oppId: opp.id,
      });
      setShowCreate(false);
      setCreateName('');
      onRefresh();
      router.push(`/design/${res.data.id}`);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Designs</h3>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            New Design
          </button>
        )}
      </div>
      {opp.designs.length === 0 ? (
        <p className="text-sm text-gray-500">No designs for this opportunity.</p>
      ) : (
        <div className="space-y-2">
          {opp.designs.map((d) => (
            <div
              key={d.id}
              onClick={() => router.push(`/design/${d.id}`)}
              className="flex items-center justify-between py-2 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer rounded transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{d.name} (V{d.version})</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-700'}`}>
                {d.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Inline create */}
      {showCreate && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Design name..."
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Documents Tab ---
function DocumentsTab({ opp }: { opp: Opportunity }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Documents</h3>
        <button className="btn-secondary text-sm">Upload Document</button>
      </div>
      {opp.documents.length === 0 ? (
        <p className="text-sm text-gray-500">No documents for this opportunity.</p>
      ) : (
        <div className="space-y-2">
          {opp.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{doc.fileName}</p>
                <p className="text-xs text-gray-500">{doc.type} - V{doc.version}</p>
              </div>
              <div className="flex items-center gap-2">
                {doc.isSigned && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Signed</span>}
                <span className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Risk Tab ---
function RiskTab({ opp }: { opp: Opportunity }) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Risk Assessments</h3>
      {opp.riskAssessments.length === 0 ? (
        <p className="text-sm text-gray-500">No risk assessments recorded.</p>
      ) : (
        <div className="space-y-3">
          {opp.riskAssessments.map((ra) => (
            <div key={ra.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium capitalize">{ra.stage} Assessment</p>
                <p className="text-xs text-gray-500">Score: {ra.overallScore.toFixed(1)}</p>
              </div>
              <RiskBadge level={ra.riskLevel} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    elevated: 'bg-orange-100 text-orange-700',
    high: 'bg-red-100 text-red-700',
    critical: 'bg-red-200 text-red-900',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${colors[level] || 'bg-gray-100 text-gray-700'}`}>
      {level}
    </span>
  );
}

// --- History Tab ---
function HistoryTab({ opp }: { opp: Opportunity }) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Status History</h3>
      {opp.statusHistory.length === 0 ? (
        <p className="text-sm text-gray-500">No history recorded.</p>
      ) : (
        <div className="space-y-3">
          {opp.statusHistory.map((h) => (
            <div key={h.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm">
                  {h.fromStatus ? (
                    <>
                      <span className="text-gray-500">{STATUS_LABELS[h.fromStatus] || h.fromStatus}</span>
                      {' -> '}
                    </>
                  ) : (
                    'Created as '
                  )}
                  <span className="font-medium">{STATUS_LABELS[h.toStatus] || h.toStatus}</span>
                </p>
                {h.reason && <p className="text-xs text-gray-500 mt-0.5">Reason: {h.reason}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{new Date(h.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
