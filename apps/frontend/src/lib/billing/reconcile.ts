// apps/frontend/src/lib/billing/reconcile.ts
//
// reconcileFromStripeSubscription is the ONE function that reads the full
// current state of a Stripe subscription and makes the local DB (and the
// provisioning queue) match it. It is called from the webhook for BOTH:
//   - checkout.session.completed (new signup) — pass userId from session
//     metadata, since no local subscription row exists yet.
//   - customer.subscription.updated (later dashboard edit) — userId is
//     resolved from the existing local row by stripeSubscriptionId.
// This is the single dispatcher referenced in the architecture: whichever
// event fired, the same function reconciles tier + add-ons + provisioning.

import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions, subscriptionAddons } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getStripe, buildPriceReverseMaps } from './stripe';
import { addAddonToSubscription, removeAddonFromSubscription } from './addons';
import { dispatchProvisioning } from './provisioning';
import { divisionForTierId } from '@/config/billing-catalog';

export interface ReconcileParams {
  stripeSubscriptionId: string;
  /** Required only if no local subscription row exists yet (i.e. first reconciliation after signup). */
  userId?: string;
  /** Stripe event id, for idempotency — skips reprocessing if already applied. */
  stripeEventId?: string;
}

export async function reconcileFromStripeSubscription(
  params: ReconcileParams
): Promise<{ subscriptionId: string } | null> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(params.stripeSubscriptionId, {
    expand: ['items.data.price'],
  });

  const { tierPriceToId, addonRecurringPriceToId } = buildPriceReverseMaps();

  let tierId: string | null = null;
  let tierSubscriptionItemId: string | null = null;
  const addonLineItems: { addonId: string; quantity: number; stripeSubscriptionItemId: string }[] = [];

  for (const item of sub.items.data) {
    const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
    if (!priceId) continue;
    if (tierPriceToId.has(priceId)) {
      tierId = tierPriceToId.get(priceId)!;
      tierSubscriptionItemId = item.id;
    } else if (addonRecurringPriceToId.has(priceId)) {
      addonLineItems.push({
        addonId: addonRecurringPriceToId.get(priceId)!,
        quantity: item.quantity ?? 1,
        stripeSubscriptionItemId: item.id,
      });
    } else {
      console.warn(`[billing] reconcile: unrecognized Stripe price id on subscription item: ${priceId}`);
    }
  }

  if (!tierId) {
    console.error(`[billing] reconcile: could not determine tier from subscription ${sub.id} line items`);
    return null;
  }

  // Find (or identify) the local subscription row.
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId as any, sub.id))
    .limit(1);

  if (!existing && !params.userId) {
    console.error(`[billing] reconcile: no local subscription for ${sub.id} and no userId provided`);
    return null;
  }

  // Idempotency: skip if we've already applied this exact Stripe event.
  if (existing && params.stripeEventId && (existing as any).lastWebhookEventId === params.stripeEventId) {
    return { subscriptionId: existing.id };
  }

  const periodEndIso = (sub as any).current_period_end
    ? new Date((sub as any).current_period_end * 1000).toISOString()
    : null;

  const subscriptionId = existing?.id ?? randomUUID();

  const cancelAtPeriodEnd = !!(sub as any).cancel_at_period_end;

  // Division is authoritative from the purchased tier.
  const division = divisionForTierId(tierId) ?? 'dapp';

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        plan: tierId,
        division,
        status: sub.status,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        stripeTierSubscriptionItemId: tierSubscriptionItemId,
        cancelAtPeriodEnd,
        currentPeriodEnd: periodEndIso as any,
        lastWebhookEventId: params.stripeEventId ?? (existing as any).lastWebhookEventId ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id as any, subscriptionId));
  } else {
    await db.insert(subscriptions).values({
      id: subscriptionId,
      userId: params.userId!,
      division,
      plan: tierId,
      status: sub.status,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      stripeTierSubscriptionItemId: tierSubscriptionItemId,
      cancelAtPeriodEnd,
      currentPeriodEnd: periodEndIso as any,
      lastWebhookEventId: params.stripeEventId ?? null,
    });
  }

  // Reconcile add-on rows to exactly match the subscription's current line items.
  const currentRows = await db
    .select()
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.subscriptionId as any, subscriptionId), eq(subscriptionAddons.status as any, 'active')));

  const newAddonIds = new Set(addonLineItems.map((a) => a.addonId));

  for (const row of currentRows) {
    if (!newAddonIds.has(row.addonId)) {
      await removeAddonFromSubscription(subscriptionId, row.addonId);
    }
  }

  for (const line of addonLineItems) {
    await addAddonToSubscription(subscriptionId, line.addonId, line.quantity, {
      stripeSubscriptionItemId: line.stripeSubscriptionItemId,
    });
  }

  await dispatchProvisioning(subscriptionId, { stripeEventId: params.stripeEventId });

  return { subscriptionId };
}

/**
 * Marks a subscription canceled. Distinct from reconcile because a
 * deleted Stripe subscription can no longer be retrieved with its items.
 */
export async function markSubscriptionCanceled(stripeSubscriptionId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({ status: 'canceled', updatedAt: new Date().toISOString() })
    .where(eq(subscriptions.stripeSubscriptionId as any, stripeSubscriptionId));
}
