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
  survey: 'border-l-purple-500',
  ikom: 'border-l-blue-500',
  ckom: 'border-l-teal-500',
  due_date: 'border-l-red-500',
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
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">
          Welcome back, {user?.firstName}. Unable to load dashboard data.
        </p>
        <button
          className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={loadDashboard}
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tenant?.name} — {roles.join(', ')}
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Row 1: Top Metric Cards with colored accent bars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="OPPs Assigned"
          value={metrics.oppsAssigned}
          accent="blue"
        />
        <StatCard
          label="Surveys Scheduled"
          value={metrics.surveysScheduled}
          accent="purple"
        />
        <StatCard
          label="OPPs In Progress"
          value={metrics.oppsInProgress}
          accent="yellow"
        />
        <StatCard
          label="Projects Active"
          value={metrics.projectsInProgress}
          accent="cyan"
        />
        <StatCard
          label="OPPs Won (Month)"
          value={metrics.oppsWon.month}
          accent="green"
          sub={`Year: ${metrics.oppsWon.year} | All: ${metrics.oppsWon.total}`}
        />
        <StatCard
          label="OPPs Completed"
          value={metrics.oppsCompleted.month}
          accent="gray"
          sub={`Year: ${metrics.oppsCompleted.year} | All: ${metrics.oppsCompleted.total}`}
        />
      </div>

      {/* Row 2: Projects Closed (smaller row) */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Projects Closed (Month)"
          value={metrics.projectsClosed.month}
          accent="teal"
        />
        <StatCard
          label="Projects Closed (Year)"
          value={metrics.projectsClosed.year}
          accent="teal"
        />
        <StatCard
          label="Projects Closed (Total)"
          value={metrics.projectsClosed.total}
          accent="teal"
        />
      </div>

      {/* Row 3: Calendar (2/3) + Risk Alerts (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <CalendarWidget events={data.calendarEvents} />
        </div>
        <div className="lg:col-span-4">
          <RiskWidget items={data.riskItems} />
        </div>
      </div>

      {/* Row 4: Vendors, Subcontractors, Documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <VendorWidget total={data.vendors.total} items={data.vendors.items} />
        <SubcontractorWidget
          total={data.subcontractors.total}
          items={data.subcontractors.items}
        />
        <DocumentWidget documents={data.recentDocuments} />
      </div>

      {/* Row 5: Unassigned Opportunities Table */}
      <UnassignedOppsTable opps={data.unassignedOpps} />
    </div>
  );
}

