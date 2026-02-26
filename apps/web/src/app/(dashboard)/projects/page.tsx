'use client';

export default function ProjectsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">Active and past projects</p>
      </div>

      <div className="grid gap-4">
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-2">Active Projects</h3>
          <p className="text-sm text-gray-500">No active projects.</p>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-2">Completed Projects</h3>
          <p className="text-sm text-gray-500">No completed projects.</p>
        </div>
      </div>
    </div>
  );
}
