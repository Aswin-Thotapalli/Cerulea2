// apps/frontend/src/app/api/billing/checkout/route.ts
//
// POST /api/billing/checkout — creates ONE Stripe Checkout Session
// containing the tier price plus every selected add-on's price(s)
// (recurring and one-time mixed in a single subscription-mode session —
// Stripe charges one-time line items on the first invoice and creates
// subscription items for recurring ones). Add-ons are fully optional:
// an empty `addons` array is valid and simply checks out the tier alone.

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  TIERS,
  getTierById,
  isAddonEligibleForTier,
  getAddonById,
  type TierId,
} from '@/config/billing-catalog';
import { getStripe, getStripePriceId, isStripeConfigured } from '@/lib/billing/stripe';
import { addAddonToSubscription } from '@/lib/billing/addons';
import { dispatchProvisioning } from '@/lib/billing/provisioning';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  tierId: z.enum(TIERS.map((t) => t.id) as [TierId, ...TierId[]]),
  addons: z
    .array(z.object({ addonId: z.string(), quantity: z.number().int().min(1) }))
    .default([]),
  returnUrl: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }
    const { tierId, addons, returnUrl: rawReturnUrl } = parsed.data;
  const returnUrl = rawReturnUrl && rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')
    ? rawReturnUrl
    : undefined;

    const tier = getTierById(tierId);
    if (!tier) return NextResponse.json({ ok: false, error: 'Invalid tier' }, { status: 400 });

    // Validate every selected add-on is eligible for this tier.
    for (const sel of addons) {
      if (!isAddonEligibleForTier(sel.addonId, tierId)) {
        return NextResponse.json(
          { ok: false, error: `Add-on "${sel.addonId}" is not eligible for tier "${tierId}"` },
          { status: 400 }
        );
      }
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // ── Dev-mode fallback: no Stripe keys configured ────────────────────────
    if (!isStripeConfigured()) {
      const [existing] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.userId, session.user.id))
        .limit(1);

      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const subscriptionId = existing?.id ?? randomUUID();

      if (existing) {
        await db
          .update(subscriptions)
          .set({ plan: tierId, status: 'active', currentPeriodEnd: periodEnd, updatedAt: new Date().toISOString() })
          .where(eq(subscriptions.userId, session.user.id));
      } else {
        await db.insert(subscriptions).values({
          id: subscriptionId,
          userId: session.user.id,
          plan: tierId,
          status: 'active',
          currentPeriodEnd: periodEnd,
        });
      }

      for (const sel of addons) {
        await addAddonToSubscription(subscriptionId, sel.addonId, sel.quantity);
      }

      // No webhook will fire in dev mode — dispatch provisioning directly.
      await dispatchProvisioning(subscriptionId);

      const successUrl = returnUrl
        ? `${origin}/pricing/success?return=${encodeURIComponent(returnUrl)}`
        : `${origin}/pricing/success`;
      return NextResponse.json({ ok: true, url: successUrl, devMode: true });
    }

    // ── Live Stripe checkout ─────────────────────────────────────────────────
    const stripe = getStripe();

    const lineItems: { price: string; quantity: number }[] = [
      { price: getStripePriceId(tier.priceEnvVar), quantity: 1 },
    ];

    for (const sel of addons) {
      const addon = getAddonById(sel.addonId);
      if (!addon) continue;
      const qty = Math.max(1, Math.min(sel.quantity, addon.maxQuantity));
      if (addon.recurringPriceCents != null && addon.recurringPriceEnvVar) {
        lineItems.push({ price: getStripePriceId(addon.recurringPriceEnvVar), quantity: qty });
      }
      if (addon.oneTimePriceCents != null && addon.oneTimePriceEnvVar) {
        lineItems.push({ price: getStripePriceId(addon.oneTimePriceEnvVar), quantity: qty });
      }
    }

    const successBase = `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`;
    const successUrl = returnUrl ? `${successBase}&return=${encodeURIComponent(returnUrl)}` : successBase;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata: {
        userId: session.user.id,
        tierId,
        addons: JSON.stringify(addons),
        returnUrl: returnUrl || '',
      },
      customer_email: session.user.email,
      success_url: successUrl,
      cancel_url: `${origin}/pricing`,
    });

    return NextResponse.json({ ok: true, url: checkoutSession.url });
  } catch (err: any) {
    console.error('Billing checkout error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
