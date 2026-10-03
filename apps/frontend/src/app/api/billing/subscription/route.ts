// apps/frontend/src/app/api/billing/subscription/route.ts
// Reads, starts and ends the subscription of the workspace serving one division.
// Cerulea APIs keeps the subscription on the workspace. The payments driver
// behind Cerulea APIs holds the plans and the invoices. The division comes from
// the request, so the Government billing screen reads the government workspace.
// The reply carries the fields the billing, pricing and checkout screens read:
// the tier, its status, its period end and its add-ons, beside the workspace,
// the published plans, the subscription record and the invoices.
// Without this route a person cannot see or change what a workspace pays for.

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
import { billingDivision, billingHome, readActiveAddOns } from '@/lib/entitlements-server';
import { getTierById } from '@/config/billing-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startBody = z.object({
  planId: z.string().min(1).max(80),
  workspaceId: z.string().min(1).optional(),
  division: z.string().optional(),
});

export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const named = new URL(request.url).searchParams.get('workspaceId');
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request, { workspaceId: named });
    const plans = await ceruleaRequest<{ plans: unknown[] }>(
      '/studio/plans',
      { method: 'GET' },
      options,
    );
    const held = home.subscription;
    const addOns = held ? await readActiveAddOns(home.workspace.workspaceId, held, options) : [];
    return NextResponse.json({
      ok: true,
      division: home.division,
      workspace: home.workspace,
      plans: plans.plans,
      invoices: home.invoices,
      subscription: held
        ? {
            ...held,
            id: held.subscriptionId,
            tierId: held.planId,
            status: held.state,
            // An open subscription in Cerulea APIs carries no pending end.
            cancelAtPeriodEnd: false,
          }
        : null,
      tier: held ? (getTierById(held.planId) ?? null) : null,
      addons: addOns.map((entry) => ({ addonId: entry.addOnId, quantity: entry.quantity })),
    });
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = startBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.plan_unnamed',
        message: 'Cerulea reads the plan on this request.',
        fix: 'Choose one of the published plans, then start the subscription again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const division = await billingDivision(request, parsed.data.division);
    const home = await billingHome(actor, request, {
      division,
      workspaceId: parsed.data.workspaceId,
    });
    const outcome = await ceruleaRequest<Record<string, unknown>>(
      `/studio/workspaces/${encodeURIComponent(home.workspace.workspaceId)}/subscription`,
      { method: 'POST', body: JSON.stringify({ planId: parsed.data.planId }) },
      options,
    );
    return NextResponse.json(
      { ok: true, division: home.division, workspace: home.workspace, ...outcome },
      { status: 201 },
    );
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function DELETE(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const named = new URL(request.url).searchParams.get('workspaceId');
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request, { workspaceId: named });
    const outcome = await ceruleaRequest<Record<string, unknown>>(
      `/studio/workspaces/${encodeURIComponent(home.workspace.workspaceId)}/subscription`,
      { method: 'DELETE' },
      options,
    );
    return NextResponse.json({
      ok: true,
      division: home.division,
      workspace: home.workspace,
      ...outcome,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
