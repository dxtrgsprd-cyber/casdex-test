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

  useEffect(() => {
    if (checked && !isAuthenticated) {
      router.replace('/login');
    } else if (checked && isAuthenticated && !user?.isGlobalAdmin) {
      router.replace('/');
    }
  }, [checked, isAuthenticated, user, router]);

  if (!checked || !isAuthenticated || !user?.isGlobalAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
