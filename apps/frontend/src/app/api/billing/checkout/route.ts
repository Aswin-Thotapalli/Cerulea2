// apps/frontend/src/app/api/billing/checkout/route.ts
// Starts the subscription the pricing screen chose, with its add-ons.
// The tier id goes to Cerulea APIs as the plan, on the workspace serving the
// division of the tier. Cerulea APIs checks the plan against the plans its
// payments driver publishes and refuses a plan it does not serve. Each chosen
// add-on then goes onto the subscription Cerulea APIs started.
// Without this route the pricing screen has no way to start a plan.

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
import { billingDivision, billingHome } from '@/lib/entitlements-server';
import {
  type TierId,
  divisionForTierId,
  getAddonById,
  getTierById,
  isAddonEligibleForTier,
  isTierInDivision,
} from '@/config/billing-catalog';
import { DIVISION_LABELS } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const checkoutBody = z.object({
  tierId: z.string().min(1).max(80),
  addons: z
    .array(z.object({ addonId: z.string().min(1).max(80), quantity: z.number().int().min(1) }))
    .default([]),
  returnUrl: z.string().optional(),
  division: z.string().optional(),
});

/** The plans Cerulea APIs publishes and the add-ons it sells beside them. */
type AddOnCatalogue = {
  plans: { planId: string }[];
  addOns: { addOnId: string; displayName: string }[];
};

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = checkoutBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.tier_unnamed',
        message: 'Cerulea reads the tier and the add-ons on this request.',
        fix: 'Choose a tier on the pricing screen, then start the checkout again.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  const { tierId, addons } = parsed.data;
  const rawReturn = parsed.data.returnUrl;
  const returnUrl =
    rawReturn && rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : null;

  // The tier names its own division. A tier from another division stays closed.
  const asked = await billingDivision(request, parsed.data.division);
  const catalogueTier = getTierById(tierId);
  if (catalogueTier && asked && !isTierInDivision(tierId, asked)) {
    return failureResponse(
      {
        code: 'billing.tier_outside_division',
        message: `The ${catalogueTier.name} tier belongs to the ${DIVISION_LABELS[catalogueTier.division].title} division.`,
        fix: `Open the ${DIVISION_LABELS[asked].title} pricing screen and choose one of its tiers.`,
        details: { tierId, division: asked },
      },
      403,
    );
  }
  if (catalogueTier) {
    const closed = addons.find(
      (entry) =>
        getAddonById(entry.addonId) !== undefined &&
        !isAddonEligibleForTier(entry.addonId, tierId as TierId),
    );
    if (closed) {
      return failureResponse(
        {
          code: 'billing.add_on_outside_tier',
          message: `The ${getAddonById(closed.addonId)?.name ?? closed.addonId} add-on is closed to the ${catalogueTier.name} tier.`,
          fix: 'Remove the add-on, or choose a tier that offers it.',
          details: { tierId, addonId: closed.addonId },
        },
        400,
      );
    }
  }

  try {
    const options = callOptions(actor);

    // Every chosen add-on must be on sale before the plan starts, so a checkout
    // never stops halfway. A plan Cerulea APIs does not publish goes straight
    // to Cerulea APIs, which names the plans it serves.
    if (addons.length > 0) {
      const catalogue = await ceruleaRequest<AddOnCatalogue>(
        '/v1/billing/plans',
        { method: 'GET' },
        options,
      );
      const published = catalogue.plans.some((entry) => entry.planId === tierId);
      const sold = new Set(catalogue.addOns.map((entry) => entry.addOnId));
      const absent = addons.filter((entry) => !sold.has(entry.addonId));
      if (published && absent.length > 0) {
        return failureResponse(
          {
            code: 'billing.add_on_absent',
            message: `Cerulea sells no add-on named ${absent.map((entry) => entry.addonId).join(', ')}.`,
            fix: `Choose from the add-ons Cerulea sells: ${catalogue.addOns
              .map((entry) => entry.displayName)
              .join(', ')}.`,
            details: { addonIds: absent.map((entry) => entry.addonId) },
          },
          400,
        );
      }
    }

    const home = await billingHome(actor, request, {
      division: divisionForTierId(tierId) ?? asked,
    });
    const workspacePath = `/workspaces/${encodeURIComponent(home.workspace.workspaceId)}`;
    const started = await ceruleaRequest<Record<string, unknown>>(
      `/studio${workspacePath}/subscription`,
      { method: 'POST', body: JSON.stringify({ planId: tierId }) },
      options,
    );
    for (const entry of addons) {
      await ceruleaRequest(
        `/v1${workspacePath}/subscription/add-ons`,
        {
          method: 'POST',
          body: JSON.stringify({ addOnId: entry.addonId, quantity: entry.quantity }),
        },
        options,
      );
    }

    const url = returnUrl
      ? `/pricing/success?return=${encodeURIComponent(returnUrl)}`
      : '/pricing/success';
    return NextResponse.json({
      ok: true,
      url,
      division: home.division,
      workspace: home.workspace,
      ...started,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
