// apps/frontend/src/app/api/static/logic-palette/route.ts
// Serves the logic palette for one track.
// The palette is the seed file src/data/logic-palette.seed.json, imported so
// the route works from a built output as well as from the source tree.
// Without this route the behaviour panel offers no logic items.
import { NextResponse } from 'next/server';

import palette from '@/data/logic-palette.seed.json';
import { failureReply } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PALETTE = palette as unknown as Record<'dapp' | 'blockchain', unknown[]>;

// GET /api/static/logic-palette?track=dapp|blockchain
export async function GET(request: Request) {
  try {
    const track = new URL(request.url).searchParams.get('track') === 'blockchain' ? 'blockchain' : 'dapp';
    return NextResponse.json({ items: PALETTE[track] ?? [] });
  } catch (cause) {
    return failureReply(cause);
  }
}
