// apps/frontend/src/lib/billing/oneTime.ts
//
// Handles charges that are NOT recurring subscription items:
//   - the one-time component of an add-on bought standalone after signup
//     (e.g. "Custom domain" added later from the dashboard)
//   - the pay-per-use "Chain data export" action, which is never part of
//     the subscription at all
// Both go through a Stripe Checkout Session in `mode: 'payment'`, reconciled
// by the SAME webhook route (checkout.session.completed), branching on
// `session.mode === 'payment'` vs `'subscription'` — see api/stripe/webhook.

import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { billingOneTimePurchases } from '@/db/schema';
import { getAddonById, EXPORT_ACTION } from '@/config/billing-catalog';
import { getStripe, getStripePriceId, isStripeConfigured } from './stripe';
import { addAddonToSubscription } from './addons';
import { dispatchProvisioning, dispatchExportAction } from './provisioning';

export type OneTimeKind = 'addon_one_time' | 'export';

export interface CreateOneTimeCheckoutParams {
  userId: string;
  userEmail?: string | null;
  kind: OneTimeKind;
  /** Catalog addon id, required when kind === 'addon_one_time' */
  addonId?: string;
  /** Export format, required when kind === 'export' */
  exportFormat?: 'csv' | 'pdf';
  subscriptionId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createOneTimeCheckout(
  params: CreateOneTimeCheckoutParams
): Promise<{ url: string; devMode?: boolean }> {
  const priceEnvVar =
    params.kind === 'export'
      ? EXPORT_ACTION.priceEnvVar
      : getAddonById(params.addonId ?? '')?.oneTimePriceEnvVar;

  if (!priceEnvVar) throw new Error('No one-time price configured for this purchase');

  // Dev-mode fallback: Stripe not configured -> record as paid immediately.
  if (!isStripeConfigured()) {
    await recordOneTimePurchase({
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      kind: params.kind,
      addonId: params.addonId ?? null,
      amountCents: null,
      status: 'paid',
    });

    if (params.kind === 'addon_one_time' && params.addonId === 'addon_block_explorer') {
      await addAddonToSubscription(params.subscriptionId, 'addon_block_explorer', 1);
    }
    if (params.kind === 'export') {
      await dispatchExportAction(params.subscriptionId, params.exportFormat ?? 'csv');
    } else {
      await dispatchProvisioning(params.subscriptionId);
    }

    return { url: params.successUrl, devMode: true };
  }

  const stripe = getStripe();
  const priceId = getStripePriceId(priceEnvVar);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: params.userEmail ?? undefined,
    metadata: {
      userId: params.userId,
      kind: params.kind,
      addonId: params.addonId ?? '',
      exportFormat: params.exportFormat ?? '',
      subscriptionId: params.subscriptionId,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { url: session.url };
}

async function recordOneTimePurchase(p: {
  userId: string;
  subscriptionId: string | null;
  kind: OneTimeKind;
  addonId: string | null;
  stripeCheckoutSessionId?: string;
  amountCents: number | null;
  status: 'pending' | 'paid' | 'failed';
}) {
  await db.insert(billingOneTimePurchases).values({
    id: randomUUID(),
    userId: p.userId,
    subscriptionId: p.subscriptionId,
    kind: p.kind,
    addonId: p.addonId,
    stripeCheckoutSessionId: p.stripeCheckoutSessionId ?? null,
    amountCents: p.amountCents,
    status: p.status,
  });
}

/** Webhook handler for checkout.session.completed when session.mode === 'payment'. */
export async function recordOneTimeCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const kind = session.metadata?.kind as OneTimeKind | undefined;
  const addonId = session.metadata?.addonId || null;
  const subscriptionId = session.metadata?.subscriptionId || null;
  const exportFormat = (session.metadata?.exportFormat || 'csv') as 'csv' | 'pdf';

  if (!userId || !kind) return;

  await recordOneTimePurchase({
    userId,
    subscriptionId,
    kind,
    addonId,
    stripeCheckoutSessionId: session.id,
    amountCents: session.amount_total ?? null,
    status: 'paid',
  });

  if (!subscriptionId) return;

  if (kind === 'addon_one_time' && addonId === 'addon_block_explorer') {
    // One-time setup fee is paid — now attach the recurring hosting
    // component via the same shared function used everywhere else.
    await addAddonToSubscription(subscriptionId, 'addon_block_explorer', 1);
  }

  if (kind === 'export') {
    await dispatchExportAction(subscriptionId, exportFormat, session.id);
  } else {
    await dispatchProvisioning(subscriptionId, { stripeEventId: session.id });
  }
}