// =============================================================================
// StatCard — Tabler-style metric card with colored top accent bar
// =============================================================================
function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: number;
  accent: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan' | 'teal' | 'gray';
  sub?: string;
}) {
  const accentColors: Record<string, string> = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-600',
    cyan: 'bg-cyan-600',
    teal: 'bg-teal-600',
    gray: 'bg-gray-400',
  };

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <div className={`h-1 ${accentColors[accent]}`} />
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        {sub && (
          <p className="text-[11px] text-gray-400 mt-1 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CalendarWidget — Tabler card with header + toggle
// =============================================================================
function CalendarWidget({ events }: { events: CalendarEvent[] }) {
  const [view, setView] = useState<'list' | 'month'>('list');

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    const dateKey = new Date(e.date).toISOString().split('T')[0];
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(e);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const monthName = now.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded border border-gray-200">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-800">Calendar</h3>
        <div className="flex border border-gray-200 rounded overflow-hidden">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'list'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${
              view === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        {view === 'list' ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                No upcoming events
              </p>
            ) : (
              events.map((e) => (
                <div
                  key={e.id}
                  className={`flex items-start gap-3 p-3 rounded bg-gray-50 border-l-4 ${
                    EVENT_TYPE_COLORS[e.type] || 'border-l-gray-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {e.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {e.details}
                    </p>
                  </div>
                  <div className="text-xs text-right whitespace-nowrap">
                    <p className="font-medium text-gray-700">
                      {new Date(e.date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-400 mt-0.5">
                      {EVENT_TYPE_LABELS[e.type] || e.type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
              {monthName}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div
                  key={d}
                  className="py-2 font-semibold text-gray-400 uppercase text-[10px]"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="py-2" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = eventsByDate[dateKey] || [];
                const isToday = day === today;

                return (
                  <div
                    key={day}
                    className={`py-2 rounded relative cursor-default ${
                      isToday
                        ? 'bg-primary-600 text-white font-bold'
                        : dayEvents.length > 0
                          ? 'bg-gray-100 font-medium text-gray-800'
                          : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title={
                      dayEvents.length > 0
                        ? dayEvents.map((ev) => ev.title).join(', ')
                        : undefined
                    }
                  >
                    {day}
                    {dayEvents.length > 0 && !isToday && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              ev.type === 'survey'
                                ? 'bg-purple-500'
                                : ev.type === 'ikom'
                                  ? 'bg-blue-500'
                                  : ev.type === 'ckom'
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
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Survey
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> IKOM
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" /> CKOM
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Due Date
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RiskWidget
// =============================================================================
function RiskWidget({ items }: { items: DashboardData['riskItems'] }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded border border-gray-200 h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-800">Risk Alerts</h3>
      </div>
      <div className="p-5 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            No elevated risk items
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  router.push(`/opportunities/${item.opportunity.id}`)
                }
                className="w-full text-left p-3 rounded border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {item.opportunity.oppNumber}
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${
                      RISK_COLORS[item.riskLevel] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {item.opportunity.customerName} —{' '}
                  {item.opportunity.projectName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Score: {item.overallScore.toFixed(1)} | {item.stage}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// VendorWidget
// =============================================================================
function VendorWidget({
  total,
  items,
}: {
  total: number;
  items: DashboardData['vendors']['items'];
}) {
  const router = useRouter();

  return (
    <div className="bg-white rounded border border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-800">Vendors</h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {total}
        </span>
      </div>
      <div className="p-5 flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No vendors added
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((v) => (
              <div key={v.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {v.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {Array.isArray(v.categories) && v.categories.length > 0 && (
                    <span className="text-[11px] text-gray-500 capitalize">
                      {(v.categories as string[]).map((c: string) => c.replace(/_/g, ' ')).join(', ')}
                    </span>
                  )}
                  {Array.isArray(v.contacts) && v.contacts.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-[11px] text-gray-400 truncate">
                        {(v.contacts[0] as { name?: string }).name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-gray-200">
        <button
          onClick={() => router.push('/vendors')}
          className="text-xs font-medium text-primary-600 hover:text-primary-800"
        >
          View all vendors
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// SubcontractorWidget
// =============================================================================
function SubcontractorWidget({
  total,
  items,
}: {
  total: number;
  items: DashboardData['subcontractors']['items'];
}) {
  const router = useRouter();

  return (
    <div className="bg-white rounded border border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-800">
          Subcontractors
        </h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {total}
        </span>
      </div>
      <div className="p-5 flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No subcontractors added
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((s) => (
              <div key={s.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {s.companyName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {Array.isArray(s.contacts) && s.contacts.length > 0 && (
                    <span className="text-[11px] text-gray-500 truncate">
                      {(s.contacts[0] as { name?: string }).name}
                    </span>
                  )}
                  {Array.isArray(s.trades) && s.trades.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-[11px] text-gray-400 truncate">
                        {(s.trades as string[]).join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-gray-200">
        <button
          onClick={() => router.push('/subcontractors')}
          className="text-xs font-medium text-primary-600 hover:text-primary-800"
        >
          View all subcontractors
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// DocumentWidget
// =============================================================================
function DocumentWidget({
  documents,
}: {
  documents: DashboardData['recentDocuments'];
}) {
  return (
    <div className="bg-white rounded border border-gray-200 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-800">
          Recent Documents
        </h3>
      </div>
      <div className="p-5 flex-1">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No documents yet
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">
                    {doc.fileName}
                  </p>
                  {doc.isSigned && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                      Signed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-500">
                    {doc.type} V{doc.version}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {doc.opportunity && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {doc.opportunity.oppNumber} — {doc.opportunity.customerName}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// UnassignedOppsTable — Tabler-style table card
// =============================================================================
function UnassignedOppsTable({
  opps,
}: {
  opps: DashboardUnassignedOpp[];
}) {
  const router = useRouter();

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-800">
          Current Opportunities (No Project Number)
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Sorted by oldest first. Click a row to open opportunity details.
        </p>
      </div>

      {opps.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-400">
            All opportunities have been assigned project numbers, or no
            opportunities exist yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  OPP #
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Territory
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opps.map((opp) => (
                <tr
                  key={opp.id}
                  onClick={() => router.push(`/opportunities/${opp.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 text-sm font-medium text-primary-600">
                    {opp.oppNumber}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {opp.customerName}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {opp.projectName}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[opp.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[opp.status] || opp.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {opp.territory || '-'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {new Date(opp.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
