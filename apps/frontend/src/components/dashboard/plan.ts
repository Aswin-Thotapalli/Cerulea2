// apps/frontend/src/components/dashboard/plan.ts
// The plan chip every Dashboard screen shows beside the account.
// The session carries the tier id the account holds. The billing catalogue
// names each tier. A retired id shows as itself, so a reader still sees what
// the account holds. An account holding nothing reads "No plan".
// Without this module two screens would spell the same plan two ways.

import { getTierById } from '@/config/billing-catalog';

/** Turns the tier id the session carries into the label a chip shows. */
export function planLabel(plan: string | null | undefined): string {
  if (!plan || plan === 'free') return 'No plan';
  return getTierById(plan)?.name ?? plan;
}
