// apps/frontend/src/app/api/intelligence/patches/[patchId]/apply/route.ts
// Applies one Cerulea Intelligence patch to the Blueprint.
// Applying writes a content-addressed checkpoint holding the Blueprint, the
// patch and the turn that caused it, so any state restores in one action.
// Without this route a diff card could not be accepted.
import { applyIntelligencePatch } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ patchId: string }> }) {
  const params = await context.params;
  return withActor(async (actor) => applyIntelligencePatch(params.patchId, callOptions(actor)));
}
