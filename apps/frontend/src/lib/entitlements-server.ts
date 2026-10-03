// apps/frontend/src/lib/entitlements-server.ts
// What an account holds in one division, read from Cerulea APIs.
// Cerulea APIs keeps one subscription on each workspace, with its add-ons and
// its invoices. Each workspace carries the application it serves, and the
// application names the division. This module finds the workspace a billing
// request works on, reads what that workspace holds, and turns the held tier
// and add-ons into the features and limits the Studio gates read.
// Without this module the billing routes and the entitlement route have no
// shared reading of the subscription.

import {
  type CeruleaApiOptions,
  type CeruleaWorkspace,
  CeruleaApiError,
  ceruleaRequest,
  listWorkspaces,
} from '@/lib/cerulea-api';
import type { NextResponse } from 'next/server';

import {
  type CeruleaActor,
  callOptions,
  failureResponse,
  requestDivision,
} from '@/lib/cerulea-server';
import { divisionWorkspace, workspacesWithHome } from '@/lib/workspace-home';
import { readOperatorRole, subscriptionOpen } from '@/lib/standing';
import {
  type Division,
  applicationForDivision,
  asDivision,
  divisionForApplication,
  divisionFromPath,
} from '@/config/divisions';
import {
  type Entitlement,
  type OwnedAddon,
  allFeaturesEntitlement,
  effectiveEntitlement,
} from '@/config/entitlements';
import type { TierId } from '@/config/billing-catalog';

/** The open subscription of one workspace, as Cerulea APIs reports it to Studio. */
export type HeldSubscription = {
  subscriptionId: string;
  workspaceId: string;
  planId: string;
  planName: string;
  state: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
};

/** One invoice the payments driver issued for the subscription. */
export type HeldInvoice = {
  invoiceId: string;
  state: string;
  currency: string;
  totalMinor: number;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  lines: { description: string; quantity: number; unitAmountMinor: number }[];
};

/** One add-on on the subscription record Cerulea APIs keeps. */
export type HeldAddOn = {
  addOnId: string;
  displayName: string;
  kind: string;
  metric: string | null;
  unitAmountMinor: number;
  includedQuantity: number;
  quantity: number;
  currency: string;
  state: string;
};

/** The subscription record with its add-ons, from the workspace billing read. */
type SubscriptionRecord = {
  subscription: {
    subscriptionId: string;
    subscriptionReference: string;
    state: string;
    addOns: HeldAddOn[];
  };
};

/** The workspace a billing request works on, and what it holds. */
export type BillingHome = {
  workspace: CeruleaWorkspace;
  division: Division | null;
  subscription: HeldSubscription | null;
  invoices: HeldInvoice[];
};

/** Reads the open subscription and the invoices of one workspace. */
export async function readWorkspaceSubscription(
  workspaceId: string,
  options: CeruleaApiOptions,
): Promise<{ subscription: HeldSubscription | null; invoices: HeldInvoice[] }> {
  const held = await ceruleaRequest<{
    subscription: HeldSubscription | null;
    invoices: HeldInvoice[];
  }>(`/studio/workspaces/${encodeURIComponent(workspaceId)}/subscription`, { method: 'GET' }, options);
  const subscription =
    held.subscription && subscriptionOpen(held.subscription.state, held.subscription.cancelledAt)
      ? held.subscription
      : null;
  return { subscription, invoices: held.invoices };
}

/**
 * Reads the active add-ons on the open subscription of one workspace.
 * The record must name the same subscription the Studio read named, so an
 * add-on left on an older subscription never counts.
 */
export async function readActiveAddOns(
  workspaceId: string,
  subscription: HeldSubscription,
  options: CeruleaApiOptions,
): Promise<HeldAddOn[]> {
  try {
    const record = await ceruleaRequest<SubscriptionRecord>(
      `/v1/workspaces/${encodeURIComponent(workspaceId)}/subscription`,
      { method: 'GET' },
      options,
    );
    if (record.subscription.subscriptionReference !== subscription.subscriptionId) return [];
    return record.subscription.addOns.filter((entry) => entry.state === 'active');
  } catch (cause) {
    if (cause instanceof CeruleaApiError && cause.code === 'billing.subscription_absent') return [];
    throw cause;
  }
}

