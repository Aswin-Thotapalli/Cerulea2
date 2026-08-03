// apps/frontend/src/lib/billing/current-subscription.ts
//
// A user can hold up to one active subscription PER DIVISION. Billing routes
// must therefore scope to the division the request is for — not just grab an
// arbitrary `.limit(1)` row. The division comes from the cerulea.division cookie
// (set by middleware) with the Referer path as a fallback.

import { cookies, headers } from 'next/headers';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { divisionFromPath, type Division } from '@/config/divisions';

export function currentDivision(): Division | null {
  try {
    const c = cookies().get('cerulea.division')?.value;
    if (c === 'dapp' || c === 'enterprise' || c === 'govt') return c;
  } catch { /* no cookie store in this context */ }
  try {
    const ref = headers().get('referer') || '';
    const d = divisionFromPath(new URL(ref).pathname);
    if (d) return d;
  } catch { /* no referer */ }
  return null;
}

/**
 * The subscription row for the user in the current division. Falls back to the
 * most-recently-updated subscription when the division can't be resolved (so
 * the result is deterministic, never an arbitrary `.limit(1)`).
 */
export async function getCurrentSubscription(userId: string) {
  const division = currentDivision();
  const where = division
    ? and(eq(subscriptions.userId, userId), eq(subscriptions.division, division))
    : eq(subscriptions.userId, userId);
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(where)
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  return sub ?? null;
}
