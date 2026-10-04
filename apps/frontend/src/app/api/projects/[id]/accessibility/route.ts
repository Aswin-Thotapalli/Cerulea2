// apps/frontend/src/app/api/projects/[id]/accessibility/route.ts
// The accessibility report of the application, and the publication gate.
// The frontend engine inside Cerulea APIs checks the screens against the Web
// Content Accessibility Guidelines version 2.2 level AA. A failure blocks
// publication, and every finding names the fix in plain words.
// GET checks the screens the Blueprint holds: the Views section a person saved,
// or the screens the engine generates from the model. POST checks the section
// the builder holds before the save lands.
// Without this route Studio could not hold publication on a failure.
import { NextResponse } from 'next/server';

import { type CeruleaApiOptions, ceruleaRequest, readBlueprint } from '@/lib/cerulea-api';
import { storedSection } from '@/lib/interface/server';
import type { AccessibilityOutcome } from '@/lib/interface/types';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type InterfaceReply = { section: unknown };

/** Asks the engine to check one section and read the gate. */
async function checkSection(
  document: unknown,
  section: unknown,
  options: CeruleaApiOptions,
): Promise<AccessibilityOutcome> {
  return ceruleaRequest<AccessibilityOutcome>(
    '/engine/accessibility',
    { method: 'POST', body: JSON.stringify({ document, section }) },
    options,
  );
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const asked = new URL(request.url).searchParams.get('version');
  const version = asked && Number.isInteger(Number(asked)) ? Number(asked) : undefined;
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const held = await readBlueprint(params.id, { version }, options);
    const stored = storedSection(held.document);
    const section =
      stored ??
      (
        await ceruleaRequest<InterfaceReply>(
          '/engine/interface',
          { method: 'POST', body: JSON.stringify({ document: held.document }) },
          options,
        )
      ).section;
    const report = await checkSection(held.document, section, options);
    return { version: held.version, authored: stored !== null, ...report };
  });
}

// POST /api/projects/[id]/accessibility  body: { section }
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = (await request.json().catch(() => null)) as { section?: unknown } | null;
  const section = body?.section;
  if (section === null || section === undefined || typeof section !== 'object') {
    return failureResponse(
      {
        code: 'interface.section_absent',
        message: 'Cerulea reads the Views section with its screens on this check.',
        fix: 'Send the section the builder holds, then run the check again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const held = await readBlueprint(params.id, {}, options);
    const report = await checkSection(held.document, section, options);
    return NextResponse.json({ version: held.version, authored: true, ...report });
  } catch (cause) {
    return failureReply(cause);
  }
}
