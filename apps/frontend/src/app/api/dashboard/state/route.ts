// apps/frontend/src/app/api/dashboard/state/route.ts
// The Versions panel reads this route.
// Every save that changes the content address produces a Blueprint version. A
// checkpoint names one of those versions, so a person returns to it later.
// Without this route nobody can see what changed and when.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { countSections } from '@/lib/blueprint/document';
import { createCheckpoint, listBlueprintVersions, listCheckpoints } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired, withActor } from '@/lib/cerulea-server';
import { projectsWithBlueprints } from '@/lib/project-blueprints';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const checkpointBody = z.object({
  projectId: z.string().min(1),
  label: z.string().min(2).max(120),
  note: z.string().max(400).optional(),
});

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const { entries } = await projectsWithBlueprints(actor.displayName, options);
    const projects = [];
    for (const entry of entries) {
      const [versions, checkpoints] = await Promise.all([
        listBlueprintVersions(entry.project.projectId, 20, options),
        listCheckpoints(entry.project.projectId, options),
      ]);
      projects.push({
        projectId: entry.project.projectId,
        projectName: entry.project.name,
        workspaceName: entry.workspace.name,
        state: entry.project.state,
        headVersion: entry.version,
        blueprintHash: entry.blueprintHash,
        counts: countSections(entry.document),
        versions: versions.versions,
        checkpoints: checkpoints.checkpoints,
      });
    }
    return { projects };
  });
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = checkpointBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'checkpoint.request_incomplete',
          message: 'A checkpoint names the project and carries a label of two characters or more.',
          fix: 'Choose the project, type a label that describes this state, then take the checkpoint again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await createCheckpoint(
        parsed.data.projectId,
        { label: parsed.data.label, note: parsed.data.note },
        callOptions(actor),
      ),
      { status: 201 },
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
