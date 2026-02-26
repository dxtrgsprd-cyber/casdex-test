'use client';

import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const { user, tenant, roles } = useAuthStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {tenant?.name} &mdash; {roles.join(', ')}
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Opportunities" value="--" />
        <StatCard label="Surveys Scheduled" value="--" />
        <StatCard label="Active Projects" value="--" />
        <StatCard label="Completed This Month" value="--" />
      </div>

      {/* Recent Activity placeholder */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.firstName}. Your dashboard will populate as you create opportunities and projects.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
