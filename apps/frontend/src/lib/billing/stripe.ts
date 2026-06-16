// apps/frontend/src/lib/billing/stripe.ts
import Stripe from 'stripe';
import { TIERS, ADDONS, EXPORT_ACTION, type TierId } from '@/config/billing-catalog';

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' });
  }
  return _stripe;
}

/** Resolves a catalog price-id env var name to its live Stripe price id. */
export function getStripePriceId(envVarName: string): string {
  const id = process.env[envVarName];
  if (!id) throw new Error(`Missing Stripe price id env var: ${envVarName}. Run scripts/stripe-setup-billing.cjs.`);
  return id;
}

export interface PriceReverseMaps {
  tierPriceToId: Map<string, TierId>;
  addonRecurringPriceToId: Map<string, string>;
  addonOneTimePriceToId: Map<string, string>;
  exportPriceId: string | null;
}

/**
 * Builds price-id -> catalog-id lookups so webhook handlers can map a raw
 * Stripe price id back to a tier/add-on without hardcoding ids anywhere.
 * Skips any catalog item whose env var isn't set yet (dev-mode safe).
 */
export function buildPriceReverseMaps(): PriceReverseMaps {
  const tierPriceToId = new Map<string, TierId>();
  for (const tier of TIERS) {
    const priceId = process.env[tier.priceEnvVar];
    if (priceId) tierPriceToId.set(priceId, tier.id);
  }

  const addonRecurringPriceToId = new Map<string, string>();
  const addonOneTimePriceToId = new Map<string, string>();
  for (const addon of ADDONS) {
    if (addon.recurringPriceEnvVar) {
      const priceId = process.env[addon.recurringPriceEnvVar];
      if (priceId) addonRecurringPriceToId.set(priceId, addon.id);
    }
    if (addon.oneTimePriceEnvVar) {
      const priceId = process.env[addon.oneTimePriceEnvVar];
      if (priceId) addonOneTimePriceToId.set(priceId, addon.id);
    }
  }

  const exportPriceId = process.env[EXPORT_ACTION.priceEnvVar] || null;

  return { tierPriceToId, addonRecurringPriceToId, addonOneTimePriceToId, exportPriceId };
}

/** Finds an existing Stripe Subscription Item for a given price, if any (idempotency guard). */
export async function findExistingSubscriptionItemForPrice(
  stripe: Stripe,
  stripeSubscriptionId: string,
  priceId: string
): Promise<Stripe.SubscriptionItem | null> {
  const items = await stripe.subscriptionItems.list({ subscription: stripeSubscriptionId, limit: 100 });
  return items.data.find((i) => i.price.id === priceId) ?? null;
}
