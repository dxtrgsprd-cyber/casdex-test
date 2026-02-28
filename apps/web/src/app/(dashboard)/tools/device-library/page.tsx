'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { devicesApi, Device } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  camera: 'Camera',
  access_control: 'Access Control',
  networking: 'Networking',
  av: 'Audio / Video',
  sensor: 'Sensor',
  mount: 'Mount',
  accessory: 'Accessory',
};

const CATEGORY_COLORS: Record<string, string> = {
  camera: 'bg-blue-50 text-blue-700',
  access_control: 'bg-amber-50 text-amber-700',
  networking: 'bg-cyan-50 text-cyan-700',
  av: 'bg-violet-50 text-violet-700',
  sensor: 'bg-teal-50 text-teal-700',
  mount: 'bg-gray-100 text-gray-700',
  accessory: 'bg-orange-50 text-orange-700',
};

export default function DeviceLibraryPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = { status: 'active' };
      if (search) query.search = search;
      if (filterCategory) query.category = filterCategory;
      if (filterManufacturer) query.manufacturer = filterManufacturer;
      const res = await devicesApi.list(accessToken, query);
      setDevices(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, filterCategory, filterManufacturer]);

  const loadFilters = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [mfrs, cats] = await Promise.all([
        devicesApi.manufacturers(accessToken),
        devicesApi.categories(accessToken),
      ]);
      setManufacturers(mfrs.data);
      setCategories(cats.data);
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push('/tools')}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Tools
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-700">Device Library</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Device Library</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse the global device catalog ({devices.length} devices)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search model, part #, or manufacturer..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
          >
            <option value="">All Manufacturers</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Device List */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">No devices match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <div key={device.id} className="card">
              <button
                onClick={() => setExpandedId(expandedId === device.id ? null : device.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-medium text-gray-900 text-sm whitespace-nowrap">
                    {device.manufacturer}
                  </span>
                  <span className="text-sm text-gray-700 truncate">{device.model}</span>
                  <span className="text-xs text-gray-400 font-mono">{device.partNumber}</span>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[device.category] || 'bg-gray-100 text-gray-600'}`}>
                    {CATEGORY_LABELS[device.category] || device.category}
                  </span>
                  {device.ndaaCompliant && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      NDAA
                    </span>
                  )}
                  {device.resolution && (
                    <span className="text-xs text-gray-500">{device.resolution}</span>
                  )}
                  {device.formFactor && (
                    <span className="text-xs text-gray-400 capitalize">{device.formFactor}</span>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === device.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === device.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {device.description && (
                      <div className="col-span-2 md:col-span-4">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Description</span>
                        <p className="text-gray-700 mt-0.5">{device.description}</p>
                      </div>
                    )}
                    {device.focalLength && (
                      <div>
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Focal Length</span>
                        <p className="text-gray-700 mt-0.5">{device.focalLength}</p>
                      </div>
                    )}
                    {device.hfov != null && (
                      <div>
                        <span className="text-gray-400 text-xs uppercase tracking-wide">HFOV</span>
                        <p className="text-gray-700 mt-0.5">{device.hfov} degrees</p>
                      </div>
                    )}
                    {device.maxDistance != null && (
                      <div>
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Max Distance</span>
                        <p className="text-gray-700 mt-0.5">{device.maxDistance} ft</p>
                      </div>
                    )}
                    {device.imager && (
                      <div>
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Imager</span>
                        <p className="text-gray-700 mt-0.5">{device.imager}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">NDAA Compliance</span>
                      <p className="mt-0.5">
                        {device.ndaaCompliant ? (
                          <span className="text-green-700 font-medium text-xs">SEC. 889 Compliant</span>
                        ) : (
                          <span className="text-red-600 font-medium text-xs">Non-Compliant</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">Environment</span>
                      <p className="text-gray-700 mt-0.5">
                        {[
                          device.indoor && 'Indoor',
                          device.outdoor && 'Outdoor',
                          device.vandal && 'Vandal',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Not specified'}
                      </p>
                    </div>
                    {device.msrp != null && (
                      <div>
                        <span className="text-gray-400 text-xs uppercase tracking-wide">MSRP</span>
                        <p className="text-gray-700 mt-0.5">${device.msrp.toLocaleString()}</p>
                      </div>
                    )}
                    {Array.isArray(device.mountOptions) && device.mountOptions.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Compatible Mounts</span>
                        <p className="text-gray-700 mt-0.5 font-mono text-xs">
                          {device.mountOptions.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
