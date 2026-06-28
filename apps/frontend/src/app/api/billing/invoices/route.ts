// apps/frontend/src/app/api/billing/invoices/route.ts
//
// GET — lists Stripe invoices for the current customer. Supports cursor-
// based pagination via ?starting_after=<invoiceId>. Returns 12 invoices
// per page. Returns an empty list (not an error) in dev-mode / no customer.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: true, invoices: [], hasMore: false, devMode: true });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ ok: true, invoices: [], hasMore: false });
  }

  const { searchParams } = new URL(req.url);
  const startingAfter = searchParams.get('starting_after') ?? undefined;

  try {
    const stripe = getStripe();
    const result = await stripe.invoices.list({
      customer: sub.stripeCustomerId,
      limit: 12,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    return NextResponse.json({
      ok: true,
      hasMore: result.has_more,
      invoices: result.data.map((inv) => ({
        id: inv.id,
        number: inv.number ?? null,
        date: inv.created,
        amountPaid: inv.amount_paid,
        amountDue: inv.amount_due,
        currency: inv.currency,
        status: inv.status ?? 'unknown',
        pdfUrl: inv.invoice_pdf ?? null,
        viewUrl: inv.hosted_invoice_url ?? null,
        description: inv.description ?? null,
      })),
    });
  } catch (err: any) {
    console.error('Invoices fetch error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Could not load invoices.' }, { status: 500 });
  }
}
