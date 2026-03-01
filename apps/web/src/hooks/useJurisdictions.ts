'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { calculatorDataApi, ComplianceJurisdictionData } from '@/lib/api';

/**
 * Fetches compliance jurisdiction data from the API.
 * Returns the jurisdictions as both an array and a keyed Record.
 */
export function useJurisdictions() {
  const { accessToken } = useAuthStore();
  const [jurisdictions, setJurisdictions] = useState<ComplianceJurisdictionData[]>([]);
  const [byLabel, setByLabel] = useState<Record<string, ComplianceJurisdictionData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await calculatorDataApi.listJurisdictions(accessToken);
      const items = res.data || [];
      setJurisdictions(items);

      // Build keyed lookup by stateLabel
      const lookup: Record<string, ComplianceJurisdictionData> = {};
      for (const j of items) {
        lookup[j.stateLabel] = j;
      }
      setByLabel(lookup);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { jurisdictions, byLabel, loading, error, refetch: fetch };
}
