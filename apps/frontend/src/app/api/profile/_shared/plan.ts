// apps/frontend/src/app/api/profile/_shared/plan.ts
// The plan an account holds, read for the account and profile screens.
// Cerulea APIs answers one plan per division. The screens work inside one
// division at a time, so this module picks the division of the request and
// falls back to the first division holding a plan. The tier name, the specs
// and the limits come from the catalogue and the entitlement of that division.
// Without this module the plan chip and the usage meters would show a fixed label.
import { type CeruleaApiOptions, type CeruleaWorkspace, ceruleaRequest } from '@/lib/cerulea-api';
import { requestDivision } from '@/lib/cerulea-server';
import { type Division, asDivision, divisionForApplication } from '@/config/divisions';

export type DivisionAccess = {
  division: string;
  application: string;
  access: boolean;
  operator: boolean;
  tierId: string | null;
  tierName: string | null;
  billing: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  workspaceId: string | null;
  subscriptionId: string | null;
  pricingPath: string;
};

export type StudioAccess = {
  accountId: string;
  operator: boolean;
  subscriptions: Record<string, string | null>;
  divisions: DivisionAccess[];
};

type CatalogueTier = {
  id: string;
  name: string;
  blurb: string;
  specs: { label: string; value: string }[];
};

type Catalogue = {
  divisions: { division: string; tiers: CatalogueTier[] }[];
};

type Entitlement = {
  division?: string;
  features: string[];
  limits: Record<string, number>;
};

/** The plan view every account screen reads. */
export type PlanView = {
  division: Division | null;
  tierId: string | null;
  label: string;
  status: string | null;
  currentPeriodEnd: string | null;
  workspaceId: string | null;
  pricingPath: string;
  features: string[];
  limits: Record<string, number>;
  specs: { label: string; value: string }[];
};

/** The label of an account holding no plan in any division. */
export const PLAN_ABSENT_LABEL = 'No plan';

/** Turns a tier identifier into readable words when the catalogue holds no name for it. */
export function humaniseTierId(tierId: string): string {
  const words = tierId.split(/[_-]+/).filter((word) => word.length > 0).join(' ');
  return words.length > 0 ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : tierId;
}

/** Reads the plan list of the account. */
export function readStudioAccess(options: CeruleaApiOptions): Promise<StudioAccess> {
  return ceruleaRequest<StudioAccess>('/studio/access', { method: 'GET' }, options);
}

/**
 * Picks the division a screen works inside.
 * The request names one through its query or the division cookie. When that
 * division holds no plan, the first division holding a plan wins, so a person
 * opening the account screen outside a division still sees their plan.
 */
export function chooseDivision(access: StudioAccess, requested: Division | null): Division | null {
  const holding = access.divisions.filter((entry) => entry.tierId !== null);
  if (requested && holding.some((entry) => entry.division === requested)) return requested;
  const first = holding[0];
  if (first) return asDivision(first.division);
  return requested;
}

/** Reads the plan of the account for the division of the request. */
export async function readPlan(request: Request | undefined, options: CeruleaApiOptions): Promise<PlanView> {
  const [access, requested] = await Promise.all([readStudioAccess(options), requestDivision(request)]);
  const division = chooseDivision(access, requested);
  const entry = division ? access.divisions.find((item) => item.division === division) : undefined;
  if (!division || !entry) {
    return {
      division: null,
      tierId: null,
      label: PLAN_ABSENT_LABEL,
      status: null,
      currentPeriodEnd: null,
      workspaceId: null,
      pricingPath: '/pricing',
      features: [],
      limits: {},
      specs: [],
    };
  }
  const query = `?division=${encodeURIComponent(division)}`;
  const [entitlement, catalogue] = await Promise.all([
    ceruleaRequest<Entitlement>(`/studio/entitlements${query}`, { method: 'GET' }, options),
    ceruleaRequest<Catalogue>(`/studio/catalogue${query}`, { method: 'GET' }, options),
  ]);
  const tier = catalogue.divisions
    .flatMap((item) => item.tiers)
    .find((item) => item.id === entry.tierId);
  const label =
    entry.tierId === null
      ? PLAN_ABSENT_LABEL
      : (entry.tierName ?? tier?.name ?? humaniseTierId(entry.tierId));
  return {
    division,
    tierId: entry.tierId,
    label,
    status: entry.status,
    currentPeriodEnd: entry.currentPeriodEnd,
    workspaceId: entry.workspaceId,
    pricingPath: entry.pricingPath,
    features: entitlement.features ?? [],
    limits: entitlement.limits ?? {},
    specs: tier?.specs ?? [],
  };
}

/**
 * Picks the workspace the plan applies to.
 * The subscription names its workspace. Without one, the first workspace
 * serving the division wins, then the first workspace of the account.
 */
export function planWorkspace(plan: PlanView, workspaces: CeruleaWorkspace[]): CeruleaWorkspace | null {
  const named = plan.workspaceId
    ? workspaces.find((entry) => entry.workspaceId === plan.workspaceId)
    : undefined;
  if (named) return named;
  const serving = plan.division
    ? workspaces.find((entry) => divisionForApplication(entry.application) === plan.division)
    : undefined;
  return serving ?? workspaces[0] ?? null;
}
