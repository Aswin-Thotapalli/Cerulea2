// apps/frontend/src/app/api/billing/subscription/cancel/route.ts
// Ends the subscription of the workspace serving the division.
// Cerulea APIs closes the subscription record, and the payments driver stops
// the subscription at the end of the paid period. Every record stays readable
// and exportable afterwards.
// Without this route the billing screen has no way to end a plan.

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ceruleaRequest } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import { billingHome, subscriptionAbsent } from '@/lib/entitlements-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cancelBody = z.object({ atPeriodEnd: z.boolean().default(true) });

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = cancelBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.cancel_unreadable',
        message: 'Cerulea reads atPeriodEnd as true or false on this request.',
        fix: 'Send the cancellation again from the billing screen.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  // Cerulea APIs ends every subscription at the close of the paid period.
  if (!parsed.data.atPeriodEnd) {
    return failureResponse(
      {
        code: 'billing.cancel_immediate_absent',
        message: 'Cerulea ends a subscription at the close of the paid period.',
        fix: 'Send the cancellation with atPeriodEnd set to true.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request);
    if (!home.subscription) return subscriptionAbsent(home);
    const outcome = await ceruleaRequest<Record<string, unknown>>(
      `/studio/workspaces/${encodeURIComponent(home.workspace.workspaceId)}/subscription`,
      { method: 'DELETE' },
      options,
    );
    return NextResponse.json({
      ok: true,
      atPeriodEnd: true,
      division: home.division,
      ...outcome,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
