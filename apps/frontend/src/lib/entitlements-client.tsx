'use client';

import * as React from 'react';
import type { Entitlement, FeatureKey, LimitKey } from '@/config/entitlements';
import { getClientDivision } from '@/lib/division-client';

const EMPTY: Entitlement = { features: [], limits: {} };

// Module-level cache keyed by division so multiple gates share one fetch.
const cache = new Map<string, Entitlement>();
const inflight = new Map<string, Promise<Entitlement>>();

async function fetchEntitlement(division: string): Promise<Entitlement> {
  if (cache.has(division)) return cache.get(division)!;
  if (inflight.has(division)) return inflight.get(division)!;
  const p = fetch(`/api/entitlements?division=${encodeURIComponent(division)}`, { credentials: 'same-origin' })
    .then((r) => r.json())
    .then((j) => {
      const ent: Entitlement = { features: j.features ?? [], limits: j.limits ?? {} };
      cache.set(division, ent);
      inflight.delete(division);
      return ent;
    })
    .catch(() => { inflight.delete(division); return EMPTY; });
  inflight.set(division, p);
  return p;
}

/** Live entitlement for the active division. `loading` until the fetch resolves. */
export function useEntitlements(): { entitlement: Entitlement; loading: boolean } {
  const [entitlement, setEntitlement] = React.useState<Entitlement>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const division = getClientDivision();
    if (!division) { setLoading(false); return; }
    let alive = true;
    fetchEntitlement(division).then((ent) => { if (alive) { setEntitlement(ent); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  return { entitlement, loading };
}

/** True if the active division's entitlement grants `feature`. */
export function useCan(feature: FeatureKey): boolean {
  const { entitlement } = useEntitlements();
  return entitlement.features.includes(feature);
}

/** Numeric limit for the active division (0 if none). */
export function useLimit(key: LimitKey): number {
  const { entitlement } = useEntitlements();
  return entitlement.limits[key] ?? 0;
}

/**
 * Gate children behind a feature. Renders `fallback` (default: nothing) when the
 * feature is not entitled. While loading, renders nothing to avoid a flash of
 * gated content.
 */
export function Gate({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { entitlement, loading } = useEntitlements();
  if (loading) return null;
  return entitlement.features.includes(feature) ? <>{children}</> : <>{fallback}</>;
}

/** Clears the cache (e.g. after a subscription change) so gates re-fetch. */
export function invalidateEntitlements() {
  cache.clear();
  inflight.clear();
}
