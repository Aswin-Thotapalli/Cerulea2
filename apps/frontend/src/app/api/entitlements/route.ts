// apps/frontend/src/app/api/entitlements/route.ts
//
// GET /api/entitlements?division=dapp|enterprise|govt
// Returns the current user's effective entitlement (features + limits) for the
// division. The client Gate/useEntitlements hook reads this.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlements-server';
import { DIVISIONS, type Division } from '@/config/divisions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ features: [], limits: {} }, { status: 200 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('division');
  const cookieDiv = (req.headers.get('cookie') || '').match(/(?:^|;\s*)cerulea\.division=([^;]+)/)?.[1];
  const division = (q ?? cookieDiv) as Division | null;

  if (!division || !DIVISIONS.includes(division)) {
    return NextResponse.json({ features: [], limits: {}, error: 'unknown_division' }, { status: 200 });
  }

  const isAdmin = (session.user as any).isAdmin === true || (session.user as any).isTestAccount === true;
  const ent = await getEntitlement(session.user.id, division, isAdmin);
  return NextResponse.json({ division, ...ent });
}
