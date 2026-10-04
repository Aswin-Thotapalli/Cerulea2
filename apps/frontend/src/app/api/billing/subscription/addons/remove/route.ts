// apps/frontend/src/app/api/billing/subscription/addons/remove/route.ts
// Removes one add-on from the subscription at once.
// The billing screen calls this the moment an add-on is switched off, so a
// cancellation never waits for Save. Cerulea APIs ends the add-on with the
// payments driver and keeps the record of the time it ran.
// Without this route a person could switch an add-on off and keep paying.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody } from '../../../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const removeBody = z.object({
  addonId: z.string().min(1).max(80),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = removeBody.safeParse(await readBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.add_on_unnamed',
        message: 'Cerulea reads the add-on to remove.',
        fix: 'Switch the add-on off on the billing screen, which names it.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  return commerceCall(request, {
    method: 'POST',
    path: '/subscription/addons/remove',
    body: parsed.data,
  });
}
