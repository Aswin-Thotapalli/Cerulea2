// apps/frontend/src/app/api/projects/[id]/logic/route.ts
// The behaviour flows the model step builds for one project.
// The flows live in the draft area of the Studio build state under
// `step2::logic`.
// Without this route every behaviour flow is lost when the project reopens.
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
    const saved = held.drafts[DRAFT_KEYS.logic];
    // A project with no saved flows answers an empty flow list on its own track.
    return NextResponse.json(saved ?? { flows: [], track: held.buildState.foundation.track });
  } catch (cause) {
    return failureReply(cause);
  }
}

// PUT /api/projects/[id]/logic  body: { flows, track }
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = (await objectBody(request)) ?? {};
  const clean = {
    flows: Array.isArray(body.flows) ? body.flows : [],
    track: body.track === 'blockchain' ? 'blockchain' : 'dapp',
  };
  try {
    await writeDraft(id, DRAFT_KEYS.logic, clean, callOptions(actor));
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return failureReply(cause);
  }
}

export const PATCH = PUT;
