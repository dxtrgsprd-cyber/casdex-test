'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, hydrate } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    hydrate();
    setChecked(true);
  }, [hydrate]);

  // Both global_admin and global_manager can access the admin portal
  const hasGlobalRole = !!user?.globalRole;

  useEffect(() => {
    if (checked && !isAuthenticated) {
      router.replace('/login');
    } else if (checked && isAuthenticated && !hasGlobalRole) {
      router.replace('/');
    }
  }, [checked, isAuthenticated, hasGlobalRole, router]);

  if (!checked || !isAuthenticated || !hasGlobalRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
