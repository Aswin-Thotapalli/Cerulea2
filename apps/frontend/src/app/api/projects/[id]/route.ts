// apps/frontend/src/app/api/projects/[id]/route.ts
// Reads, changes and closes one project through Cerulea APIs.
// The record joins the Cerulea project, the division of its workspace and the
// build state. The economics, integrations and interface drafts come from the
// draft area of the build state.
// Closing is the delete. Cerulea keeps every Blueprint version, so the work
// stays readable afterwards.
// Without this route a project cannot be opened, renamed or removed.
import { NextResponse } from 'next/server';

import { readProject, readWorkspace, updateProject } from '@/lib/cerulea-api';
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
  objectBody,
  projectRecord,
  readHeldBuildState,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Merges the incoming economics into the held one, one level deep. */
function mergeEconomics(held: unknown, incoming: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = isPlainObject(held) ? { ...held } : {};
  for (const [key, value] of Object.entries(incoming)) {
    const current = merged[key];
    merged[key] =
      isPlainObject(value) && isPlainObject(current) ? { ...current, ...value } : value;
  }
  return merged;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const options = callOptions(actor);
    const [{ project }, held] = await Promise.all([
      readProject(id, options),
      readHeldBuildState(id, options),
    ]);
    const { workspace } = await readWorkspace(project.workspaceId, options);
    const record = projectRecord(project, workspace.application, held);
    const ui = held.drafts[DRAFT_KEYS.ui] ?? null;
    return NextResponse.json({
      ok: true,
      project: {
        ...record,
        economics: held.drafts[DRAFT_KEYS.economics] ?? null,
        integrations: held.drafts[DRAFT_KEYS.integrations] ?? null,
      },
      // The interface step reads the type and its saved layout at the top level.
      projectType: record.projectType,
      ui,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}

// PATCH /api/projects/[id]  body: { economics?, name?, description? }
// The economics merges one level deep into the held draft, so seeded
// Blockchain values survive edits on the economics step.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  const economics = isPlainObject(body?.economics) ? body.economics : null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description : null;
  if (!economics && !name && description === null) {
    return failureResponse(
      {
        code: 'project.change_absent',
        message: 'Cerulea reads economics, a name or a description on this change.',
        fix: 'Send at least one of the three values, then save again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    if (name || description !== null) {
      await updateProject(
        id,
        {
          ...(name ? { name } : {}),
          ...(description !== null ? { summary: description.slice(0, 800) } : {}),
        },
        options,
      );
    }
    if (economics) {
      await changeBuildState(
        id,
        options,
        (_state, drafts) => {
          drafts[DRAFT_KEYS.economics] = mergeEconomics(drafts[DRAFT_KEYS.economics], economics);
        },
        [DRAFT_KEYS.economics],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const { project } = await updateProject(id, { state: 'closed' }, callOptions(actor));
    return NextResponse.json({ ok: true, id: project.projectId, state: project.state });
  } catch (cause) {
    return failureReply(cause);
  }
}
