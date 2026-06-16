// apps/frontend/src/lib/billing/lifecycle.ts
//
// Subscription-level lifecycle actions: change tier (upgrade/downgrade),
// cancel (at period end, or immediately), and resume a pending
// cancellation. Like addAddonToSubscription, these only touch Stripe +
// make the live-mode Stripe API call; the resulting
// customer.subscription.updated / .deleted webhook is what actually
// reconciles the DB and dispatches provisioning (see reconcile.ts). In
// dev-mode (no Stripe keys), where no webhook will ever fire, each
// function updates the DB directly so the feature still works locally.

import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TIERS, getTierById, isAddonEligibleForTier, type TierId } from '@/config/billing-catalog';
import { getStripe, getStripePriceId, isStripeConfigured } from './stripe';
import { getActiveAddonSelections, removeAddonFromSubscription } from './addons';
import { dispatchProvisioning } from './provisioning';

async function getSubscriptionRow(subscriptionId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id as any, subscriptionId)).limit(1);
  if (!sub) throw new Error(`Subscription not found: ${subscriptionId}`);
  return sub;
}

/**
 * Upgrades or downgrades the subscription to a different self-serve
 * tier. Any currently active add-on that isn't eligible for the new
 * tier is removed automatically (e.g. "+1 validator" when moving from
 * Private Dapps to Private Dapps Pro, which uses the separate
 * "Additional validators" add-on instead).
 */
export async function changeSubscriptionTier(
  subscriptionId: string,
  newTierId: TierId
): Promise<{ removedAddonIds: string[] }> {
  const tier = getTierById(newTierId);
  if (!tier) throw new Error(`Invalid tier: ${newTierId}`);

  const sub = await getSubscriptionRow(subscriptionId);
  if (sub.plan === newTierId) return { removedAddonIds: [] };

  if (isStripeConfigured() && sub.stripeSubscriptionId) {
    const stripe = getStripe();
    const priceId = getStripePriceId(tier.priceEnvVar);

    let tierItemId = sub.stripeTierSubscriptionItemId;
    if (!tierItemId) {
      // Fallback: find it live if we somehow don't have it cached locally.
      const items = await stripe.subscriptionItems.list({ subscription: sub.stripeSubscriptionId, limit: 100 });
      const tierPriceIds = new Set(
        TIERS.map((t) => process.env[t.priceEnvVar]).filter((v): v is string => !!v)
      );
      tierItemId = items.data.find((i) => tierPriceIds.has(i.price.id))?.id ?? null;
    }

    if (tierItemId) {
      await stripe.subscriptionItems.update(tierItemId, {
        price: priceId,
        quantity: 1,
        proration_behavior: 'create_prorations',
      });
    } else {
      await stripe.subscriptionItems.create({
        subscription: sub.stripeSubscriptionId,
        price: priceId,
        quantity: 1,
        proration_behavior: 'create_prorations',
      });
    }
  }

  const activeAddons = await getActiveAddonSelections(subscriptionId);
  const removedAddonIds: string[] = [];
  for (const a of activeAddons) {
    if (!isAddonEligibleForTier(a.addonId, newTierId)) {
      await removeAddonFromSubscription(subscriptionId, a.addonId);
      removedAddonIds.push(a.addonId);
    }
  }

  await db
    .update(subscriptions)
    .set({ plan: newTierId, updatedAt: new Date().toISOString() })
    .where(eq(subscriptions.id as any, subscriptionId));

  // dev-mode: no webhook will fire, so dispatch directly.
  if (!isStripeConfigured()) {
    await dispatchProvisioning(subscriptionId);
  }

  return { removedAddonIds };
}

/**
 * Cancels the subscription. `atPeriodEnd: true` (the default, and the
 * recommended choice) keeps access until the current paid period ends
 * and can be undone with resumeSubscription. `atPeriodEnd: false` ends
 * access immediately and cannot be undone.
 */
export async function cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<void> {
  const sub = await getSubscriptionRow(subscriptionId);

  if (isStripeConfigured() && sub.stripeSubscriptionId) {
    const stripe = getStripe();
    if (atPeriodEnd) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    } else {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }
    // Live mode: customer.subscription.updated (graceful) or
    // customer.subscription.deleted (immediate) reconciles the DB.
    return;
  }

  // dev-mode fallback — no Stripe subscription exists to call.
  await db
    .update(subscriptions)
    .set({
      status: atPeriodEnd ? sub.status : 'canceled',
      cancelAtPeriodEnd: atPeriodEnd ? 'true' : 'false',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscriptions.id as any, subscriptionId));
}

/** Undoes a pending "cancel at period end" — only valid before the period actually ends. */
export async function resumeSubscription(subscriptionId: string): Promise<void> {
  const sub = await getSubscriptionRow(subscriptionId);

  if (isStripeConfigured() && sub.stripeSubscriptionId) {
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
    return;
  }

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: 'false', updatedAt: new Date().toISOString() })
    .where(eq(subscriptions.id as any, subscriptionId));
}
