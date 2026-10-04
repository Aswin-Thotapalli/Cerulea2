// apps/frontend/src/app/api/billing/addons/checkout/route.ts
// Starts the one time purchase an add-on needs before it joins the subscription.
// Cerulea APIs opens the purchase with the payments driver and answers the
// address the browser continues to. In local mode the purchase settles at once
// and the browser returns to the billing screen.
// Without this route an add-on with a one time part could never be bought.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody } from '../../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const checkoutBody = z.object({
  addonId: z.string().min(1).max(80),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = checkoutBody.safeParse(await readBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.add_on_unnamed',
        message: 'Cerulea reads the add-on to buy.',
        fix: 'Switch the add-on on from the billing screen, which names it.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  return commerceCall(request, {
    method: 'POST',
    path: '/addons/checkout',
    body: parsed.data,
  });
}
