// apps/frontend/src/app/api/billing/catalogue/route.ts
// Serves the priced catalogue: the seven tiers, the add-ons and the export
// action of each division, in US dollars, with the entitlements each tier
// grants. Cerulea APIs publishes the catalogue without a sign in, so the
// pricing screen reads it before an account exists. The billing screen reads
// it to draw the plan switcher and the add-on selector of the division.
// Without this route the screens would carry a second copy of the prices.

import { NextResponse } from 'next/server';

import { ceruleaRequest } from '@/lib/cerulea-api';
import { failureReply } from '@/lib/cerulea-server';
import { asDivision } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const division = asDivision(new URL(request.url).searchParams.get('division'));
  try {
    const catalogue = await ceruleaRequest<Record<string, unknown>>(
      `/studio/catalogue${division ? `?division=${division}` : ''}`,
      { method: 'GET' },
    );
    return NextResponse.json({ ok: true, ...catalogue });
  } catch (cause) {
    return failureReply(cause);
  }
}
