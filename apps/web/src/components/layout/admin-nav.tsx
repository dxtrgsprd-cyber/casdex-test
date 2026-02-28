'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useState } from 'react';

interface AdminNavItem {
  label: string;
  href: string;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Organizations', href: '/admin/tenants' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Device Library', href: '/admin/devices' },
];

function CasdexAdminLogo() {
  return (
    <div className="flex flex-col items-center leading-none">
      <span
        className="text-xl font-bold tracking-[0.15em]"
        style={{
          background: 'linear-gradient(180deg, #e8e8e8 0%, #b0b0b0 40%, #8a8a8a 60%, #c0c0c0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.15))',
        }}
      >
        CASDEX
      </span>
      <div
        className="w-full h-[2px] my-0.5 rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #a855f7 30%, #d946ef 50%, #a855f7 70%, transparent 100%)',
          boxShadow: '0 0 6px 1px rgba(168, 85, 247, 0.5), 0 0 12px 2px rgba(217, 70, 239, 0.25)',
        }}
      />
      <span
        className="text-[9px] font-semibold tracking-[0.25em] uppercase"
        style={{
          background: 'linear-gradient(180deg, #d0d0d0 0%, #999 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Platform
      </span>
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <header className="bg-sidebar-bg border-b border-gray-700 sticky top-0 z-50">
      <div className="flex items-center h-14 px-4">
        {/* Logo */}
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center mr-8 focus:outline-none"
        >
          <CasdexAdminLogo />
        </button>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 flex-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center text-sm text-sidebar-text hover:text-white"
            >
              <span className="w-8 h-8 rounded-full bg-sidebar-hover text-white flex items-center justify-center text-xs font-medium border border-gray-600">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </button>
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-primary-600 font-medium mt-0.5">
                      Global Admin
                    </p>
                  </div>
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
