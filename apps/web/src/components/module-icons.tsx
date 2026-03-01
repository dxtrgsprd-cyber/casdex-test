export interface ModuleItem {
  key: string;
  iconLabel: string;
  navLabel: string;
  href: string;
  enabled: boolean;
}

// Maps MODULE_ITEMS keys to APP_MODULES names for enabled-module filtering
export const MODULE_KEY_TO_APP_MODULE: Record<string, string> = {
  'project-oversight': 'opportunities',
  'field-data': 'survey',
  'system-design': 'design',
  'scope-governance': 'projects',
};

export const MODULE_ITEMS: ModuleItem[] = [
  { key: 'project-oversight', iconLabel: 'Project Oversight', navLabel: 'Opportunities', href: '/opportunities', enabled: true },
  { key: 'field-data', iconLabel: 'Field Data', navLabel: 'Survey', href: '/survey', enabled: true },
  { key: 'system-design', iconLabel: 'System Design', navLabel: 'Design', href: '/design', enabled: true },
  { key: 'scope-governance', iconLabel: 'Scope Governance', navLabel: 'Projects', href: '/projects', enabled: true },
  { key: 'deployment-control', iconLabel: 'Deployment Control', navLabel: 'Deployment', href: '#', enabled: false },
];

export function ModuleIcon({ moduleKey, size = 24, className = '' }: { moduleKey: string; size?: number; className?: string }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className };

  switch (moduleKey) {
    // Project Oversight — bar chart
    case 'project-oversight':
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <rect x="7" y="10" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.2" />
          <rect x="12" y="6" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.2" />
          <rect x="17" y="3" width="3" height="15" rx="0.5" fill="currentColor" opacity="0.2" />
          <rect x="7" y="10" width="3" height="8" rx="0.5" />
          <rect x="12" y="6" width="3" height="12" rx="0.5" />
          <rect x="17" y="3" width="3" height="15" rx="0.5" />
        </svg>
      );

    // Field Data — clipboard with lines
    case 'field-data':
      return (
        <svg {...props}>
          <path d="M9 2h6a1 1 0 011 1v1H8V3a1 1 0 011-1z" fill="currentColor" opacity="0.2" />
          <rect x="5" y="4" width="14" height="18" rx="2" />
          <path d="M9 2h6a1 1 0 011 1v1H8V3a1 1 0 011-1z" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="9" y1="14" x2="15" y2="14" />
          <line x1="9" y1="18" x2="13" y2="18" />
        </svg>
      );

    // System Design — gear/cog
    case 'system-design':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );

    // Scope Governance — shield with check
    case 'scope-governance':
      return (
        <svg {...props}>
          <path d="M12 2l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z" fill="currentColor" opacity="0.15" />
          <path d="M12 2l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );

    // Deployment Control — box with outbound arrow
    case 'deployment-control':
      return (
        <svg {...props}>
          <rect x="2" y="7" width="14" height="14" rx="2" fill="currentColor" opacity="0.15" />
          <rect x="2" y="7" width="14" height="14" rx="2" />
          <path d="M18 2l4 4-4 4" />
          <path d="M14 10h8" />
        </svg>
      );

    default:
      return null;
  }
}
