// apps/frontend/src/app/api/projects/[id]/blueprint/route.ts
// The module graph the canvas draws for one project.
// The graph lives in the draft area of the Studio build state under
// `blueprint::graph`. The chosen module identifiers also go into the compose
// list of the build state, which the later steps read.
// The typed twelve section Blueprint has its own routes under
// /api/projects/[id]/blueprint/versions and /api/projects/[id]/checkpoints.
// Without this route the canvas starts empty on every visit.
import { NextResponse } from 'next/server';

import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import {
  DRAFT_KEYS,
  changeBuildState,
  moduleIdsOf,
  objectBody,
  readHeldBuildState,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const held = await readHeldBuildState(id, callOptions(actor));
    return NextResponse.json({ ok: true, blueprint: held.drafts[DRAFT_KEYS.graph] ?? null });
  } catch (cause) {
    return failureReply(cause);
  }
}

// PATCH /api/projects/[id]/blueprint  body: { modules, graph: { nodes, edges } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  if (!body) {
    return failureResponse(
      {
        code: 'canvas.graph_absent',
        message: 'Cerulea reads the module list and the canvas graph on this save.',
        fix: 'Send the modules and the graph with its nodes and edges, then save again.',
        details: {},
      },
      400,
    );
  }
  try {
    const moduleIds = moduleIdsOf(body);
    await changeBuildState(
      id,
      callOptions(actor),
      (state, drafts) => {
        drafts[DRAFT_KEYS.graph] = body;
        state.compose.moduleIds = moduleIds;
      },
      [DRAFT_KEYS.graph],
    );
    return NextResponse.json({ ok: true, moduleIds });
  } catch (cause) {
    return failureReply(cause);
  }
}
