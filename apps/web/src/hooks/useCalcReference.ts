'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { calculatorDataApi, CalcReferenceDataItem } from '@/lib/api';

/**
 * Fetches calculator reference data by category from the API.
 * Pass a single category string or undefined to get all.
 */
export function useCalcReference(category?: string) {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<CalcReferenceDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await calculatorDataApi.listReference(accessToken, category);
      setData(res.data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, category]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
