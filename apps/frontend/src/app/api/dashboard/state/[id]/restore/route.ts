// apps/frontend/src/app/api/dashboard/state/[id]/restore/route.ts
// The State Snapshots screen restores a checkpoint through this route.
// A checkpoint never changes. Restoring writes the Blueprint it names as a new
// version and takes a new checkpoint of the result, so the current work stays
// in the version history.
// Without this route a person returns to an earlier state by hand.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { type CeruleaBlueprintVersion, type CeruleaCheckpoint, ceruleaRequest } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const restoreBody = z.object({
  projectId: z.string().min(1),
  label: z.string().min(2).max(160).optional(),
});

type RestoreOutcome = {
  checkpoint: CeruleaCheckpoint;
  restoredFrom: CeruleaCheckpoint;
  blueprint: CeruleaBlueprintVersion;
  alreadyAtHead: boolean;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: checkpointId } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = restoreBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'checkpoint.project_unnamed',
        message: 'A restore names the project the snapshot belongs to.',
        fix: 'Choose the project, then restore the snapshot again.',
        details: {},
      },
      400,
    );
  }
  try {
    const outcome = await ceruleaRequest<RestoreOutcome>(
      `/projects/${encodeURIComponent(parsed.data.projectId)}/checkpoints/${encodeURIComponent(checkpointId)}/restoration`,
      { method: 'POST', body: JSON.stringify(parsed.data.label ? { label: parsed.data.label } : {}) },
      callOptions(actor),
    );
    return NextResponse.json(outcome, { status: 201 });
  } catch (cause) {
    return failureReply(cause);
  }
}
