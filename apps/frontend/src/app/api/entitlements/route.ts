// apps/frontend/src/app/api/entitlements/route.ts
// GET /api/entitlements?division=dapp|enterprise|govt
// Answers the features and limits the account holds in one division.
// The tier and the add-ons come from the subscription Cerulea APIs keeps on the
// workspace serving the division. The published tier table turns them into
// features and limits. The Cerulea operator holds every feature.
// Without this route every Studio gate stays closed.

import { NextResponse } from 'next/server';

import { callOptions, ceruleaActor, failureReply, failureResponse, requestDivision, signInRequired } from '@/lib/cerulea-server';
import { getEntitlement } from '@/lib/entitlements-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const division = await requestDivision(request);
  if (!division) {
    return failureResponse(
      {
        code: 'entitlement.division_unnamed',
        message: 'Cerulea reads the division on this request.',
        fix: 'Name the division as dapp, enterprise or govt, then read the entitlement again.',
        details: {},
      },
      400,
    );
  }
  try {
    const entitlement = await getEntitlement(callOptions(actor), division);
    return NextResponse.json({ division, ...entitlement });
  } catch (cause) {
    return failureReply(cause);
  }
}
