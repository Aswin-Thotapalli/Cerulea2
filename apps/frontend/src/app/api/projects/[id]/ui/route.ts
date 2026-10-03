// apps/frontend/src/app/api/projects/[id]/ui/route.ts
// The interface layout the interface step builds for one project: pages,
// elements, layout and bindings.
// The layout lives in the draft area of the Studio build state under
// `step5::ui`. The project read returns it as `ui`.
// Without this route the interface step saves nothing.
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
    return NextResponse.json({ ok: true, ui: held.drafts[DRAFT_KEYS.ui] ?? null });
  } catch (cause) {
    return failureReply(cause);
  }
}

// PUT /api/projects/[id]/ui  body: { ui }
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  const ui = body?.ui;
  if (!ui || typeof ui !== 'object' || Array.isArray(ui)) {
    return failureResponse(
      {
        code: 'interface.layout_absent',
        message: 'Cerulea reads the interface layout on this save.',
        fix: 'Send the layout with its pages and elements, then save again.',
        details: {},
      },
      400,
    );
  }
  try {
    await writeDraft(id, DRAFT_KEYS.ui, ui, callOptions(actor));
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return failureReply(cause);
  }
}

export const PATCH = PUT;
