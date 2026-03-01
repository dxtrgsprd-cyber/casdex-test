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

export default function MountSelectorPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [cameras, setCameras] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [compatibleMounts, setCompatibleMounts] = useState<Device[]>([]);
  const [loadingMounts, setLoadingMounts] = useState(false);

  const loadCameras = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query: Record<string, string> = { status: 'active' };
      if (search) query.search = search;
      if (filterManufacturer) query.manufacturer = filterManufacturer;
      const res = await devicesApi.list(accessToken, query);
      // Show all device types that could have mount options, but primarily cameras
      setCameras(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, filterManufacturer]);

  const loadManufacturers = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await devicesApi.manufacturers(accessToken);
      setManufacturers(res.data);
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  useEffect(() => {
    loadManufacturers();
  }, [loadManufacturers]);

  async function selectDevice(device: Device) {
    if (!accessToken) return;
    setSelectedDevice(device);
    setLoadingMounts(true);
    try {
      const res = await devicesApi.mounts(accessToken, device.id);
      setCompatibleMounts(res.data);
    } catch {
      setCompatibleMounts([]);
    } finally {
      setLoadingMounts(false);
    }
  }

  function clearSelection() {
    setSelectedDevice(null);
    setCompatibleMounts([]);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => router.push('/tools')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Tools
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">Mount Selector</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Mount Selector</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a device to find compatible mounts and accessories
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Device Selection */}
        <div>
          <div className="card p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Select a Device</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Search model or part #..."
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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

          {loading ? (
            <div className="card p-8 text-center text-sm text-gray-400">Loading devices...</div>
          ) : cameras.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-500">No devices match your search</p>
            </div>
          ) : (
            <div className="card overflow-hidden max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Manufacturer</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Model</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Mounts</th>
                  </tr>
                </thead>
                <tbody>
                  {cameras.map((device) => {
                    const mountCount = Array.isArray(device.mountOptions)
                      ? device.mountOptions.length
                      : 0;
                    const isSelected = selectedDevice?.id === device.id;
                    return (
                      <tr
                        key={device.id}
                        onClick={() => selectDevice(device)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-50 border-l-2 border-l-primary-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-2 font-medium text-gray-900">{device.manufacturer}</td>
                        <td className="px-4 py-2 text-gray-700">{device.model}</td>
                        <td className="px-4 py-2 text-gray-500 capitalize">
                          {CATEGORY_LABELS[device.category] || device.category}
                        </td>
                        <td className="px-4 py-2">
                          {mountCount > 0 ? (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">
                              {mountCount}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Compatible Mounts */}
        <div>
          {selectedDevice ? (
            <div className="space-y-4">
              {/* Selected Device Info */}
              <div className="card p-4 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Selected Device</h3>
                  <button
                    onClick={clearSelection}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                </div>
                <p className="font-medium text-gray-900">
                  {selectedDevice.manufacturer} {selectedDevice.model}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-1">{selectedDevice.partNumber}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {selectedDevice.formFactor && (
                    <span className="capitalize">{selectedDevice.formFactor}</span>
                  )}
                  {selectedDevice.resolution && <span>{selectedDevice.resolution}</span>}
                  {selectedDevice.indoor && <span>Indoor</span>}
                  {selectedDevice.outdoor && <span>Outdoor</span>}
                </div>
              </div>

              {/* Mounts List */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Compatible Mounts & Accessories
                </h3>

                {loadingMounts ? (
                  <p className="text-sm text-gray-400">Loading compatible mounts...</p>
                ) : compatibleMounts.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-gray-500">
                      No compatible mounts found in the device library
                    </p>
                    {Array.isArray(selectedDevice.mountOptions) &&
                      selectedDevice.mountOptions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-1">
                            Listed mount part numbers (not yet in library):
                          </p>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {selectedDevice.mountOptions.map((pn) => (
                              <span
                                key={pn}
                                className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                              >
                                {pn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {compatibleMounts.map((mount) => (
                      <div
                        key={mount.id}
                        className="border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {mount.manufacturer} {mount.model}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {mount.partNumber}
                            </p>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                            {CATEGORY_LABELS[mount.category] || mount.category}
                          </span>
                        </div>
                        {mount.description && (
                          <p className="text-xs text-gray-500 mt-2">{mount.description}</p>
                        )}
                        {mount.msrp != null && (
                          <p className="text-xs text-gray-400 mt-1">
                            MSRP: ${mount.msrp.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raw mount options reference */}
              {Array.isArray(selectedDevice.mountOptions) &&
                selectedDevice.mountOptions.length > 0 && (
                  <div className="card p-4 bg-gray-50">
                    <p className="text-xs text-gray-500">
                      <strong>All listed mount part numbers:</strong>{' '}
                      {selectedDevice.mountOptions.join(', ')}
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-gray-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                Select a device from the list to see compatible mounts and accessories
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
