// apps/frontend/src/app/api/projects/[id]/blueprint/document/route.ts
// Reads and saves the typed twelve section Blueprint of one project.
// The Blueprint is the single typed artefact carrying everything a person
// builds. Cerulea APIs holds every version. Saving moves the head version
// forward when the content changes. The production canvas graph keeps its own
// path at /api/projects/[id]/blueprint; this path carries the document every
// step editor reads and writes.
// Without this route no step edit reaches the Blueprint.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readBlueprint, saveBlueprint } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const saveBody = z.object({
  document: z.record(z.string(), z.unknown()),
  note: z.string().max(400).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

/**
 * GET /api/projects/[id]/blueprint/document[?version=N | ?blueprintHash=H]
 * Answers the Cerulea APIs version record with its `document`.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const search = new URL(request.url).searchParams;
  const version = search.get('version');
  try {
    return NextResponse.json(
      await readBlueprint(
        id,
        {
          version: version ? Number(version) : undefined,
          blueprintHash: search.get('blueprintHash') ?? undefined,
        },
        callOptions(actor),
      ),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}

/**
 * PUT /api/projects/[id]/blueprint/document
 * body: { document, note?, expectedVersion? }
 * Answers { blueprint: { version, blueprintHash, ... }, created }.
 * A stale expectedVersion is refused by Cerulea APIs, so two editors never
 * overwrite each other.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = saveBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'blueprint.document_absent',
        message: 'Cerulea reads the Blueprint document on this save.',
        fix: 'Send the document as an object, with the expected version, then save again.',
        details: {},
      },
      400,
    );
  }
  try {
    return NextResponse.json(await saveBlueprint(id, parsed.data, callOptions(actor)));
  } catch (cause) {
    return failureReply(cause);
  }
}
