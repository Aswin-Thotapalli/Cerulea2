// apps/frontend/src/app/api/billing/subscription/resume/route.ts
//
// POST — undo a pending "cancel at period end" on the caller's subscription.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCurrentSubscription } from "@/lib/billing/current-subscription";
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { resumeSubscription } from '@/lib/billing/lifecycle';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sub = await getCurrentSubscription(session.user.id);

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'No active subscription' }, { status: 404 });
  }

  if (String(sub.cancelAtPeriodEnd) !== 'true') {
    return NextResponse.json({ ok: false, error: 'Subscription is not pending cancellation' }, { status: 400 });
  }

  try {
    await resumeSubscription(sub.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Resume subscription error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Could not resume subscription' }, { status: 500 });
  }
}
