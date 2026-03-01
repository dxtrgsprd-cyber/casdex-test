'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { calculatorDataApi, MountConfigData } from '@/lib/api';

/**
 * Fetches mount configuration data from the API,
 * optionally filtered by manufacturer.
 */
export function useMountConfigs(manufacturer?: string) {
  const { accessToken } = useAuthStore();
  const [configs, setConfigs] = useState<MountConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (manufacturer) query.manufacturer = manufacturer;
      const res = await calculatorDataApi.listMountConfigs(accessToken, query);
      setConfigs(res.data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, manufacturer]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { configs, loading, error, refetch: fetch };
}
