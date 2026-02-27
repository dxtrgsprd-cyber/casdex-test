'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Survey', href: '/survey' },
  { label: 'Design', href: '/design' },
  { label: 'Projects', href: '/projects' },
  { label: 'Vendors', href: '/vendors', roles: ['admin', 'manager', 'sales', 'presales'] },
  { label: 'Subcontractors', href: '/subcontractors', roles: ['admin', 'manager', 'project_manager'] },
  { label: 'Tools', href: '/tools' },
  { label: 'Management', href: '/management' },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenant, roles, availableTenants, logout, switchTenant } = useAuthStore();
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
          className="flex items-center mr-8 focus:outline-none"
        >
          <span className="text-xl font-bold text-gray-900 tracking-tight">CASDEX</span>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 flex-1">
          {NAV_ITEMS
            .filter((item) => {
              if (!item.roles) return true;
              return item.roles.some((r) => roles.includes(r));
            })
            .map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
