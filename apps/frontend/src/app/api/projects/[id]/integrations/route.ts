// apps/frontend/src/app/api/projects/[id]/integrations/route.ts
// The outside service choices the integrations step and the dashboard hold
// for one project.
// The choices live in the draft area of the Studio build state under
// `step4::integrations`, the same key the production draft carried.
// Without this route every integration choice is lost when the project reopens.
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

function configsOf(saved: unknown): Record<string, unknown> {
  if (!saved || typeof saved !== 'object') return {};
  const held = (saved as { configs?: unknown }).configs;
  return held && typeof held === 'object' && !Array.isArray(held)
    ? (held as Record<string, unknown>)
    : {};
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const held = await readHeldBuildState(id, callOptions(actor));
    return NextResponse.json({ ok: true, configs: configsOf(held.drafts[DRAFT_KEYS.integrations]) });
  } catch (cause) {
    return failureReply(cause);
  }
}

// PATCH /api/projects/[id]/integrations  body: { configs }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = (await objectBody(request)) ?? {};
  const configs =
    body.configs && typeof body.configs === 'object' && !Array.isArray(body.configs)
      ? body.configs
      : body;
  try {
    await writeDraft(id, DRAFT_KEYS.integrations, { configs }, callOptions(actor));
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return failureReply(cause);
  }
}