/** Reads the division from the path of the screen that sent the request. */
function refererDivision(request: Request): Division | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    return divisionFromPath(new URL(referer).pathname);
  } catch {
    return null;
  }
}

/**
 * Reads the division a billing request works inside.
 * A division named in the body wins. The query value and the division cookie
 * come next, and the path of the calling screen comes last.
 */
export async function billingDivision(request: Request, named?: unknown): Promise<Division | null> {
  return asDivision(named) ?? (await requestDivision(request)) ?? refererDivision(request);
}

/**
 * Finds the workspace a billing request works on.
 * Inside a division the workspace serving that division answers, and Cerulea
 * opens one when the account holds none. Outside a division the workspace with
 * the most recent open subscription answers, and the first workspace answers
 * when no workspace holds one.
 */
export async function billingHome(
  actor: CeruleaActor,
  request: Request,
  choice: { division?: Division | null; workspaceId?: string | null } = {},
): Promise<BillingHome> {
  const options = callOptions(actor);
  const division = choice.division ?? (await billingDivision(request));
  if (division) {
    const workspace = await divisionWorkspace(
      actor.displayName,
      options,
      division,
      choice.workspaceId,
    );
    const held = await readWorkspaceSubscription(workspace.workspaceId, options);
    return { workspace, division, ...held };
  }

  const list = await workspacesWithHome(actor.displayName, options);
  const named = choice.workspaceId
    ? list.find((entry) => entry.workspaceId === choice.workspaceId)
    : undefined;
  if (named) {
    const held = await readWorkspaceSubscription(named.workspaceId, options);
    return { workspace: named, division: divisionForApplication(named.application), ...held };
  }

  let latest: BillingHome | null = null;
  for (const workspace of list) {
    const held = await readWorkspaceSubscription(workspace.workspaceId, options).catch(
      (cause: unknown) => {
        // A member without the billing read capability sees no subscription.
        if (cause instanceof CeruleaApiError && cause.status === 403) return null;
        throw cause;
      },
    );
    if (!held?.subscription) continue;
    if (
      !latest?.subscription ||
      held.subscription.currentPeriodStart > latest.subscription.currentPeriodStart
    ) {
      latest = { workspace, division: divisionForApplication(workspace.application), ...held };
    }
  }
  if (latest) return latest;

  const first = list[0];
  const held = await readWorkspaceSubscription(first.workspaceId, options);
  return { workspace: first, division: divisionForApplication(first.application), ...held };
}

/** The answer a billing change returns when the workspace runs no subscription. */
export function subscriptionAbsent(home: BillingHome): NextResponse {
  return failureResponse(
    {
      code: 'billing.subscription_absent',
      message: `The workspace ${home.workspace.name} runs no subscription.`,
      fix: 'Choose a plan on the pricing screen, then make the change again.',
      details: { workspaceId: home.workspace.workspaceId, division: home.division },
    },
    404,
  );
}

/** Turns held add-ons into the owned add-on list the entitlement table reads. */
export function ownedAddons(addOns: HeldAddOn[]): OwnedAddon[] {
  return addOns.map((entry) => ({ addonId: entry.addOnId, quantity: entry.quantity }));
}

/**
 * Resolves the effective entitlement of the account in one division.
 * The Cerulea operator holds every feature. Every other account holds the base
 * of the tier its division workspace runs, plus the grant of each active
 * add-on. The tier table and the add-on grants are the published catalogue.
 * A tier absent from the catalogue grants only its add-ons.
 */
export async function getEntitlement(
  options: CeruleaApiOptions,
  division: Division,
): Promise<Entitlement> {
  if (await readOperatorRole(options)) return allFeaturesEntitlement();

  const application = applicationForDivision(division);
  const { workspaces } = await listWorkspaces(options);
  for (const workspace of workspaces) {
    if (workspace.application !== application) continue;
    const held = await readWorkspaceSubscription(workspace.workspaceId, options).catch(
      (cause: unknown) => {
        if (cause instanceof CeruleaApiError && cause.status === 403) return null;
        throw cause;
      },
    );
    if (!held?.subscription) continue;
    const addOns = await readActiveAddOns(workspace.workspaceId, held.subscription, options);
    return effectiveEntitlement(held.subscription.planId as TierId, ownedAddons(addOns));
  }
  return { features: [], limits: {} };
}
