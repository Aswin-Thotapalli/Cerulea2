// apps/frontend/src/app/api/billing/subscription/cancel/route.ts
// Ends the subscription the account holds in one division.
// By default the subscription stays open until the end of the paid period and
// the billing screen shows the pending end with a Resume control. An immediate
// end is asked for with atPeriodEnd false. Every record stays readable and
// exportable afterwards.
// Without this route the billing screen has no way to end a plan.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody } from '../../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cancelBody = z.object({
  atPeriodEnd: z.boolean().default(true),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = cancelBody.safeParse(await readBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.cancel_unreadable',
        message: 'Cerulea reads whether the subscription ends now or at the end of the period.',
        fix: 'Send atPeriodEnd as true or false, then cancel again.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  return commerceCall(request, {
    method: 'POST',
    path: '/subscription/cancel',
    body: parsed.data,
  });
}
