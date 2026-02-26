'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  dashboardApi,
  DashboardData,
  CalendarEvent,
  DashboardUnassignedOpp,
} from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  opp_created: 'OPP Created',
  survey_scheduled: 'Survey Scheduled',
  survey_completed: 'Survey Completed',
  design_in_progress: 'Design In Progress',
  design_completed: 'Design Completed',
  rfp_sent: 'RFP Sent',
  ready_for_quoting: 'Ready for Quoting',
  quote_pending_approval: 'Quote Pending',
  quote_approved: 'Quote Approved',
  quote_declined: 'Quote Declined',
  customer_review: 'Customer Review',
  customer_approved: 'Customer Approved',
  customer_declined: 'Customer Declined',
  awaiting_po: 'Awaiting PO',
  po_received: 'PO Received',
  ready_for_project: 'Ready for Project',
  project_active: 'Project Active',
  installation: 'Installation',
  qc_in_progress: 'QC In Progress',
  qc_complete: 'QC Complete',
  closeout: 'Closeout',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  opp_created: 'bg-blue-100 text-blue-700',
  survey_scheduled: 'bg-purple-100 text-purple-700',
  survey_completed: 'bg-purple-200 text-purple-800',
  design_in_progress: 'bg-indigo-100 text-indigo-700',
  design_completed: 'bg-indigo-200 text-indigo-800',
  rfp_sent: 'bg-orange-100 text-orange-700',
  ready_for_quoting: 'bg-yellow-100 text-yellow-800',
  quote_pending_approval: 'bg-amber-100 text-amber-800',
  quote_approved: 'bg-green-100 text-green-700',
  quote_declined: 'bg-red-100 text-red-700',
  customer_review: 'bg-cyan-100 text-cyan-700',
  customer_approved: 'bg-green-200 text-green-800',
  customer_declined: 'bg-red-200 text-red-800',
  awaiting_po: 'bg-yellow-200 text-yellow-800',
  po_received: 'bg-green-100 text-green-700',
  ready_for_project: 'bg-teal-100 text-teal-700',
  project_active: 'bg-blue-200 text-blue-800',
  installation: 'bg-sky-100 text-sky-700',
  qc_in_progress: 'bg-violet-100 text-violet-700',
  qc_complete: 'bg-emerald-100 text-emerald-700',
  closeout: 'bg-emerald-200 text-emerald-800',
  closed_won: 'bg-green-300 text-green-900',
  closed_lost: 'bg-gray-200 text-gray-600',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  survey: 'bg-purple-100 text-purple-700 border-purple-200',
  ikom: 'bg-blue-100 text-blue-700 border-blue-200',
  ckom: 'bg-teal-100 text-teal-700 border-teal-200',
  due_date: 'bg-red-100 text-red-700 border-red-200',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  survey: 'Survey',
  ikom: 'IKOM',
  ckom: 'CKOM',
  due_date: 'Due Date',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  elevated: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, tenant, roles, accessToken } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await dashboardApi.get(accessToken);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-gray-500">
          Welcome back, {user?.firstName}. Unable to load dashboard data.
        </p>
        <button className="btn-secondary mt-4 text-sm" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {tenant?.name} — {roles.join(', ')}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard label="OPPs Assigned" value={metrics.oppsAssigned} />
        <MetricCard label="Surveys Scheduled" value={metrics.surveysScheduled} />
        <MetricCard label="OPPs In Progress" value={metrics.oppsInProgress} />
        <MetricCard label="Projects In Progress" value={metrics.projectsInProgress} />
        <MetricCard
          label="OPPs Completed"
          value={metrics.oppsCompleted.month}
          sub={`Year: ${metrics.oppsCompleted.year} | Total: ${metrics.oppsCompleted.total}`}
        />
        <MetricCard
          label="OPPs Won"
          value={metrics.oppsWon.month}
          sub={`Year: ${metrics.oppsWon.year} | Total: ${metrics.oppsWon.total}`}
          accent="green"
        />
      </div>

      {/* Second row: Projects Closed */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <MetricCard
          label="Projects Closed (Month)"
          value={metrics.projectsClosed.month}
        />
        <MetricCard
          label="Projects Closed (Year)"
          value={metrics.projectsClosed.year}
        />
        <MetricCard
          label="Projects Closed (Total)"
          value={metrics.projectsClosed.total}
        />
      </div>

      {/* Middle Row: Calendar + Risk + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Calendar Widget */}
        <div className="lg:col-span-2">
          <CalendarWidget events={data.calendarEvents} />
        </div>

        {/* Risk Widget */}
        <RiskWidget items={data.riskItems} />
      </div>

      {/* Vendor + Subcontractor + Documents Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <VendorWidget
          total={data.vendors.total}
          items={data.vendors.items}
        />
        <SubcontractorWidget
          total={data.subcontractors.total}
          items={data.subcontractors.items}
        />
        <DocumentWidget documents={data.recentDocuments} />
      </div>

      {/* Bottom: Unassigned Opportunities List */}
      <UnassignedOppsTable opps={data.unassignedOpps} />
    </div>
  );
}

// --- Metric Card ---
function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: 'green' | 'red';
}) {
  const valueColor =
    accent === 'green'
      ? 'text-green-600'
      : accent === 'red'
        ? 'text-red-600'
        : 'text-gray-900';

  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1 truncate">{sub}</p>}
    </div>
  );
}

