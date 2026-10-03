// apps/frontend/src/app/api/billing/subscription/addons/route.ts
// Applies a new set of add-on choices to the running subscription.
// The route compares the choices with the active add-ons Cerulea APIs holds.
// An add-on missing from the choices leaves the subscription. A new add-on, or
// a new quantity, goes onto the subscription. Cerulea APIs checks each add-on
// against the add-ons it sells and refuses one it does not sell.
// Without this route the billing screen cannot save its add-on choices.

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
import { billingHome, readActiveAddOns, subscriptionAbsent } from '@/lib/entitlements-server';
import {
  type TierId,
  getAddonById,
  getTierById,
  isAddonEligibleForTier,
} from '@/config/billing-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const selectionBody = z.object({
  selections: z.array(
    z.object({ addonId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(1000) }),
  ),
});

export async function PATCH(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = selectionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.selections_unnamed',
        message: 'Cerulea reads the add-on choices on this request.',
        fix: 'Choose the add-ons on the billing screen, then save again.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request);
    const held = home.subscription;
    if (!held) return subscriptionAbsent(home);

    // The catalogue tier decides which catalogue add-ons it offers.
    const tier = getTierById(held.planId);
    if (tier) {
      const closed = parsed.data.selections.find(
        (entry) =>
          getAddonById(entry.addonId) !== undefined &&
          !isAddonEligibleForTier(entry.addonId, held.planId as TierId),
      );
      if (closed) {
        return failureResponse(
          {
            code: 'billing.add_on_outside_tier',
            message: `The ${getAddonById(closed.addonId)?.name ?? closed.addonId} add-on is closed to the ${tier.name} tier.`,
            fix: 'Remove the add-on, or move to a tier that offers it.',
            details: { tierId: held.planId, addonId: closed.addonId },
          },
          400,
        );
      }
    }

    const workspacePath = `/v1/workspaces/${encodeURIComponent(home.workspace.workspaceId)}`;
    const current = await readActiveAddOns(home.workspace.workspaceId, held, options);
    const currentMap = new Map(current.map((entry) => [entry.addOnId, entry.quantity]));
    const nextMap = new Map(parsed.data.selections.map((entry) => [entry.addonId, entry.quantity]));

    for (const addOnId of Array.from(currentMap.keys())) {
      if (nextMap.has(addOnId)) continue;
      await ceruleaRequest(
        `${workspacePath}/subscription/add-ons/${encodeURIComponent(addOnId)}`,
        { method: 'DELETE' },
        options,
      );
    }
    for (const [addOnId, quantity] of Array.from(nextMap.entries())) {
      if (currentMap.get(addOnId) === quantity) continue;
      await ceruleaRequest(
        `${workspacePath}/subscription/add-ons`,
        { method: 'POST', body: JSON.stringify({ addOnId, quantity }) },
        options,
      );
    }

    const updated = await readActiveAddOns(home.workspace.workspaceId, held, options);
    return NextResponse.json({
      ok: true,
      division: home.division,
      addons: updated.map((entry) => ({ addonId: entry.addOnId, quantity: entry.quantity })),
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
