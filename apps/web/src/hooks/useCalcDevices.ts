'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { devicesApi, Device } from '@/lib/api';

type CalcType = 'fov' | 'lpr' | 'wireless' | 'power';

/**
 * Fetches devices with calculator-specific specs from the API,
 * grouped by manufacturer.
 */
export function useCalcDevices(calculatorType: CalcType) {
  const { accessToken } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Device[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await devicesApi.list(accessToken, { calculatorType });
      const items = res.data || [];
      setDevices(items);

      // Group by manufacturer
      const byMfg: Record<string, Device[]> = {};
      for (const d of items) {
        if (!byMfg[d.manufacturer]) byMfg[d.manufacturer] = [];
        byMfg[d.manufacturer].push(d);
      }
      setGrouped(byMfg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, calculatorType]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { devices, grouped, loading, error, refetch: fetch };
}
