// apps/frontend/src/app/api/projects/[id]/interface/route.ts
// The Interface sub-step of Deploy & UI: the generated application of one project
// and the Views section a person edits over it.
// GET reads the Blueprint on the server, asks the frontend engine inside Cerulea
// APIs for the screens, the component set and the roles, and reads the endpoints
// out of the Deployment Manifest. When the Blueprint holds a section a person
// saved, that section opens and the engine checks it against the model.
// PUT writes the edited section into the Blueprint as a new version, after the
// engine checked it. DELETE removes the saved section, so the engine generates
// the screens from the model again.
// The access token stays on the server. The browser receives the answer alone.
// Without this route the builder would hold the token in the browser and its
// edits would reach nothing.
import { NextResponse } from 'next/server';

import {
  readInterfaceWorkspace,
  resetInterfaceSection,
  saveInterfaceSection,
} from '@/lib/interface/server';
import type { InterfaceSection } from '@/lib/interface/types';
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

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const asked = new URL(request.url).searchParams.get('version');
  const held = asked === null ? Number.NaN : Number(asked);
  const version = Number.isInteger(held) && held > 0 ? held : undefined;
  return withActor(async (actor) =>
    readInterfaceWorkspace(params.id, { version }, callOptions(actor)),
  );
}

/** Reports whether a body carries a Views section with its screens. */
function sectionOf(body: unknown): InterfaceSection | null {
  if (body === null || typeof body !== 'object') return null;
  const held = (body as { section?: unknown }).section;
  if (held === null || typeof held !== 'object') return null;
  return Array.isArray((held as { screens?: unknown }).screens) ? (held as InterfaceSection) : null;
}

// PUT /api/projects/[id]/interface  body: { section, expectedVersion? }
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const section = sectionOf(body);
  if (section === null) {
    return failureResponse(
      {
        code: 'interface.section_absent',
        message: 'Cerulea reads the Views section with its screens on this save.',
        fix: 'Send the section the builder holds, then save again.',
        details: {},
      },
      400,
    );
  }
  const expected = body?.expectedVersion;
  try {
    return NextResponse.json(
      await saveInterfaceSection(
        params.id,
        {
          section,
          expectedVersion: typeof expected === 'number' && Number.isInteger(expected) ? expected : undefined,
        },
        callOptions(actor),
      ),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}

// DELETE /api/projects/[id]/interface  returns the screens to what the engine generates
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return withActor(async (actor) => resetInterfaceSection(params.id, callOptions(actor)));
}
