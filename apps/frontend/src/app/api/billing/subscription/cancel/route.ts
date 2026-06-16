// apps/frontend/src/app/api/billing/subscription/cancel/route.ts
//
// POST — cancel the caller's subscription. Body: { atPeriodEnd?: boolean }
// (default true). atPeriodEnd keeps access until the period ends and can
// be undone via POST /api/billing/subscription/resume; immediate
// cancellation cannot be undone.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cancelSubscription } from '@/lib/billing/lifecycle';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({ atPeriodEnd: z.boolean().default(true) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
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

  try {
    await cancelSubscription(sub.id, parsed.data.atPeriodEnd);
    return NextResponse.json({ ok: true, atPeriodEnd: parsed.data.atPeriodEnd });
  } catch (err: any) {
    console.error('Cancel subscription error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Could not cancel subscription' }, { status: 500 });
  }
}