// --- Calendar Widget ---
function CalendarWidget({ events }: { events: CalendarEvent[] }) {
  const [view, setView] = useState<'list' | 'month'>('list');

  // Group events by date for the month view
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    const dateKey = new Date(e.date).toISOString().split('T')[0];
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(e);
  }

  // Build calendar grid for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Calendar</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('list')}
            className={`px-2 py-1 text-xs rounded ${
              view === 'list'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-2 py-1 text-xs rounded ${
              view === 'month'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No upcoming events
            </p>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className={`flex items-start gap-3 p-2 rounded border text-sm ${
                  EVENT_TYPE_COLORS[e.type] || 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.title}</p>
                  <p className="text-xs opacity-75 truncate">{e.details}</p>
                </div>
                <div className="text-xs whitespace-nowrap text-right">
                  <p>{new Date(e.date).toLocaleDateString()}</p>
                  <p className="opacity-75">
                    {EVENT_TYPE_LABELS[e.type] || e.type}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2 text-center">
            {monthName}
          </p>
          <div className="grid grid-cols-7 gap-px text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1 font-medium text-gray-500">
                {d}
              </div>
            ))}
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="py-1" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateKey] || [];
              const isToday = day === today;

              return (
                <div
                  key={day}
                  className={`py-1 rounded relative ${
                    isToday ? 'bg-primary-50 font-bold text-primary-700' : ''
                  }`}
                  title={
                    dayEvents.length > 0
                      ? dayEvents.map((e) => e.title).join(', ')
                      : undefined
                  }
                >
                  {day}
                  {dayEvents.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`w-1 h-1 rounded-full ${
                            e.type === 'survey'
                              ? 'bg-purple-500'
                              : e.type === 'ikom'
                                ? 'bg-blue-500'
                                : e.type === 'ckom'
                                  ? 'bg-teal-500'
                                  : 'bg-red-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> Survey
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> IKOM
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-500" /> CKOM
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Due Date
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Risk Widget ---
function RiskWidget({
  items,
}: {
  items: DashboardData['riskItems'];
}) {
  const router = useRouter();

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Risk Alerts
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No elevated risk items
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                router.push(`/opportunities/${item.opportunity.id}`)
              }
              className="w-full text-left p-2 rounded border border-gray-100 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.opportunity.oppNumber}
                </p>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${
                    RISK_COLORS[item.riskLevel] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.riskLevel}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {item.opportunity.customerName} — {item.opportunity.projectName}
              </p>
              <p className="text-xs text-gray-400">
                Score: {item.overallScore.toFixed(1)} ({item.stage})
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Vendor Widget ---
function VendorWidget({
  total,
  items,
}: {
  total: number;
  items: DashboardData['vendors']['items'];
}) {
  const router = useRouter();

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Vendors</h3>
        <span className="text-xs text-gray-400">{total} active</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No vendors added
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((v) => (
            <div
              key={v.id}
              className="p-2 rounded border border-gray-100 text-sm"
            >
              <p className="font-medium text-gray-900 truncate">{v.name}</p>
              {v.category && (
                <p className="text-xs text-gray-500 capitalize">
                  {v.category.replace(/_/g, ' ')}
                </p>
              )}
              {v.contact && (
                <p className="text-xs text-gray-400 truncate">{v.contact}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => router.push('/vendors')}
        className="w-full mt-3 text-xs text-primary-600 hover:text-primary-800 font-medium"
      >
        View all vendors
      </button>
    </div>
  );
}

// --- Subcontractor Widget ---
function SubcontractorWidget({
  total,
  items,
}: {
  total: number;
  items: DashboardData['subcontractors']['items'];
}) {
  const router = useRouter();

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Subcontractors</h3>
        <span className="text-xs text-gray-400">{total} active</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No subcontractors added
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div
              key={s.id}
              className="p-2 rounded border border-gray-100 text-sm"
            >
              <p className="font-medium text-gray-900 truncate">
                {s.companyName}
              </p>
              {s.primaryContact && (
                <p className="text-xs text-gray-500 truncate">
                  {s.primaryContact}
                </p>
              )}
              {Array.isArray(s.trades) && s.trades.length > 0 && (
                <p className="text-xs text-gray-400 truncate">
                  {(s.trades as string[]).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => router.push('/subcontractors')}
        className="w-full mt-3 text-xs text-primary-600 hover:text-primary-800 font-medium"
      >
        View all subcontractors
      </button>
    </div>
  );
}

// --- Document Widget ---
function DocumentWidget({
  documents,
}: {
  documents: DashboardData['recentDocuments'];
}) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Recent Documents
      </h3>
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No documents yet
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-2 rounded border border-gray-100 text-sm"
            >
              <p className="font-medium text-gray-900 truncate">
                {doc.fileName}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-gray-500">
                  {doc.type} V{doc.version}
                </p>
                <div className="flex items-center gap-1">
                  {doc.isSigned && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      Signed
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {doc.opportunity && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {doc.opportunity.oppNumber} — {doc.opportunity.customerName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Unassigned OPPs Table (bottom of dashboard) ---
function UnassignedOppsTable({
  opps,
}: {
  opps: DashboardUnassignedOpp[];
}) {
  const router = useRouter();

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">
          Current Opportunities (No Project Number)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Sorted by oldest first. Click an OPP number to open details.
        </p>
      </div>

      {opps.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-400">
            All opportunities have been assigned project numbers, or no
            opportunities exist yet.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">
                OPP #
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">
                Customer
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">
                Project Name
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">
                Status
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">
                Territory
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {opps.map((opp) => (
              <tr
                key={opp.id}
                onClick={() => router.push(`/opportunities/${opp.id}`)}
                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2 font-medium text-primary-600">
                  {opp.oppNumber}
                </td>
                <td className="px-4 py-2 text-gray-700">{opp.customerName}</td>
                <td className="px-4 py-2 text-gray-700">{opp.projectName}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      STATUS_COLORS[opp.status] || 'bg-gray-100'
                    }`}
                  >
                    {STATUS_LABELS[opp.status] || opp.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {opp.territory || '-'}
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {new Date(opp.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
