// apps/frontend/src/app/api/projects/[id]/logic/route.ts
// The logic of one project: the Rules, Actions, Workflows and Events sections
// of the typed Blueprint, read from and written to Cerulea APIs. The drawings
// the logic canvas was built from and the positions of the workflow states
// live in the draft area of the Studio build state under `step2::logic`,
// since the Blueprint carries meaning and no drawing.
// Without this route every rule, action and workflow is lost when the project
// reopens.
import { NextResponse } from 'next/server';

import { readProject } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import {
  DRAFT_KEYS,
  moduleIdsOf,
  objectBody,
  readHeldBuildState,
  writeDraft,
} from '@/app/api/projects/_shared/project-record';
import {
  LOGIC_SECTIONS,
  noteOf,
  pickSections,
  readHeadBlueprint,
  saveSections,
  wholeNumber,
} from '@/app/api/projects/_shared/blueprint-sections';
import { logicLayoutOf } from '@/app/api/projects/_shared/step2-layout';
import type { LogicLayout } from '@/components/studio/steps/step2-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/projects/[id]/logic
 * Answers { ok, version, blueprintHash, document, track, moduleIds, layout }.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const options = callOptions(actor);
  try {
    const [{ project }, held] = await Promise.all([
      readProject(id, options),
      readHeldBuildState(id, options),
    ]);
    const head = await readHeadBlueprint(id, project.name, options);
    const fromCompose = held.buildState.compose?.moduleIds;
    const graph = held.drafts[DRAFT_KEYS.graph];
    const moduleIds =
      Array.isArray(fromCompose) && fromCompose.length > 0
        ? fromCompose.filter((entry): entry is string => typeof entry === 'string')
        : graph && typeof graph === 'object'
          ? moduleIdsOf(graph as Record<string, unknown>)
          : [];
    return NextResponse.json({
      ok: true,
      version: head.version,
      blueprintHash: head.blueprintHash,
      document: head.document,
      track: held.buildState.foundation.track,
      moduleIds,
      layout: logicLayoutOf(held.drafts[DRAFT_KEYS.logic]),
    });
  } catch (cause) {
    return failureReply(cause);
  }
}

/**
 * PUT /api/projects/[id]/logic
 * body: { sections?: { rules, actions, workflows, events }, expectedVersion?, note?, layout? }
 * Sections merge into the head Blueprint. The layout saves beside it.
 * Answers { ok, version, blueprintHash, document, created, layout }.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  if (!body) {
    return failureResponse(
      {
        code: 'logic.body_absent',
        message: 'Cerulea reads the logic sections on this save.',
        fix: 'Send sections or a layout as an object, then save again.',
        details: {},
      },
      400,
    );
  }
  const options = callOptions(actor);
  try {
    const sections = pickSections(body, LOGIC_SECTIONS);
    const { project } = await readProject(id, options);

    let layout: LogicLayout | undefined;
    if (body.layout !== undefined) {
      layout = logicLayoutOf(body.layout);
      await writeDraft(id, DRAFT_KEYS.logic, layout, options);
    }

    if (Object.keys(sections).length === 0) {
      const head = await readHeadBlueprint(id, project.name, options);
      return NextResponse.json({
        ok: true,
        version: head.version,
        blueprintHash: head.blueprintHash,
        document: head.document,
        created: false,
        layout,
      });
    }

    const saved = await saveSections(
      id,
      project.name,
      {
        sections,
        expectedVersion: wholeNumber(body.expectedVersion),
        note: noteOf(body.note) ?? 'Changed the logic',
      },
      options,
    );
    return NextResponse.json({ ok: true, ...saved, layout });
  } catch (cause) {
    return failureReply(cause);
  }
}

export const PATCH = PUT;
