// apps/frontend/src/app/api/projects/[id]/simulation/route.ts
// The simulation run behind Step 6.
// Cerulea sends generated transactions of every class to the Blockchain and
// measures what happened. Every figure in the answer comes from the blocks.
// Without this route the readiness screen would guess at behaviour.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  transactionsPerClass: z.number().int().min(1).max(50).optional(),
  version: z.number().int().min(1).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = body.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'simulation.request_unclear',
          message: 'Cerulea reads a count between one and fifty for each class.',
          fix: 'Choose a count inside that range, then run the simulation again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await ceruleaRequest(
        `/studio/projects/${encodeURIComponent(params.id)}/simulation`,
        { method: 'POST', body: JSON.stringify(parsed.data) },
        callOptions(actor),
      ),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
