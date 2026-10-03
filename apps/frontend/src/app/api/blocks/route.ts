// apps/frontend/src/app/api/blocks/route.ts
// Serves the logic block catalogue.
// The catalogue is the seed file src/data/blocks.seed.json, imported so the
// route works from a built output as well as from the source tree.
// A track sees its own blocks and the blocks the seed marks for every track.
// Without this route the logic block palette is empty.
import { NextResponse } from 'next/server';

import blocksJson from '@/data/blocks.seed.json';
import { failureReply } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CatalogueBlock = { id: string; track?: string } & Record<string, unknown>;

type BlockCatalogue = {
  groups?: unknown[];
  blocks?: CatalogueBlock[];
  edgeDefaults?: Record<string, unknown>;
};

const CATALOGUE = blocksJson as unknown as BlockCatalogue;

/** The track values the seed uses for a block every track shares. */
const SHARED_TRACKS = new Set(['any', 'common']);

// GET /api/blocks?track=dapp|blockchain
export async function GET(request: Request) {
  try {
    const track = (new URL(request.url).searchParams.get('track') ?? '').toLowerCase();
    let blocks = CATALOGUE.blocks ?? [];
    if (track) {
      blocks = blocks.filter(
        (block) => !block.track || block.track === track || SHARED_TRACKS.has(block.track),
      );
    }
    return NextResponse.json({
      ok: true,
      groups: CATALOGUE.groups ?? [],
      blocks,
      edgeDefaults: CATALOGUE.edgeDefaults ?? {},
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
