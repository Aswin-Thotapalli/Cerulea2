// apps/frontend/src/app/api/projects/[id]/blueprint/route.ts
// The module graph the canvas draws for one project.
// The graph lives in the draft area of the Studio build state under
// `blueprint::graph`, positions included. The chosen outcomes, the removals
// and the links a person drew go into the compose part of the build state,
// which the later steps read. The same save writes the typed Blueprint: the
// installed parts install their record types and collections, every chosen
// link writes an event, and every bridge statement writes an endpoint.
// The typed document itself reads and saves at /api/projects/[id]/blueprint/document.
// Without this route the canvas starts empty on every visit.
import { NextResponse } from 'next/server';

import { readBlueprint, readProject, readWorkspace, saveBlueprint } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired } from '@/lib/cerulea-server';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { servedCatalogue } from '@/lib/catalogue/served';
import { buildCanvasModel, prepareCatalogue, readSavedGraph } from '@/lib/map/canvas';
import { applyCanvas } from '@/lib/map/blueprint-writes';
import { FOUNDATION_DRAFT_KEYS, readComposedIds } from '@/lib/studio/foundation-record';
import { divisionForApplication } from '@/config/divisions';
import {
  DRAFT_KEYS,
  changeBuildState,
  moduleIdsOf,
  objectBody,
  readHeldBuildState,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const held = await readHeldBuildState(id, callOptions(actor));
    return NextResponse.json({
      ok: true,
      blueprint: held.drafts[DRAFT_KEYS.graph] ?? null,
      compose: held.buildState.compose,
      foundation: held.buildState.foundation,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}

// PATCH /api/projects/[id]/blueprint
// body: { modules, graph: { nodes, edges }, selection?: { outcomeIds, removedModuleIds, chosenLinks }, settings? }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  if (!body) {
    return failureResponse(
      {
        code: 'canvas.graph_absent',
        message: 'Cerulea reads the module list and the canvas graph on this save.',
        fix: 'Send the modules and the graph with its nodes and edges, then save again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const moduleIds = moduleIdsOf(body);
    const loaded = readSavedGraph(body);
    const held = await changeBuildState(
      id,
      options,
      (state, drafts) => {
        drafts[DRAFT_KEYS.graph] = body;
        state.compose.moduleIds = moduleIds;
        if (loaded.selection) {
          state.compose.outcomeIds = loaded.selection.outcomeIds;
          state.compose.removedModuleIds = loaded.selection.removedModuleIds;
          state.compose.chosenLinks = loaded.selection.chosenLinks;
          state.steps.compose = moduleIds.length > 0;
        }
      },
      [DRAFT_KEYS.graph],
    );

    // A graph saved by the production canvas alone carries no selection, so
    // the typed Blueprint stays as the other levels left it.
    if (!loaded.selection) return NextResponse.json({ ok: true, moduleIds });

    const { project } = await readProject(id, options);
    const { workspace } = await readWorkspace(project.workspaceId, options);
    const division = divisionForApplication(workspace.application);
    const prepared = prepareCatalogue(
      servedCatalogue({ projectType: held.buildState.foundation.track, division }),
    );
    const model = buildCanvasModel(loaded.selection, prepared);
    const head = await readBlueprint(id, {}, options);
    const document = readBlueprintDocument(head.document, project.name);
    const previouslyComposed = readComposedIds(held.drafts[FOUNDATION_DRAFT_KEYS.composed]);
    const written = applyCanvas(document, model, loaded.selection, previouslyComposed, {
      retentionDays: held.buildState.foundation.historyRetentionDays,
      titleById: prepared.titleById,
    });
    const saved = await saveBlueprint(
      id,
      {
        document: written.blueprint,
        note: `Canvas: ${model.installed.length} parts from ${loaded.selection.outcomeIds.length} outcomes`,
        expectedVersion: head.version,
      },
      options,
    );
    if (JSON.stringify(written.composedCollectionIds) !== JSON.stringify(previouslyComposed)) {
      await changeBuildState(
        id,
        options,
        (_state, drafts) => {
          drafts[FOUNDATION_DRAFT_KEYS.composed] = written.composedCollectionIds;
        },
        [FOUNDATION_DRAFT_KEYS.composed],
      );
    }
    return NextResponse.json({
      ok: true,
      moduleIds,
      installed: model.installed,
      blueprintVersion: saved.blueprint.version,
      collections: written.blueprint.collections.length,
      events: written.blueprint.events.length,
      bridges: written.blueprint.integrations.bridges.length,
      linksWithoutEvent: written.linksWithoutEvent,
      bridgesWithoutEndpoint: written.bridgesWithoutEndpoint,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
