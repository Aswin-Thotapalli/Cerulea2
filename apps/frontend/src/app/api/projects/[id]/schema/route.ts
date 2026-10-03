// apps/frontend/src/app/api/projects/[id]/schema/route.ts
// The data model the model step builds for one project: entities,
// relationships and the track.
// The model lives in the draft area of the Studio build state under
// `step2::schema`.
// Without this route the model step starts empty on every visit.
import { NextResponse } from 'next/server';

import {
  callOptions,
  ceruleaActor,
  failureReply,
  signInRequired,
} from '@/lib/cerulea-server';
import {
  DRAFT_KEYS,
  objectBody,
  readHeldBuildState,
  writeDraft,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const held = await readHeldBuildState(id, callOptions(actor));
    const saved = held.drafts[DRAFT_KEYS.schema];
    // A project with no saved model answers the empty model on its own track.
    return NextResponse.json(
      saved ?? { entities: [], relationships: [], track: held.buildState.foundation.track },
    );
  } catch (cause) {
    return failureReply(cause);
  }
}

// PUT /api/projects/[id]/schema  body: { entities, relationships, track }
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = (await objectBody(request)) ?? {};
  const clean = {
    entities: Array.isArray(body.entities) ? body.entities : [],
    relationships: Array.isArray(body.relationships) ? body.relationships : [],
    track: body.track === 'blockchain' ? 'blockchain' : 'dapp',
  };
  try {
    await writeDraft(id, DRAFT_KEYS.schema, clean, callOptions(actor));
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return failureReply(cause);
  }
}

export const PATCH = PUT;
