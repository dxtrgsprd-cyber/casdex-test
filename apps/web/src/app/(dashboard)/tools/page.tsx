'use client';

import { useRouter } from 'next/navigation';

const TOOLS = [
  {
    title: 'Device Library',
    description:
      'Browse and search the full device catalog. Filter by manufacturer, category, form factor, and specifications.',
    href: '/tools/device-library',
    color: 'border-l-blue-500',
  },
  {
    title: 'System Calculator',
    description:
      'Calculate required storage, bandwidth, and server configuration based on camera count, resolution, FPS, and recording settings.',
    href: '/tools/system-calculator',
    color: 'border-l-green-500',
  },
  {
    title: 'Mount Selector',
    description:
      'Find compatible mounts and accessories for any camera in the device library. Select a device to see what fits.',
    href: '/tools/mount-selector',
    color: 'border-l-purple-500',
  },
  {
    title: 'FOV Calculator',
    description:
      'Field-of-view analysis for camera placement. Calculates lens selection, tilt angle, blind spot distance, and forensic quality assessment.',
    href: '/tools/fov-calculator',
    color: 'border-l-indigo-500',
  },
  {
    title: 'Mounting Calculator',
    description:
      'Generate mount hardware BOM by manufacturer, camera model, location type, and finish color. Includes adapter and bracket part numbers.',
    href: '/tools/mounting-calculator',
    color: 'border-l-orange-500',
  },
  {
    title: 'LPR Calculator',
    description:
      'License plate recognition setup tool. Calculates required focal length, shutter speed, capture angle, and frame rate for vehicle capture.',
    href: '/tools/lpr-calculator',
    color: 'border-l-red-500',
  },
  {
    title: 'Wireless PtP Calculator',
    description:
      'Wireless point-to-point link design. Includes capacity audit, rain fade analysis, remote site PoE budget, line-of-sight, and wind load.',
    href: '/tools/wireless-ptp',
    color: 'border-l-teal-500',
  },
];

export default function ToolsPage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
        <p className="text-sm text-gray-500 mt-1">
          System calculators, device library, and design utilities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.href}
            onClick={() => router.push(tool.href)}
            className={`card p-6 border-l-4 ${tool.color} hover:border-primary-300 hover:shadow-md cursor-pointer transition-all text-left`}
          >
            <h3 className="font-semibold text-gray-900 mb-2">{tool.title}</h3>
            <p className="text-sm text-gray-500">{tool.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
