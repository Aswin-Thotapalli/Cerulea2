// apps/frontend/src/lib/standing.ts
// What a signed in account holds: one subscription per division, and the
// Cerulea operator role.
// Cerulea APIs keeps a subscription on each workspace, and each workspace
// carries the application it serves. The application names the division, so a
// subscription on a Dapps workspace opens the Dapps Studio.
// Cerulea APIs also keeps the operator list. Studio asks Cerulea APIs whether
// the account holds the role, so the list lives in one place.
// Without this module the division gate and the administration host would
// have nothing to read.

import {
  type CeruleaApiOptions,
  CeruleaApiError,
  ceruleaRequest,
  listWorkspaces,
} from '@/lib/cerulea-api';
import { type Division, type DivisionSubs, divisionForApplication } from '@/config/divisions';

/** The subscription answer Cerulea APIs gives for one workspace. */
type WorkspaceSubscription = {
  subscription: {
    subscriptionId: string;
    planId: string;
    planName: string;
    state: string;
    cancelledAt: string | null;
  } | null;
};

export type Standing = {
  /** The plan held in each division, keyed by division. */
  divisionSubs: DivisionSubs;
  /** The single plan older screens read, taken from the divisions in order. */
  plan: string;
  /** True when Cerulea APIs names the account in its operator list. */
  isOperator: boolean;
};

/** The order the single plan value reads the divisions in. */
const PLAN_ORDER: Division[] = ['dapp', 'enterprise', 'govt'];

/** Reads the single plan value from the division map. An empty map reads free. */
export function planFromDivisions(subs: DivisionSubs): string {
  for (const division of PLAN_ORDER) {
    const plan = subs[division];
    if (plan) return plan;
  }
  return 'free';
}

/** Reports whether a subscription state keeps the division open. */
export function subscriptionOpen(state: string, cancelledAt: string | null): boolean {
  if (cancelledAt !== null) return false;
  return state !== 'cancelled' && state !== 'suspended' && state !== 'ended';
}

/** Reads the plan held in each division from the workspaces of the account. */
export async function readDivisionSubs(options: CeruleaApiOptions): Promise<DivisionSubs> {
  const { workspaces } = await listWorkspaces(options);
  const subs: DivisionSubs = {};
  for (const workspace of workspaces) {
    const division = divisionForApplication(workspace.application);
    if (!division || subs[division]) continue;
    const held = await ceruleaRequest<WorkspaceSubscription>(
      `/studio/workspaces/${encodeURIComponent(workspace.workspaceId)}/subscription`,
      { method: 'GET' },
      options,
    ).catch((cause: unknown) => {
      // A member without the billing read capability sees no subscription.
      if (cause instanceof CeruleaApiError && cause.status === 403) {
        return { subscription: null } satisfies WorkspaceSubscription;
      }
      throw cause;
    });
    const subscription = held.subscription;
    if (subscription && subscriptionOpen(subscription.state, subscription.cancelledAt)) {
      subs[division] = subscription.planId;
    }
  }
  return subs;
}

/**
 * Asks Cerulea APIs whether the account holds the operator role.
 * The administration workspace read opens for the role alone and answers 403
 * for every other account.
 */
export async function readOperatorRole(options: CeruleaApiOptions): Promise<boolean> {
  try {
    await ceruleaRequest('/studio/administration/workspaces', { method: 'GET' }, options);
    return true;
  } catch (cause) {
    if (cause instanceof CeruleaApiError && cause.status === 403) return false;
    throw cause;
  }
}

/** Reads the whole standing of the account in one pass. */
export async function readStanding(options: CeruleaApiOptions): Promise<Standing> {
  const [divisionSubs, isOperator] = await Promise.all([
    readDivisionSubs(options),
    readOperatorRole(options),
  ]);
  return { divisionSubs, plan: planFromDivisions(divisionSubs), isOperator };
}
