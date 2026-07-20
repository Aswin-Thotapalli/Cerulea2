// apps/frontend/src/app/api/billing/subscription/route.ts
//
// GET — returns the current user's tier + active add-ons, in the shape
// the dashboard billing page (and its AddonSelector) needs to pre-fill.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions, billingOneTimePurchases } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTierById } from '@/config/billing-catalog';
import { getActiveAddonSelections } from '@/lib/billing/addons';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ ok: true, subscription: null, tier: null, addons: [], oneTimePurchases: [] });
  }

  const tier = getTierById(sub.plan);
  const addons = await getActiveAddonSelections(sub.id);

  const oneTimeRows = await db
    .select()
    .from(billingOneTimePurchases)
    .where(and(eq(billingOneTimePurchases.subscriptionId as any, sub.id), eq(billingOneTimePurchases.status as any, 'paid')));

  return NextResponse.json({
    ok: true,
    subscription: {
      id: sub.id,
      tierId: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: String(sub.cancelAtPeriodEnd) === 'true',
    },
    tier: tier ?? null,
    addons, // [{ addonId, quantity }]
    oneTimePurchases: oneTimeRows.map((r) => ({ addonId: r.addonId, kind: r.kind, createdAt: r.createdAt })),
  });
}
