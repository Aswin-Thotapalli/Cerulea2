// apps/frontend/src/app/api/billing/subscription/addons/route.ts
//
// PATCH — applies a new set of *purely recurring* add-on selections
// (validators, storage, dedicated RPC, API keys, Studio seats) against
// the caller's existing subscription: diffs against the current active
// selections and calls the shared addAddonToSubscription /
// removeAddonFromSubscription for whatever changed.
//
// Add-ons with a one-time component (custom domain, block explorer) are
// deliberately rejected here — adding those for the first time requires
// an actual card charge, which only a Stripe Checkout redirect can do.
// See POST /api/billing/addons/checkout for that flow. Removing an
// already-active recurring component (e.g. dropping the block explorer's
// monthly hosting) IS allowed here, since removal never charges anything.
//
// This calls the SAME addAddonToSubscription/removeAddonFromSubscription
// functions used by the webhook's signup-completion path — see
// src/lib/billing/addons.ts.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAddonById } from '@/config/billing-catalog';
import { addAddonToSubscription, removeAddonFromSubscription, getActiveAddonSelections } from '@/lib/billing/addons';
import { dispatchProvisioning } from '@/lib/billing/provisioning';
import { isStripeConfigured } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  selections: z.array(z.object({ addonId: z.string(), quantity: z.number().int().min(1) })),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'No active subscription' }, { status: 404 });
  }

  const current = await getActiveAddonSelections(sub.id);
  const currentlyActiveIds = new Set(current.map((c) => c.addonId));

  // Reject NEW selections of an add-on with a one-time component — those
  // must go through the dedicated checkout flow instead (POST
  // /api/billing/addons/checkout), since adding one for the first time
  // requires an actual card charge. An add-on that's already active
  // (its one-time fee was already paid previously) is allowed through
  // here unchanged, so saving other edits doesn't get blocked by it.
  for (const sel of parsed.data.selections) {
    const addon = getAddonById(sel.addonId);
    if (!addon) {
      return NextResponse.json({ ok: false, error: `Unknown add-on: ${sel.addonId}` }, { status: 400 });
    }
    if (addon.oneTimePriceCents != null && !currentlyActiveIds.has(addon.id)) {
      return NextResponse.json(
        { ok: false, error: `"${addon.name}" requires checkout — use POST /api/billing/addons/checkout`, addonId: addon.id },
        { status: 409 }
      );
    }
    if (!addon.eligibleTierIds.includes(sub.plan as any)) {
      return NextResponse.json({ ok: false, error: `"${addon.name}" is not eligible for your current tier` }, { status: 400 });
    }
  }

  const currentMap = new Map(current.map((c) => [c.addonId, c.quantity]));
  const nextMap = new Map(parsed.data.selections.map((s) => [s.addonId, s.quantity]));

  // Removals: in current but not in next.
  for (const [addonId] of Array.from(currentMap)) {
    if (!nextMap.has(addonId)) {
      await removeAddonFromSubscription(sub.id, addonId);
    }
  }

  // Adds / quantity changes.
  for (const [addonId, quantity] of Array.from(nextMap)) {
    if (currentMap.get(addonId) !== quantity) {
      await addAddonToSubscription(sub.id, addonId, quantity);
    }
  }

  // In dev mode there is no live Stripe subscription, so no
  // `customer.subscription.updated` webhook will ever fire — dispatch
  // provisioning directly so the feature still works end-to-end locally.
  if (!isStripeConfigured()) {
    await dispatchProvisioning(sub.id);
  }

  const updated = await getActiveAddonSelections(sub.id);
  return NextResponse.json({ ok: true, addons: updated });
}
