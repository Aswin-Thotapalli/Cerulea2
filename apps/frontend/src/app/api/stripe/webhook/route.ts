// apps/frontend/src/app/api/stripe/webhook/route.ts
//
// The single webhook entry point for all billing-catalog events. Whether
// the change came from initial signup or a later dashboard add-on edit,
// it always flows through reconcileFromStripeSubscription (for
// subscription-mode events) or recordOneTimeCheckoutCompleted (for
// payment-mode one-time purchases) — see src/lib/billing/. Provisioning
// is dispatched from inside those functions, never directly by a UI
// button click.
//
// Note: this replaces the previous version of this route, which only
// understood the legacy 'developer'/'pro' plans. Those plans were never
// actually wired to the checkout flow in the UI (PricingPage didn't call
// it), so there is nothing live to migrate.

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import { reconcileFromStripeSubscription, markSubscriptionCanceled, activateOneTimeTierPurchase } from '@/lib/billing/reconcile';
import { recordOneTimeCheckoutCompleted } from '@/lib/billing/oneTime';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Stripe webhook signature error:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId;
          if (session.subscription && userId) {
            await reconcileFromStripeSubscription({
              stripeSubscriptionId: session.subscription as string,
              userId,
              stripeEventId: event.id,
            });
          }
        } else if (session.mode === 'payment') {
          // A one-time TIER purchase (enterprise/govt license) carries a tierId
          // in metadata and must create the division subscription row. Add-on
          // one-time purchases (kind/addonId metadata) go the legacy path.
          if (session.metadata?.tierId) {
            await activateOneTimeTierPurchase(session);
          } else {
            await recordOneTimeCheckoutCompleted(session);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        // userId is omitted — reconcile resolves the existing local row by
        // stripeSubscriptionId (it was created during checkout.session.completed).
        await reconcileFromStripeSubscription({
          stripeSubscriptionId: sub.id,
          stripeEventId: event.id,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(sub.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
