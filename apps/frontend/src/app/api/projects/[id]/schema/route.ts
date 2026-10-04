// apps/frontend/src/app/api/projects/[id]/schema/route.ts
// The data schema of one project: the Types, Collections, Identities and
// Permissions sections of the typed Blueprint, read from and written to
// Cerulea APIs. The layout of the step (which module each collection sits
// under, where each collection stands on the relationship canvas) lives in
// the draft area of the Studio build state under `step2::schema`, since the
// Blueprint carries meaning and no drawing.
// A project whose Blueprint holds no collection yet is seeded once, from the
// presets of the modules the Blueprint step chose or from the entities an
// imported project saved in the earlier Studio.
// Without this route the Data schema step starts empty on every visit.
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
  SCHEMA_SECTIONS,
  noteOf,
  pickSections,
  readHeadBlueprint,
  saveSections,
  wholeNumber,
} from '@/app/api/projects/_shared/blueprint-sections';
import {
  earlierEntitiesOf,
  seedFromEarlierEntities,
  seedFromModules,
} from '@/app/api/projects/_shared/schema-seed';
import { schemaLayoutOf } from '@/app/api/projects/_shared/step2-layout';
import type { SchemaLayout } from '@/components/studio/steps/step2-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The draft key the earlier Studio's import wrote its entities under. */
const EARLIER_SCHEMA_KEY = 'schema::document';

/**
 * GET /api/projects/[id]/schema
 * Answers { ok, version, blueprintHash, document, track, moduleIds, layout, seeded }.
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
    const foundation = held.buildState.foundation;
    const moduleIds = moduleIdsFromState(held.buildState.compose?.moduleIds, held.drafts);
    const layout = schemaLayoutOf(held.drafts[DRAFT_KEYS.schema]);

    let document = head.document;
    let version = head.version;
    let blueprintHash = head.blueprintHash;
    let seeded = false;

    if (document.collections.length === 0) {
      const retentionDays = foundation.historyRetentionDays > 0 ? foundation.historyRetentionDays : 3650;
      const earlier = earlierEntitiesOf(held.drafts[EARLIER_SCHEMA_KEY]);
      let next = document;
      if (earlier.length > 0) {
        const outcome = seedFromEarlierEntities(document, earlier, retentionDays);
        next = outcome.blueprint;
        Object.assign(layout.placement, outcome.placement);
      } else {
        next = seedFromModules(document, moduleIds, retentionDays);
      }
      if (next.collections.length > 0) {
        const saved = await saveSections(
          id,
          project.name,
          {
            sections: { types: next.types, collections: next.collections },
            expectedVersion: head.version,
            note:
              earlier.length > 0
                ? 'Seeded the data schema from the entities saved in the earlier Studio'
                : 'Seeded the data schema from the module presets',
          },
          options,
        );
        document = saved.document;
        version = saved.version;
        blueprintHash = saved.blueprintHash;
        seeded = true;
        if (earlier.length > 0) await writeDraft(id, DRAFT_KEYS.schema, layout, options);
      }
    }

    return NextResponse.json({
      ok: true,
      version,
      blueprintHash,
      document,
      track: foundation.track,
      moduleIds,
      layout,
      seeded,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}

function moduleIdsFromState(fromCompose: unknown, drafts: Record<string, unknown>): string[] {
  const held = Array.isArray(fromCompose)
    ? fromCompose.filter((entry): entry is string => typeof entry === 'string')
    : [];
  if (held.length > 0) return held;
  const graph = drafts[DRAFT_KEYS.graph];
  return graph && typeof graph === 'object' ? moduleIdsOf(graph as Record<string, unknown>) : [];
}

/**
 * PUT /api/projects/[id]/schema
 * body: { sections?: { types, collections, identities, permissions },
 *         document?, expectedVersion?, note?, layout? }
 * Sections merge into the head Blueprint. A whole document replaces it, which
 * is what the Blueprint level sends. The layout saves beside it.
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
        code: 'schema.body_absent',
        message: 'Cerulea reads the schema sections or the whole document on this save.',
        fix: 'Send sections, a document or a layout as an object, then save again.',
        details: {},
      },
      400,
    );
  }
  const options = callOptions(actor);
  try {
    const sections = pickSections(body, SCHEMA_SECTIONS);
    const hasDocument = body.document !== undefined && body.document !== null;
    const { project } = await readProject(id, options);

    let layout: SchemaLayout | undefined;
    if (body.layout !== undefined) {
      layout = schemaLayoutOf(body.layout);
      await writeDraft(id, DRAFT_KEYS.schema, layout, options);
    }

    if (Object.keys(sections).length === 0 && hasDocument === false) {
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
        sections: hasDocument ? undefined : sections,
        document: hasDocument ? body.document : undefined,
        expectedVersion: wholeNumber(body.expectedVersion),
        note: noteOf(body.note) ?? 'Changed the data schema',
      },
      options,
    );
    return NextResponse.json({ ok: true, ...saved, layout });
  } catch (cause) {
    return failureReply(cause);
  }
}

export const PATCH = PUT;
