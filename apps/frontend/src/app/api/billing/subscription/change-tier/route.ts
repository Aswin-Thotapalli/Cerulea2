// apps/frontend/src/app/api/billing/subscription/change-tier/route.ts
// Moves the subscription of one division onto another tier of that division.
// Cerulea APIs changes the plan with the payments driver, removes every add-on
// the new tier does not offer and names them in the answer, so the billing
// screen reports what continued and what went.
// Without this route the only way to change plan would be a new purchase.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody } from '../../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const changeBody = z.object({
  tierId: z.string().min(1).max(80),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = changeBody.safeParse(await readBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.tier_unnamed',
        message: 'Cerulea reads the tier to move onto.',
        fix: 'Choose one of the tiers of this division, then switch again.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  return commerceCall(request, {
    method: 'POST',
    path: '/subscription/change-tier',
    body: parsed.data,
  });
}
