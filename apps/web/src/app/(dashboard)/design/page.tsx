'use client';

export default function DesignPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designs</h1>
          <p className="text-sm text-gray-500 mt-1">System designs and device layouts</p>
        </div>
        <button className="btn-primary">New Design</button>
      </div>

      <div className="card p-6">
        <p className="text-sm text-gray-500">
          Design canvas will display here. Current designs listed first, then active OPP designs.
        </p>
      </div>
    </div>
  );
}
