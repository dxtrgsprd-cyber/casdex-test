'use client';

export default function OpportunitiesPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500 mt-1">Manage leads and opportunities</p>
        </div>
        <button className="btn-primary">New Opportunity</button>
      </div>

      <div className="card p-6">
        <p className="text-sm text-gray-500">
          Opportunity list will display here. Sorted by date, oldest first.
        </p>
      </div>
    </div>
  );
}
