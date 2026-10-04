// apps/frontend/src/app/api/billing/checkout/route.ts
// Starts the tier the pricing screen chose, with its add-ons.
// Cerulea APIs checks the tier against the priced catalogue of the division,
// refuses a tier from another division and an add-on closed to the tier, opens
// the workspace serving the division when the account holds none, and answers
// the address the browser continues to. In local mode the purchase settles at
// once and the address is the success screen of Studio.
// Without this route the pricing screen has no way to start a plan.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody, withDivision } from '../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const checkoutBody = z.object({
  tierId: z.string().min(1).max(80),
  addons: z
    .array(
      z.object({
        addonId: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .default([]),
  returnUrl: z.string().max(400).optional(),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = checkoutBody.safeParse(await readBody(request));
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
  const { returnUrl, ...body } = parsed.data;
  const safeReturn =
    returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : undefined;
  return commerceCall(request, {
    method: 'POST',
    path: '/checkout',
    body: { ...body, ...(safeReturn ? { returnUrl: safeReturn } : {}) },
    // The success screen reads the division from its address, so the poll
    // for the new subscription asks the right division.
    reshape: (answer, context) => ({
      ...answer,
      url: withDivision(answer.url, context.division),
    }),
  });
}
