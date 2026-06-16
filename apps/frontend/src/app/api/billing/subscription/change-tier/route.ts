// apps/frontend/src/app/api/billing/subscription/change-tier/route.ts
//
// POST — upgrade or downgrade the caller's subscription to a different
// self-serve tier. Existing add-ons that aren't eligible for the new
// tier are removed automatically; the response reports which ones.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TIERS, getAddonById, type TierId } from '@/config/billing-catalog';
import { changeSubscriptionTier } from '@/lib/billing/lifecycle';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  tierId: z.enum(TIERS.map((t) => t.id) as [TierId, ...TierId[]]),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'No active subscription' }, { status: 404 });
  }

  if (sub.cancelAtPeriodEnd === 'true') {
    return NextResponse.json(
      { ok: false, error: 'Resume your subscription before changing tiers' },
      { status: 409 }
    );
  }

  try {
    const { removedAddonIds } = await changeSubscriptionTier(sub.id, parsed.data.tierId);
    return NextResponse.json({
      ok: true,
      tierId: parsed.data.tierId,
      removedAddons: removedAddonIds.map((id) => getAddonById(id)?.name ?? id),
    });
  } catch (err: any) {
    console.error('Change tier error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Could not change tier' }, { status: 500 });
  }
}
