// apps/frontend/src/app/api/billing/payment-method/route.ts
//
// POST — opens a Stripe Billing Portal session targeting payment-method
// update only (flow_data.type = 'payment_method_update'). Returns a
// short-lived URL that the client immediately redirects to. The portal
// session lands back at /dashboard/billing on completion.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Payment method updates require live Stripe configuration.' },
      { status: 503 }
    );
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: 'No Stripe customer on record. Please contact support.' },
      { status: 404 }
    );
  }

  try {
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const stripe = getStripe();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/dashboard/billing`,
      flow_data: {
        type: 'payment_method_update',
      },
    });

    return NextResponse.json({ ok: true, url: portalSession.url });
  } catch (err: any) {
    console.error('Payment method portal error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Could not open payment method update page.' },
      { status: 500 }
    );
  }
}
