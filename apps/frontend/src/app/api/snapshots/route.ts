// apps/frontend/src/app/api/snapshots/route.ts
// The State screen lists and takes checkpoints of a project here.
// Cerulea APIs keeps every checkpoint against the project. A checkpoint names
// one Blueprint version by its content address, so a person returns to it
// later. A checkpoint never changes once taken.
// Without this route nobody can mark a state of the Blueprint to return to.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { type CeruleaCheckpoint, createCheckpoint, listCheckpoints } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
  withActor,
} from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const takeBody = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().max(400).nullable().optional(),
});

/** The checkpoint as the production screen reads it, with the Cerulea fields beside it. */
function screenSnapshot(checkpoint: CeruleaCheckpoint) {
  return {
    id: checkpoint.checkpointId,
    projectId: checkpoint.projectId,
    userId: checkpoint.createdByAccountId,
    name: checkpoint.label,
    description: checkpoint.note.length > 0 ? checkpoint.note : null,
    // Cerulea writes a checkpoint in the same call that takes it, so every checkpoint is ready.
    status: 'ready',
    version: checkpoint.version,
    blueprintId: checkpoint.blueprintId,
    blueprintHash: checkpoint.blueprintHash,
    restoredFromCheckpointId: checkpoint.restoredFromCheckpointId ?? null,
    createdAt: checkpoint.createdAt,
    // A checkpoint never changes, so its last change is the moment it was taken.
    updatedAt: checkpoint.createdAt,
  };
}

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get('projectId');
  if (!projectId) {
    return failureResponse(
      {
        code: 'checkpoint.project_unnamed',
        message: 'Cerulea reads the checkpoints of one project at a time.',
        fix: 'Choose a project, then open the checkpoint list again.',
        details: {},
      },
      400,
    );
  }
  return withActor(async (actor) => {
    const held = await listCheckpoints(projectId, callOptions(actor));
    const snapshots = held.checkpoints
      .map(screenSnapshot)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return { ok: true, snapshots };
  });
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = takeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'checkpoint.request_incomplete',
        message: 'A checkpoint names the project and carries a name of two characters or more.',
        fix: 'Choose the project, type a name that describes this state, then take the checkpoint again.',
        details: {},
      },
      400,
    );
  }
  try {
    const taken = await createCheckpoint(
      parsed.data.projectId,
      {
        label: parsed.data.name,
        note: parsed.data.description ? parsed.data.description : undefined,
      },
      callOptions(actor),
    );
    return NextResponse.json(
      { ok: true, snapshot: screenSnapshot(taken.checkpoint) },
      { status: 201 },
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
