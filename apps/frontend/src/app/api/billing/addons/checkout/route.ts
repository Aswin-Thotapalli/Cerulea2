// apps/frontend/src/app/api/billing/addons/checkout/route.ts
//
// POST — dashboard-only flow for adding an add-on that has a one-time
// price component for the first time (Custom domain, or the Dedicated
// branded block explorer's setup fee). Pure recurring add-ons never hit
// this route — see PATCH /api/billing/subscription/addons instead.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAddonById } from '@/config/billing-catalog';
import { createOneTimeCheckout } from '@/lib/billing/oneTime';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({ addonId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const addon = getAddonById(parsed.data.addonId);
  if (!addon || addon.oneTimePriceCents == null) {
    return NextResponse.json({ ok: false, error: 'Add-on has no one-time component' }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'No active subscription' }, { status: 404 });
  }

  if (!addon.eligibleTierIds.includes(sub.plan as any)) {
    return NextResponse.json({ ok: false, error: `"${addon.name}" is not eligible for your current tier` }, { status: 400 });
  }

  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const result = await createOneTimeCheckout({
    userId: session.user.id,
    userEmail: session.user.email,
    kind: 'addon_one_time',
    addonId: addon.id,
    subscriptionId: sub.id,
    successUrl: `${origin}/dashboard/billing?purchase=success`,
    cancelUrl: `${origin}/dashboard/billing?purchase=canceled`,
  });

  return NextResponse.json({ ok: true, ...result });
}
