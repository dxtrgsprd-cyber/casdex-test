'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { oppsApi, Opportunity, OppMetrics } from '@/lib/api';
import { STATUS_LABELS, STATUS_COLORS } from './constants';

export default function OpportunitiesPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [metrics, setMetrics] = useState<OppMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (statusFilter) query.status = statusFilter;

      const [oppsRes, metricsRes] = await Promise.all([
        oppsApi.list(accessToken, query),
        oppsApi.metrics(accessToken),
      ]);
      setOpps(oppsRes.data);
      setMetrics(metricsRes.data);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500 mt-1">Manage leads and opportunities</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          New Opportunity
        </button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <MetricCard label="Open" value={metrics.totalOpen} />
          <MetricCard label="Active Projects" value={metrics.totalActive} />
          <MetricCard label="Won (Month)" value={metrics.wonThisMonth} accent="green" />
          <MetricCard label="Won (Year)" value={metrics.wonThisYear} accent="green" />
          <MetricCard label="Won (Total)" value={metrics.wonTotal} accent="green" />
          <MetricCard label="Closed (Month)" value={metrics.closedThisMonth} />
          <MetricCard label="Closed (Year)" value={metrics.closedThisYear} />
        </div>
      )}

      {/* Pipeline summary */}
      {metrics && metrics.byStatus.length > 0 && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Pipeline</h3>
          <div className="flex flex-wrap gap-2">
            {metrics.byStatus.map((s) => (
              <button
                key={s.status}
                onClick={() => setStatusFilter(statusFilter === s.status ? '' : s.status)}
                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === s.status
                    ? 'ring-2 ring-primary-500 ring-offset-1'
                    : ''
                } ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700'}`}
              >
                {STATUS_LABELS[s.status] || s.status} ({s.count})
              </button>
            ))}
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, project, or OPP number..."
          className="input-field max-w-md"
        />
      </div>

      {/* OPP List */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : opps.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No opportunities found.</p>
          <button className="btn-primary text-sm" onClick={() => setShowCreateModal(true)}>
            Create your first opportunity
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">OPP #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Project Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Territory</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">PN #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((opp) => (
                <tr
                  key={opp.id}
                  onClick={() => router.push(`/opportunities/${opp.id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-primary-600">{opp.oppNumber}</td>
                  <td className="px-4 py-3">{opp.customerName}</td>
                  <td className="px-4 py-3">{opp.projectName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[opp.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[opp.status] || opp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{opp.territory || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{opp.projectNumber || '-'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(opp.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create OPP Modal */}
      {showCreateModal && (
        <CreateOppModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'green' | 'red';
}) {
  const valueColor =
    accent === 'green'
      ? 'text-green-600'
      : accent === 'red'
        ? 'text-red-600'
        : 'text-gray-900';

  return (
    <div className="card p-3">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
    </div>
  );
}

function CreateOppModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    projectName: '',
    customerContact: '',
    customerEmail: '',
    customerPhone: '',
    systemName: '',
    installAddress: '',
    installCity: '',
    installState: '',
    installZip: '',
    projectDescription: '',
    notes: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);

    try {
      await oppsApi.create(accessToken, form);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create opportunity');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Opportunity</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Customer Name *</label>
              <input
                className="input-field"
                value={form.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Project Name *</label>
              <input
                className="input-field"
                value={form.projectName}
                onChange={(e) => updateField('projectName', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Contact</label>
              <input className="input-field" value={form.customerContact} onChange={(e) => updateField('customerContact', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" value={form.customerEmail} onChange={(e) => updateField('customerEmail', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.customerPhone} onChange={(e) => updateField('customerPhone', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">System Name</label>
            <input className="input-field" value={form.systemName} onChange={(e) => updateField('systemName', e.target.value)} placeholder="e.g. CCTV, ACS, Network" />
          </div>

          <div>
            <label className="label">Install Address</label>
            <input className="input-field" value={form.installAddress} onChange={(e) => updateField('installAddress', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">City</label>
              <input className="input-field" value={form.installCity} onChange={(e) => updateField('installCity', e.target.value)} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input-field" value={form.installState} onChange={(e) => updateField('installState', e.target.value)} />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="input-field" value={form.installZip} onChange={(e) => updateField('installZip', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Project Description</label>
            <textarea className="input-field" rows={3} value={form.projectDescription} onChange={(e) => updateField('projectDescription', e.target.value)} />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
