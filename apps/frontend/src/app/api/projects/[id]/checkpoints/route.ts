// apps/frontend/src/app/api/projects/[id]/checkpoints/route.ts
// Reads and takes checkpoints of one project through Cerulea APIs.
// A checkpoint marks one Blueprint version by name, so a person returns to a
// known good state later.
// Without this route the state history carries no named points.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createCheckpoint, listCheckpoints } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const takeBody = z.object({
  label: z.string().min(2).max(120),
  note: z.string().max(400).optional(),
  version: z.number().int().min(1).optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    return NextResponse.json(await listCheckpoints(params.id, callOptions(actor)));
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = takeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'checkpoint.label_short',
          message: 'A checkpoint carries a name of at least two characters.',
          fix: 'Type a name that describes this state, then take the checkpoint again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await createCheckpoint(params.id, parsed.data, callOptions(actor)),
      { status: 201 },
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
