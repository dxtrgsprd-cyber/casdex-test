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

type TabType = 'ongoing' | 'completed';

export default function DesignListPage() {
  const router = useRouter();
  const { accessToken, roles } = useAuthStore();
  const [designs, setDesigns] = useState<DesignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('ongoing');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createOppId, setCreateOppId] = useState('');
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = roles.includes('org_admin') || roles.includes('org_manager') || roles.includes('presales');

  const loadDesigns = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      const res = await designsApi.list(accessToken, query);
      setDesigns(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // Filter designs by tab
  const ongoingStatuses = ['draft', 'in_progress'];
  const completedStatuses = ['completed', 'exported'];
  const filteredDesigns = designs.filter((d) =>
    activeTab === 'ongoing'
      ? ongoingStatuses.includes(d.status)
      : completedStatuses.includes(d.status)
  );

  const ongoingCount = designs.filter((d) => ongoingStatuses.includes(d.status)).length;
  const completedCount = designs.filter((d) => completedStatuses.includes(d.status)).length;

  async function openCreate() {
    setCreateName('');
    setCreateOppId('');
    setError('');
    setShowCreate(true);
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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (!accessToken) return;
    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await designsApi.delete(accessToken, id);
      }
      setSelectedIds(new Set());
      setDeleteConfirm(false);
      loadDesigns();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
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
      </div>

      {/* Action Bar */}
      <div className="card p-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="text"
              placeholder="Search designs..."
              className="input-field max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {canManage && selectedIds.size > 0 && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700"
              >
                Delete ({selectedIds.size})
              </button>
            )}
            <button
              className="btn-secondary text-sm opacity-50 cursor-not-allowed"
              disabled
              title="Coming soon"
            >
              Export
            </button>
            <button
              className="btn-secondary text-sm opacity-50 cursor-not-allowed"
              disabled
              title="Coming soon"
            >
              Import
            </button>
            {canManage && (
              <button onClick={openCreate} className="btn-primary text-sm">
                + New
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => { setActiveTab('ongoing'); setSelectedIds(new Set()); }}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ongoing'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ongoing ({ongoingCount})
          </button>
          <button
            onClick={() => { setActiveTab('completed'); setSelectedIds(new Set()); }}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading designs...</div>
      ) : filteredDesigns.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            {activeTab === 'ongoing' ? 'No ongoing designs' : 'No completed designs'}
          </p>
          {canManage && activeTab === 'ongoing' && (
            <button onClick={openCreate} className="btn-primary text-sm">
              Create First Design
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              className="card hover:shadow-md transition-shadow cursor-pointer relative"
            >
              {/* Selection checkbox */}
              {canManage && (
                <div className="absolute top-3 right-3 z-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedIds.has(design.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(design.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              <div
                onClick={() => router.push(`/design/${design.id}`)}
                className="p-4"
              >
                {/* OPP Number & Customer */}
                {design.opportunity ? (
                  <div className="mb-2">
                    <span className="text-xs font-mono text-gray-400">
                      {design.opportunity.oppNumber}
                    </span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-xs text-gray-500">
                      {design.opportunity.customerName}
                    </span>
                  </div>
                ) : (
                  <div className="mb-2">
                    <span className="text-xs text-gray-300">Standalone Design</span>
                  </div>
                )}

                {/* Design Name */}
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {design.name}
                </h3>

                {/* Bottom row: status, devices, date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[design.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[design.status] || design.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {design._count.placedDevices} devices
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(design.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Created by */}
                <p className="text-xs text-gray-400 mt-2">
                  by {design.createdBy.firstName} {design.createdBy.lastName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Designs</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete {selectedIds.size} design{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
