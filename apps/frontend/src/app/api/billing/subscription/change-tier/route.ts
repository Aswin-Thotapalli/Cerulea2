// apps/frontend/src/app/api/billing/subscription/change-tier/route.ts
// Moves the running subscription to another tier.
// Cerulea APIs starts the new plan on the same workspace and closes the old
// subscription in one request. The add-ons of the old subscription then go
// onto the new one, apart from each catalogue add-on the new tier leaves out.
// The reply names every add-on that left.
// Without this route the billing screen cannot move a workspace between tiers.

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
  isTierInDivision,
} from '@/config/billing-catalog';
import { DIVISION_LABELS } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const changeBody = z.object({ tierId: z.string().min(1).max(80) });

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = changeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.tier_unnamed',
        message: 'Cerulea reads the new tier on this request.',
        fix: 'Choose a tier on the billing screen, then switch again.',
        details: {},
      },
      400,
    );
  }
  const { tierId } = parsed.data;
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request);
    const held = home.subscription;
    if (!held) return subscriptionAbsent(home);

    const tier = getTierById(tierId);
    if (tier && home.division && !isTierInDivision(tierId, home.division)) {
      return failureResponse(
        {
          code: 'billing.tier_outside_division',
          message: `The ${tier.name} tier belongs to the ${DIVISION_LABELS[tier.division].title} division.`,
          fix: `Choose one of the ${DIVISION_LABELS[home.division].title} tiers.`,
          details: { tierId, division: home.division },
        },
        403,
      );
    }

    const before = await readActiveAddOns(home.workspace.workspaceId, held, options);
    const kept = before.filter(
      (entry) =>
        !tier ||
        getAddonById(entry.addOnId) === undefined ||
        isAddonEligibleForTier(entry.addOnId, tierId as TierId),
    );
    const removed = before.filter((entry) => !kept.includes(entry));

    const workspacePath = `/workspaces/${encodeURIComponent(home.workspace.workspaceId)}`;
    const started = await ceruleaRequest<Record<string, unknown>>(
      `/studio${workspacePath}/subscription`,
      { method: 'POST', body: JSON.stringify({ planId: tierId }) },
      options,
    );
    for (const entry of kept) {
      await ceruleaRequest(
        `/v1${workspacePath}/subscription/add-ons`,
        { method: 'POST', body: JSON.stringify({ addOnId: entry.addOnId, quantity: entry.quantity }) },
        options,
      );
    }

    return NextResponse.json({
      ok: true,
      tierId,
      removedAddons: removed.map((entry) => getAddonById(entry.addOnId)?.name ?? entry.displayName),
      division: home.division,
      ...started,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
