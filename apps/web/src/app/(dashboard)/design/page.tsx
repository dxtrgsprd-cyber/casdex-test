'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { designsApi, DesignListItem, oppsApi, Opportunity } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  exported: 'Exported',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  exported: 'bg-purple-100 text-purple-700',
};

export default function DesignListPage() {
  const router = useRouter();
  const { accessToken, roles } = useAuthStore();
  const [designs, setDesigns] = useState<DesignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createOppId, setCreateOppId] = useState('');
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const canManage = roles.includes('admin') || roles.includes('manager') || roles.includes('presales');

  const loadDesigns = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (filterStatus) query.status = filterStatus;
      const res = await designsApi.list(accessToken, query);
      setDesigns(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, filterStatus]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  async function openCreate() {
    setCreateName('');
    setCreateOppId('');
    setError('');
    setShowCreate(true);
    // Load opportunities for linking
    if (accessToken) {
      try {
        const res = await oppsApi.list(accessToken, { status: 'active' });
        setOpps(res.data || []);
      } catch {
        setOpps([]);
      }
    }
  }

  async function handleCreate() {
    if (!accessToken) return;
    if (!createName.trim()) {
      setError('Design name is required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await designsApi.create(accessToken, {
        name: createName.trim(),
        oppId: createOppId || undefined,
      });
      setShowCreate(false);
      router.push(`/design/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create design');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designs</h1>
          <p className="text-sm text-gray-500 mt-1">System designs and device layouts</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary text-sm">
            New Design
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Search designs..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="exported">Exported</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading designs...</div>
        ) : designs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 mb-3">No designs found</p>
            {canManage && (
              <button onClick={openCreate} className="btn-primary text-sm">
                Create First Design
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Design Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Opportunity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Devices</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Updated</th>
              </tr>
            </thead>
            <tbody>
              {designs.map((design) => (
                <tr
                  key={design.id}
                  onClick={() => router.push(`/design/${design.id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{design.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {design.opportunity ? (
                      <span>
                        <span className="text-xs font-mono text-gray-400">{design.opportunity.oppNumber}</span>
                        <span className="ml-2 text-gray-600">{design.opportunity.customerName}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">V{design.version}</td>
                  <td className="px-4 py-3 text-gray-500">{design._count.placedDevices}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[design.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[design.status] || design.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {design.createdBy.firstName} {design.createdBy.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(design.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Design</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                x
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Design Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Main Campus Security System"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Link to Opportunity (optional)</label>
                <select
                  className="input-field"
                  value={createOppId}
                  onChange={(e) => setCreateOppId(e.target.value)}
                >
                  <option value="">No linked opportunity</option>
                  {opps.map((opp) => (
                    <option key={opp.id} value={opp.id}>
                      {opp.oppNumber} - {opp.customerName} - {opp.projectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
                {creating ? 'Creating...' : 'Create Design'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
