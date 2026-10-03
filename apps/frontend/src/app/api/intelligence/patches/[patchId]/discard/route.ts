// apps/frontend/src/app/api/intelligence/patches/[patchId]/discard/route.ts
// Discards one Cerulea Intelligence patch.
// The Blueprint keeps the state it holds and the card closes.
// Without this route a diff card could only be accepted.
import { discardIntelligencePatch } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ patchId: string }> }) {
  const params = await context.params;
  return withActor(async (actor) => discardIntelligencePatch(params.patchId, callOptions(actor)));
}
