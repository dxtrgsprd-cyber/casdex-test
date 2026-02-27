'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { subcontractorsApi, Subcontractor } from '@/lib/api';

const COMMON_TRADES = [
  'Low Voltage',
  'Electrical',
  'Networking',
  'Fire Alarm',
  'Access Control',
  'CCTV',
  'AV',
  'Structured Cabling',
  'General Contractor',
];

const COMMON_TERRITORIES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function SubcontractorsPage() {
  const { accessToken } = useAuthStore();
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);
  const [total, setTotal] = useState(0);

  const loadSubs = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (tradeFilter) query.trade = tradeFilter;
      if (territoryFilter) query.territory = territoryFilter;
      if (showInactive) query.includeInactive = 'true';

      const res = await subcontractorsApi.list(accessToken, query);
      setSubs(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load subcontractors:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, tradeFilter, territoryFilter, showInactive]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  async function handleDeactivate(id: string) {
    if (!accessToken) return;
    try {
      await subcontractorsApi.delete(accessToken, id);
      loadSubs();
    } catch (err) {
      console.error('Failed to deactivate subcontractor:', err);
    }
  }

  async function handleReactivate(id: string) {
    if (!accessToken) return;
    try {
      await subcontractorsApi.reactivate(accessToken, id);
      loadSubs();
    } catch (err) {
      console.error('Failed to reactivate subcontractor:', err);
    }
  }

  function openEdit(sub: Subcontractor) {
    setEditingSub(sub);
    setShowModal(true);
  }

  function openCreate() {
    setEditingSub(null);
    setShowModal(true);
  }

  // Collect unique trades across all subcontractors for filter
  const allTrades = Array.from(
    new Set(subs.flatMap((s) => (Array.isArray(s.trades) ? s.trades : [])))
  ).sort();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subcontractors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage subcontractor relationships and assignments ({total} total)
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          Add Subcontractor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, contact, or email..."
          className="input-field max-w-xs"
        />
        <select
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          className="input-field max-w-[180px]"
        >
          <option value="">All Trades</option>
          {allTrades.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={territoryFilter}
          onChange={(e) => setTerritoryFilter(e.target.value)}
          className="input-field max-w-[160px]"
        >
          <option value="">All States</option>
          {COMMON_TERRITORIES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show inactive
        </label>
      </div>

      {/* Subcontractor List */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : subs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            {search || tradeFilter || territoryFilter
              ? 'No subcontractors match your filters.'
              : 'No subcontractors added yet.'}
          </p>
          {!search && !tradeFilter && !territoryFilter && (
            <button className="btn-primary text-sm" onClick={openCreate}>
              Add your first subcontractor
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trades</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Territories</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Insurance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => {
                const trades = Array.isArray(sub.trades) ? sub.trades : [];
                const territories = Array.isArray(sub.territories) ? sub.territories : [];
                const insuranceExpired = sub.insuranceExpiry
                  ? new Date(sub.insuranceExpiry) < new Date()
                  : false;

                return (
                  <tr
                    key={sub.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{sub.companyName}</div>
                      {sub.email && (
                        <div className="text-xs text-gray-500">{sub.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600">{sub.primaryContact || '-'}</div>
                      {sub.phone && (
                        <div className="text-xs text-gray-500">{sub.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {trades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {trades.map((t) => (
                            <span
                              key={t}
                              className="inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {territories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {territories.slice(0, 5).map((t) => (
                            <span
                              key={t}
                              className="inline-flex px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {t}
                            </span>
                          ))}
                          {territories.length > 5 && (
                            <span className="text-xs text-gray-500">
                              +{territories.length - 5} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub.insuranceExpiry ? (
                        <span
                          className={`text-xs ${insuranceExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}
                        >
                          {insuranceExpired ? 'Expired ' : 'Exp. '}
                          {new Date(sub.insuranceExpiry).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub.isActive ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(sub)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          Edit
                        </button>
                        {sub.isActive ? (
                          <button
                            onClick={() => handleDeactivate(sub.id)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(sub.id)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <SubcontractorModal
          sub={editingSub}
          onClose={() => {
            setShowModal(false);
            setEditingSub(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingSub(null);
            loadSubs();
          }}
        />
      )}
    </div>
  );
}

function SubcontractorModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: Subcontractor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuthStore();
  const isEditing = !!sub;
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tradeInput, setTradeInput] = useState('');

  const [form, setForm] = useState({
    companyName: sub?.companyName || '',
    primaryContact: sub?.primaryContact || '',
    email: sub?.email || '',
    phone: sub?.phone || '',
    trades: (Array.isArray(sub?.trades) ? sub.trades : []) as string[],
    territories: (Array.isArray(sub?.territories) ? sub.territories : []) as string[],
    insuranceExpiry: sub?.insuranceExpiry
      ? new Date(sub.insuranceExpiry).toISOString().split('T')[0]
      : '',
    licenseNumber: sub?.licenseNumber || '',
    notes: sub?.notes || '',
  });

  function updateField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTrade(trade: string) {
    const t = trade.trim();
    if (t && !form.trades.includes(t)) {
      updateField('trades', [...form.trades, t]);
    }
    setTradeInput('');
  }

  function removeTrade(trade: string) {
    updateField('trades', form.trades.filter((t) => t !== trade));
  }

  function toggleTerritory(state: string) {
    if (form.territories.includes(state)) {
      updateField('territories', form.territories.filter((t) => t !== state));
    } else {
      updateField('territories', [...form.territories, state]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        ...form,
        insuranceExpiry: form.insuranceExpiry || undefined,
      };

      if (isEditing) {
        await subcontractorsApi.update(accessToken, sub!.id, payload);
      } else {
        await subcontractorsApi.create(accessToken, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subcontractor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Subcontractor' : 'Add Subcontractor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Company Name *</label>
            <input
              className="input-field"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Primary Contact</label>
              <input
                className="input-field"
                value={form.primaryContact}
                onChange={(e) => updateField('primaryContact', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input-field"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
            <div>
              <label className="label">License Number</label>
              <input
                className="input-field"
                value={form.licenseNumber}
                onChange={(e) => updateField('licenseNumber', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Insurance Expiry</label>
            <input
              className="input-field max-w-xs"
              type="date"
              value={form.insuranceExpiry}
              onChange={(e) => updateField('insuranceExpiry', e.target.value)}
            />
          </div>

          {/* Trades */}
          <div>
            <label className="label">Trades</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.trades.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTrade(t)}
                    className="text-blue-400 hover:text-blue-600 ml-0.5"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={tradeInput}
                onChange={(e) => setTradeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTrade(tradeInput);
                  }
                }}
                placeholder="Type a trade and press Enter..."
                list="trade-suggestions"
              />
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => addTrade(tradeInput)}
              >
                Add
              </button>
            </div>
            <datalist id="trade-suggestions">
              {COMMON_TRADES.filter((t) => !form.trades.includes(t)).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* Territories */}
          <div>
            <label className="label">
              Territories ({form.territories.length} selected)
            </label>
            <div className="border border-gray-200 rounded-md p-3 max-h-32 overflow-y-auto">
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1">
                {COMMON_TERRITORIES.map((state) => (
                  <label
                    key={state}
                    className={`flex items-center justify-center p-1 rounded text-xs cursor-pointer transition-colors ${
                      form.territories.includes(state)
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.territories.includes(state)}
                      onChange={() => toggleTerritory(state)}
                      className="sr-only"
                    />
                    {state}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Subcontractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
