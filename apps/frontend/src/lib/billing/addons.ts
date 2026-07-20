// apps/frontend/src/lib/billing/addons.ts
//
// The ONE place that adds or removes a recurring add-on line item on a
// subscription. Called from both:
//   - the webhook's checkout.session.completed handler (signup), where
//     Stripe has already created the subscription item as part of the
//     initial Checkout Session — we pass its id via
//     opts.stripeSubscriptionItemId so we don't create a duplicate.
//   - the dashboard's Add/Remove actions (later edits), where no item
//     exists yet — we omit opts and this calls the live Stripe
//     Subscription Items API to create one.
//
// Deliberately does NOT call dispatchProvisioning. Provisioning must be
// triggered by Stripe webhooks, not directly by a UI button click: the
// dashboard's add/remove route calls this function (which only touches
// Stripe + the local DB), Stripe's resulting `customer.subscription.updated`
// event fires, and THAT webhook calls reconcileFromStripeSubscription,
// which is what actually dispatches provisioning. (In Stripe dev-mode,
// where there is no live subscription and therefore no webhook, the
// calling API route dispatches provisioning directly — see
// api/billing/subscription/addons/route.ts.)

import { randomUUID } from 'crypto';
import { db } from '@/db/client';
import { subscriptions, subscriptionAddons } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAddonById } from '@/config/billing-catalog';
import { getStripe, getStripePriceId, isStripeConfigured, findExistingSubscriptionItemForPrice } from './stripe';

export async function addAddonToSubscription(
  subscriptionId: string,
  addonId: string,
  quantity: number,
  opts?: { stripeSubscriptionItemId?: string }
): Promise<void> {
  const addon = getAddonById(addonId);
  if (!addon) throw new Error(`Unknown addon: ${addonId}`);

  const qty = Math.max(1, Math.min(quantity, addon.maxQuantity));

  const [subRow] = await db.select().from(subscriptions).where(eq(subscriptions.id as any, subscriptionId)).limit(1);
  if (!subRow) throw new Error(`Subscription not found: ${subscriptionId}`);

  let stripeItemId: string | null = opts?.stripeSubscriptionItemId ?? null;

  // Pure one-time add-ons (billingType 'one_time') never have a recurring
  // Stripe Subscription Item — nothing to do on the Stripe side here.
  if (!stripeItemId && addon.recurringPriceCents != null && addon.recurringPriceEnvVar) {
    if (isStripeConfigured() && subRow.stripeSubscriptionId) {
      const stripe = getStripe();
      const priceId = getStripePriceId(addon.recurringPriceEnvVar);
      const existingItem = await findExistingSubscriptionItemForPrice(stripe, subRow.stripeSubscriptionId, priceId);
      if (existingItem) {
        await stripe.subscriptionItems.update(existingItem.id, { quantity: qty });
        stripeItemId = existingItem.id;
      } else {
        const item = await stripe.subscriptionItems.create({
          subscription: subRow.stripeSubscriptionId,
          price: priceId,
          quantity: qty,
        });
        stripeItemId = item.id;
      }
    }
    // dev-mode fallback (no Stripe key, or no live stripeSubscriptionId yet):
    // record the add-on locally with no Stripe item id.
  }

  const [existingRow] = await db
    .select()
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.subscriptionId as any, subscriptionId), eq(subscriptionAddons.addonId as any, addonId)))
    .limit(1);

  if (existingRow) {
    await db
      .update(subscriptionAddons)
      .set({
        quantity: qty,
        stripeSubscriptionItemId: stripeItemId,
        status: 'active',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptionAddons.id as any, existingRow.id));
  } else {
    await db.insert(subscriptionAddons).values({
      id: randomUUID(),
      subscriptionId,
      addonId,
      quantity: qty,
      stripeSubscriptionItemId: stripeItemId,
      status: 'active',
    });
  }
}

export async function removeAddonFromSubscription(subscriptionId: string, addonId: string): Promise<void> {
  const [existingRow] = await db
    .select()
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.subscriptionId as any, subscriptionId), eq(subscriptionAddons.addonId as any, addonId)))
    .limit(1);

  if (!existingRow || existingRow.status === 'removed') return;

  if (existingRow.stripeSubscriptionItemId && isStripeConfigured()) {
    try {
      await getStripe().subscriptionItems.del(existingRow.stripeSubscriptionItemId);
    } catch (err) {
      // Item may already be gone (e.g. subscription was canceled elsewhere) — non-fatal.
      console.warn('[billing] failed to delete Stripe subscription item', existingRow.stripeSubscriptionItemId, err);
    }
  }

  await db
    .update(subscriptionAddons)
    .set({ status: 'removed', updatedAt: new Date().toISOString() })
    .where(eq(subscriptionAddons.id as any, existingRow.id));
}

/** Current active add-on selections for a subscription, as {addonId, quantity}. */
export async function getActiveAddonSelections(subscriptionId: string): Promise<{ addonId: string; quantity: number }[]> {
  const rows = await db
    .select()
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.subscriptionId as any, subscriptionId), eq(subscriptionAddons.status as any, 'active')));
  return rows.map((r) => ({ addonId: r.addonId, quantity: Number(r.quantity) || 1 }));
}
