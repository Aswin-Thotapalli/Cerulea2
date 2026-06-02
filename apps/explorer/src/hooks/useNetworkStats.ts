'use client';

import { useState, useEffect } from 'react';
import type { NetworkStats } from '@cerulea/types';
import { fetchNetworkStats } from '@/lib/api/network';
import { useChainContext } from '@/context/ChainContext';

interface UseNetworkStatsResult {
  stats: NetworkStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNetworkStats(): UseNetworkStatsResult {
  const { chain } = useChainContext();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNetworkStats(chain)
      .then((data) => { if (!cancelled) { setStats(data); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e?.message ?? 'Failed to fetch stats'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chain, tick]);

  // Refresh every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return { stats, loading, error, refresh: () => setTick((t) => t + 1) };
}
