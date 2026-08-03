// apps/frontend/src/app/api/billing/export/route.ts
//
// POST — pay-per-use "Chain data export" action. Charged once per click,
// never added to the recurring subscription, and never shown in the
// add-on selector. Eligible only for Private Dapps / Private Dapps Pro.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getCurrentSubscription } from "@/lib/billing/current-subscription";
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { EXPORT_ACTION } from '@/config/billing-catalog';
import { createOneTimeCheckout } from '@/lib/billing/oneTime';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({ format: z.enum(['csv', 'pdf']).default('csv') });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const sub = await getCurrentSubscription(session.user.id);

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'No active subscription' }, { status: 404 });
  }

  if (!EXPORT_ACTION.eligibleTierIds.includes(sub.plan as any)) {
    return NextResponse.json({ ok: false, error: 'Chain data export is not available on your tier' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const result = await createOneTimeCheckout({
    userId: session.user.id,
    userEmail: session.user.email,
    kind: 'export',
    exportFormat: parsed.data.format,
    subscriptionId: sub.id,
    successUrl: `${origin}/dashboard/billing?export=success`,
    cancelUrl: `${origin}/dashboard/billing?export=canceled`,
  });

  return NextResponse.json({ ok: true, ...result });
}
