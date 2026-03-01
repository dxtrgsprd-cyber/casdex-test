'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { MODULE_ITEMS, MODULE_KEY_TO_APP_MODULE, ModuleIcon } from '@/components/module-icons';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: 'Vendors', href: '/vendors', roles: ['org_admin', 'org_manager', 'sales', 'presales'] },
  { label: 'Subcontractors', href: '/subcontractors', roles: ['org_admin', 'org_manager', 'project_manager'] },
  { label: 'Tools', href: '/tools' },
  { label: 'Management', href: '/management' },
];

const SECONDARY_NAV_MODULE_MAP: Record<string, string> = {
  '/vendors': 'vendors',
  '/subcontractors': 'subcontractors',
  '/tools': 'tools',
  '/management': 'management',
};

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenant, roles, enabledModules, availableTenants, logout, switchTenant } = useAuthStore();
  const [showTenantSwitcher, setShowTenantSwitcher] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  async function handleSwitchTenant(tenantId: string) {
    await switchTenant(tenantId);
    setShowTenantSwitcher(false);
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center h-14 px-4">
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center mr-6 focus:outline-none"
        >
          <span className="text-xl font-bold text-gray-900 tracking-tight">CASDEX</span>
        </button>

        {/* Module Icon Navigation */}
        <nav className="flex items-center gap-1 flex-1">
          {MODULE_ITEMS
            .filter((item) => {
              const moduleName = MODULE_KEY_TO_APP_MODULE[item.key];
              if (!moduleName) return true;
              if (enabledModules.length === 0) return true;
              return enabledModules.includes(moduleName);
            })
            .map((item) => {
              const isActive = item.enabled && pathname.startsWith(item.href);
              return (
                <button
                  key={item.key}
                  onClick={() => item.enabled && router.push(item.href)}
                  disabled={!item.enabled}
                  title={item.enabled ? item.iconLabel : `${item.iconLabel} (coming soon)`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    !item.enabled
                      ? 'opacity-30 cursor-not-allowed text-gray-400'
                      : isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <ModuleIcon moduleKey={item.key} size={18} />
                  <span className="hidden lg:inline">{item.navLabel}</span>
                </button>
              );
            })}

          {/* Separator */}
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Secondary text tabs */}
          {SECONDARY_NAV_ITEMS
            .filter((item) => {
              if (item.roles && !item.roles.some((r) => roles.includes(r))) return false;
              const moduleName = SECONDARY_NAV_MODULE_MAP[item.href];
              if (moduleName && enabledModules.length > 0 && !enabledModules.includes(moduleName)) return false;
              return true;
            })
            .map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
        </nav>

        {/* Right side — tenant switcher + user menu + sign out */}
        <div className="flex items-center space-x-3">
          {/* Tenant Switcher */}
          {availableTenants.length > 1 && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowTenantSwitcher(!showTenantSwitcher);
                  setShowUserMenu(false);
                }}
                className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
              >
                {tenant?.name || 'Select Org'}
              </button>
              {showTenantSwitcher && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTenantSwitcher(false)} />
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    {availableTenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSwitchTenant(t.id)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          t.id === tenant?.id
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowTenantSwitcher(false);
              }}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      router.push('/management');
                      setShowUserMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push('/management?tab=password');
                      setShowUserMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Change Password
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
