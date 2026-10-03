// apps/frontend/src/app/api/presets/modules/route.ts
// Serves the entity presets of one module.
// The presets come from the seed file src/data/module-entity-presets.json,
// imported so the route works from a built output as well as from the source
// tree. A module the seed names no preset for answers an empty list.
// Without this route a module dropped on the canvas brings no starting entities.
import { NextResponse } from 'next/server';

import { failureReply } from '@/lib/cerulea-server';
import { modulePresets } from '@/app/api/presets/_shared/entity-presets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/presets/modules?id=
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    return NextResponse.json(id ? modulePresets(id) : [], { status: 200 });
  } catch (cause) {
    return failureReply(cause);
  }
}
