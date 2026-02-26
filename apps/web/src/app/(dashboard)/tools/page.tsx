'use client';

export default function ToolsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
        <p className="text-sm text-gray-500 mt-1">System calculators and utilities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 hover:border-primary-300 cursor-pointer transition-colors">
          <h3 className="font-semibold text-gray-900 mb-2">System Calculator</h3>
          <p className="text-sm text-gray-500">
            Calculate required storage, bitrate, and server configuration based on camera count, resolution, FPS, and recording settings.
          </p>
        </div>
        <div className="card p-6 hover:border-primary-300 cursor-pointer transition-colors">
          <h3 className="font-semibold text-gray-900 mb-2">Mount Selector</h3>
          <p className="text-sm text-gray-500">
            Find compatible mounts and accessories by vendor, model, and mounting location.
          </p>
        </div>
      </div>
    </div>
  );
}
