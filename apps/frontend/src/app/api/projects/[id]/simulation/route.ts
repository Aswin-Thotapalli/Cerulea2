// apps/frontend/src/app/api/projects/[id]/simulation/route.ts
// The simulation run behind the Verify and deploy sub-step.
// Cerulea sends generated transactions of every class to the Blockchain and
// measures what happened. Every figure in the answer comes from the blocks.
// A finished run marks the verify step in the build state, so the readiness
// checklist reads it on the next open.
// Without this route the readiness screen would guess at behaviour.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ceruleaRequest } from '@/lib/cerulea-api';
import { changeBuildState } from '@/app/api/projects/_shared/project-record';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  transactionsPerClass: z.number().int().min(1).max(50).optional(),
  version: z.number().int().min(1).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = body.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'simulation.request_unclear',
        message: 'Cerulea reads a count between one and fifty for each class.',
        fix: 'Choose a count inside that range, then run the simulation again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const report = await ceruleaRequest<Record<string, unknown>>(
      `/studio/projects/${encodeURIComponent(params.id)}/simulation`,
      { method: 'POST', body: JSON.stringify(parsed.data) },
      options,
    );
    await changeBuildState(params.id, options, (state) => {
      state.steps.verify = true;
    });
    return NextResponse.json(report);
  } catch (cause) {
    return failureReply(cause);
  }
}
