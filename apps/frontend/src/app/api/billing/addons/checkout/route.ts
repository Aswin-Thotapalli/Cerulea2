// apps/frontend/src/app/api/billing/addons/checkout/route.ts
// Adds one add-on the billing screen sends through its own purchase step.
// The add-on goes onto the running subscription in Cerulea APIs. Cerulea APIs
// prices it from the add-ons it sells and carries it on the next invoice. An
// add-on Cerulea APIs does not sell comes back refused with the list it sells.
// The reply names the billing screen to return to.
// Without this route the purchase button beside an add-on does nothing.

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ceruleaRequest } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import { billingHome, subscriptionAbsent } from '@/lib/entitlements-server';
import {
  type TierId,
  getAddonById,
  getTierById,
  isAddonEligibleForTier,
} from '@/config/billing-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const purchaseBody = z.object({ addonId: z.string().min(1).max(80) });

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = purchaseBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.add_on_unnamed',
        message: 'Cerulea reads the add-on to buy on this request.',
        fix: 'Choose the add-on on the billing screen, then buy it again.',
        details: {},
      },
      400,
    );
  }
  const { addonId } = parsed.data;
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request);
    const held = home.subscription;
    if (!held) return subscriptionAbsent(home);

    const tier = getTierById(held.planId);
    const addon = getAddonById(addonId);
    if (tier && addon && !isAddonEligibleForTier(addonId, held.planId as TierId)) {
      return failureResponse(
        {
          code: 'billing.add_on_outside_tier',
          message: `The ${addon.name} add-on is closed to the ${tier.name} tier.`,
          fix: 'Move to a tier that offers the add-on, then buy it again.',
          details: { tierId: held.planId, addonId },
        },
        400,
      );
    }

    const outcome = await ceruleaRequest<Record<string, unknown>>(
      `/v1/workspaces/${encodeURIComponent(home.workspace.workspaceId)}/subscription/add-ons`,
      { method: 'POST', body: JSON.stringify({ addOnId: addonId, quantity: 1 }) },
      options,
    );
    return NextResponse.json({
      ok: true,
      url: '/dashboard/billing?purchase=success',
      division: home.division,
      ...outcome,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
