// apps/frontend/src/app/api/projects/[id]/blueprint/route.ts
// Reads and saves the Blueprint of one project through Cerulea APIs.
// The Blueprint is the single typed artefact carrying everything a person
// builds. Saving moves the head version forward when the content changes.
// Without this route Studio edits nothing that lasts.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readBlueprint, saveBlueprint } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const saveBody = z.object({
  document: z.unknown(),
  note: z.string().max(400).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const search = new URL(request.url).searchParams;
  const version = search.get('version');
  try {
    return NextResponse.json(
      await readBlueprint(
        params.id,
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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = saveBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'blueprint.body_absent',
          message: 'Cerulea reads the Blueprint document on this save.',
          fix: 'Send the document, then save again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await saveBlueprint(params.id, parsed.data, callOptions(actor)));
  } catch (cause) {
    return failureReply(cause);
  }
}
