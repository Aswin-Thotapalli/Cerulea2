// apps/frontend/src/lib/entitlements-server.ts
//
// Server-side resolution of a user's EFFECTIVE entitlement in a division:
// active tier + owned add-ons → features + limits. This is the authority every
// API guard uses. Admin/test accounts get everything.

import { db } from '@/db/client';
import { subscriptions, subscriptionAddons } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { effectiveEntitlement, allFeaturesEntitlement, type Entitlement, type FeatureKey, type LimitKey, can, limitFor } from '@/config/entitlements';
import type { TierId } from '@/config/billing-catalog';
import type { Division } from '@/config/divisions';

export async function getEntitlement(
  userId: string,
  division: Division,
  isAdmin = false,
): Promise<Entitlement> {
  if (isAdmin) return allFeaturesEntitlement();

  try {
    const [sub] = await db
      .select({ id: subscriptions.id, plan: subscriptions.plan })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.division, division),
        eq(subscriptions.status, 'active'),
      ))
      .limit(1);

    if (!sub) return { features: [], limits: {} };

    const rows = await db
      .select({ addonId: subscriptionAddons.addonId, quantity: subscriptionAddons.quantity })
      .from(subscriptionAddons)
      .where(and(eq(subscriptionAddons.subscriptionId, sub.id), eq(subscriptionAddons.status, 'active')));

    const owned = rows.map((r) => ({ addonId: r.addonId, quantity: r.quantity ?? 1 }));
    return effectiveEntitlement(sub.plan as TierId, owned);
  } catch {
    // Non-fatal (e.g. transient DB issue) — deny by default.
    return { features: [], limits: {} };
  }
}

/** Throws-free feature check for API routes. */
export async function userCan(userId: string, division: Division, feature: FeatureKey, isAdmin = false): Promise<boolean> {
  const ent = await getEntitlement(userId, division, isAdmin);
  return can(ent, feature);
}

/** Numeric limit lookup for API routes. */
export async function userLimit(userId: string, division: Division, key: LimitKey, isAdmin = false): Promise<number> {
  const ent = await getEntitlement(userId, division, isAdmin);
  return limitFor(ent, key);
}
