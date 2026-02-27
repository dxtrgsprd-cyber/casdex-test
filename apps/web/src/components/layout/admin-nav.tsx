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
];

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
          <span className="text-xl font-bold text-white tracking-tight">CASDEX</span>
          <span className="ml-2 text-xs font-medium text-sidebar-text uppercase tracking-wider">
            Admin
          </span>
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
          {/* Switch to App */}
          <button
            onClick={() => router.push('/')}
            className="text-xs text-sidebar-text hover:text-white px-2 py-1 rounded border border-gray-600 hover:border-gray-500 transition-colors"
          >
            Go to App
          </button>

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
