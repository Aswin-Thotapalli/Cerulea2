// apps/frontend/src/components/billing/plan-standing.ts
// Reads the standing answer of Cerulea APIs for an active plan.
// The checkout success screen and the billing screen both ask the same
// question of the same answer, so the reading lives in one place.

import type { Division } from '@/config/divisions';

/** One division as the standing answer describes it. */
export type DivisionStanding = {
  division: Division;
  access: boolean;
  tierId: string | null;
  tierName: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  workspaceId: string | null;
  pricingPath: string;
};

/** The standing answer as the Studio access route serves it. */
export type AccessAnswer = {
  ok?: boolean;
  operator?: boolean;
  divisions?: DivisionStanding[];
};

/** Reports whether the standing shows an active plan in any division. */
export function holdsActivePlan(answer: AccessAnswer | null | undefined): boolean {
  return (
    answer?.ok === true &&
    (answer.divisions ?? []).some(
      (entry) => entry.access && entry.tierId !== null && entry.status === 'active',
    )
  );
}

/** The divisions in which the standing shows a subscription, in catalogue order. */
export function paidDivisions(answer: AccessAnswer | null | undefined): Division[] {
  return (answer?.divisions ?? [])
    .filter((entry) => entry.tierId !== null)
    .map((entry) => entry.division);
}

/**
 * Chooses the division the billing screen opens on.
 * A division named in the address wins when the account pays there. The
 * division of the cookie comes next on the same condition. Then the first
 * division with a subscription. Then the named or cookie division without
 * one, so the screen can offer its pricing. The dApps division closes the list.
 */
export function billingDivisionChoice(
  answer: AccessAnswer | null | undefined,
  named: Division | null,
  fromCookie: Division | null,
): Division {
  const paid = paidDivisions(answer);
  if (named && paid.includes(named)) return named;
  if (fromCookie && paid.includes(fromCookie)) return fromCookie;
  if (paid.length > 0) return paid[0];
  return named ?? fromCookie ?? 'dapp';
}
