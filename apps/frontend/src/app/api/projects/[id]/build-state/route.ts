// apps/frontend/src/app/api/projects/[id]/build-state/route.ts
// The build state of one project.
// The Blueprint carries the twelve sections Cerulea deploys. The build state
// carries the choices that produced them, including the execution substrate,
// the outcomes selected and the policy answers.
// Without this route every step would start from nothing on each visit.
import { NextResponse } from 'next/server';

import { readBuildState, readExecutionSubstrates, saveBuildState } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [held, substrates] = await Promise.all([
      readBuildState(params.id, options),
      readExecutionSubstrates(options),
    ]);
    return { ...held, substrates: substrates.substrates };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !('buildState' in body)) {
    return NextResponse.json(
      {
        error: {
          code: 'build_state.body_absent',
          message: 'Cerulea reads the build state on this save.',
          fix: 'Send the whole build state, then save again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await saveBuildState(
        params.id,
        (body as { buildState: Parameters<typeof saveBuildState>[1] }).buildState,
        callOptions(actor),
      ),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
