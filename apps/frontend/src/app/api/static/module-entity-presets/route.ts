// apps/frontend/src/app/api/static/module-entity-presets/route.ts
// Serves the whole entity preset catalogue.
// The catalogue is the seed file src/data/module-entity-presets.json, imported
// so the route works from a built output as well as from the source tree.
// Without this route a screen reading presets over the network finds none.
import { NextResponse } from 'next/server';

import presets from '@/data/module-entity-presets.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(presets);
}
