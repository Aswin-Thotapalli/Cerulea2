// apps/frontend/src/app/api/projects/[id]/foundation/route.ts
// The Foundation answers of one project.
//
// Every Foundation answer lands in three places. The project record holds the
// name and the summary. The Studio build state holds the track, the template,
// the network properties and, in its draft area, the production details
// (visibility, the legacy mode, the network with its reason). The typed
// Blueprint holds the name, the summary, the template's record types and
// collections, and the Governance section.
// Without this route a Foundation answer lives in one browser alone.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readBlueprint, readProject, readWorkspace, saveBlueprint, updateProject } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired } from '@/lib/cerulea-server';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { applyFoundation, type FoundationAnswers } from '@/lib/blueprint/foundation';
import { BLOCK_SECONDS, HISTORY_RETENTION_DAYS, withinBound } from '@/lib/studio/foundation-controls';
import { templateModuleIds } from '@/lib/catalogue/served';
import {
  FOUNDATION_DRAFT_KEYS,
  openingLevel,
  readComposedIds,
  readFoundationDetails,
} from '@/lib/studio/foundation-record';
import { applicationForDivision, divisionForApplication, lockedProjectType } from '@/config/divisions';
import {
  changeBuildState,
  objectBody,
  projectRecord,
  readHeldBuildState,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const answers = z.object({
  name: z.string().trim().min(3).max(160).optional(),
  description: z.string().max(800).optional(),
  templateId: z.string().max(120).optional(),
  /** The outcomes the Describe it door chose. They seed the Blueprint step. */
  outcomeIds: z.array(z.string().max(160)).max(64).optional(),
  network: z.enum(['public-access', 'private']).optional(),
  networkReason: z.string().max(400).optional(),
  networkOverridden: z.boolean().optional(),
  dappVisibility: z.enum(['public', 'private']).nullable().optional(),
  legacyMode: z.enum(['none', 'connect', 'port']).optional(),
  publishSelectedRecords: z.boolean().optional(),
  blockSeconds: z.number().optional(),
  historyRetentionDays: z.number().optional(),
  /** True when the person pressed Initialize, so the step counts as done. */
  done: z.boolean().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const options = callOptions(actor);
    const [{ project }, held, head] = await Promise.all([
      readProject(id, options),
      readHeldBuildState(id, options),
      readBlueprint(id, {}, options),
    ]);
    const { workspace } = await readWorkspace(project.workspaceId, options);
    return NextResponse.json({
      ok: true,
      project: projectRecord(project, workspace.application, held),
      foundation: held.buildState.foundation,
      details: readFoundationDetails(held.drafts[FOUNDATION_DRAFT_KEYS.details]),
      intent: held.drafts[FOUNDATION_DRAFT_KEYS.intent] ?? null,
      steps: held.buildState.steps,
      blueprintVersion: head.version,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}

// PUT /api/projects/[id]/foundation  body: the answers above, any subset.
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = answers.safeParse(await objectBody(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return failureResponse(
      {
        code: 'foundation.answer_faulty',
        message: `Cerulea could not read the Foundation answer ${first?.path.join('.') || ''}. ${first?.message ?? ''}`.trim(),
        fix: 'Correct the named answer, then save again.',
        details: { issues: parsed.error.issues },
      },
      400,
    );
  }
  const body = parsed.data;
  try {
    const options = callOptions(actor);
    const { project } = await readProject(id, options);
    const { workspace } = await readWorkspace(project.workspaceId, options);
    const division = divisionForApplication(workspace.application);

    // 1. The project record: the name and the summary.
    const nameChanged = body.name !== undefined && body.name !== project.name;
    const summaryChanged = body.description !== undefined && body.description !== project.summary;
    const named = nameChanged || summaryChanged
      ? (
          await updateProject(
            id,
            {
              ...(nameChanged ? { name: body.name } : {}),
              ...(summaryChanged ? { summary: body.description } : {}),
            },
            options,
          )
        ).project
      : project;

    // 2. The build state: the typed Foundation fields and the production details.
    let becameDone = false;
    const held = await changeBuildState(
      id,
      options,
      (state, drafts) => {
        const foundation = state.foundation;
        if (body.name !== undefined) foundation.projectName = body.name;
        if (body.description !== undefined) foundation.summary = body.description;
        if (division) foundation.application = applicationForDivision(division);
        const locked = division ? lockedProjectType(division) : null;
        if (locked) foundation.track = locked;
        if (body.templateId !== undefined) {
          const templateId = body.templateId === 'scratch' ? '' : body.templateId;
          foundation.templateId = templateId;
          // A project nobody composed yet starts from the template's parts.
          if (state.compose.outcomeIds.length === 0 && state.compose.moduleIds.length === 0) {
            state.compose.moduleIds = templateModuleIds(templateId);
          }
        }
        if (body.outcomeIds !== undefined && state.compose.outcomeIds.length === 0) {
          state.compose.outcomeIds = body.outcomeIds;
        }
        if (body.publishSelectedRecords !== undefined) foundation.publishSelectedRecords = body.publishSelectedRecords;
        if (body.blockSeconds !== undefined) foundation.blockSeconds = withinBound(body.blockSeconds, BLOCK_SECONDS.bound);
        if (body.historyRetentionDays !== undefined) {
          foundation.historyRetentionDays = withinBound(body.historyRetentionDays, HISTORY_RETENTION_DAYS.bound);
        }
        if (body.network !== undefined) foundation.trackOverridden = body.networkOverridden === true;

        const details = readFoundationDetails(drafts[FOUNDATION_DRAFT_KEYS.details]);
        if (body.dappVisibility !== undefined) details.dappVisibility = body.dappVisibility;
        if (body.legacyMode !== undefined) details.legacyMode = body.legacyMode;
        if (body.network !== undefined) {
          details.network = {
            kind: body.network,
            reason: body.networkReason ?? details.network.reason,
            overridden: body.networkOverridden ?? details.network.overridden,
          };
        }
        drafts[FOUNDATION_DRAFT_KEYS.details] = details;

        if (body.done === true) {
          if (state.steps.foundation === false) {
            becameDone = true;
            state.disclosureLevel = openingLevel(workspace.application, foundation.templateId);
          }
          state.steps.foundation = true;
        }
      },
      [FOUNDATION_DRAFT_KEYS.details],
    );

    // 3. The typed Blueprint: name, summary, the template's sections and governance.
    const foundation = held.buildState.foundation;
    const details = readFoundationDetails(held.drafts[FOUNDATION_DRAFT_KEYS.details]);
    const head = await readBlueprint(id, {}, options);
    const document = readBlueprintDocument(head.document, named.name);
    const previouslyComposed = readComposedIds(held.drafts[FOUNDATION_DRAFT_KEYS.composed]);
    const foundationAnswers: FoundationAnswers = {
      name: named.name,
      summary: named.summary,
      templateModuleIds: templateModuleIds(foundation.templateId),
      network: foundation.track === 'blockchain' ? 'private' : details.network.kind,
      publishSelectedRecords: foundation.publishSelectedRecords,
      blockSeconds: foundation.blockSeconds,
      historyRetentionDays: foundation.historyRetentionDays,
    };
    const applied = applyFoundation(document, foundationAnswers, previouslyComposed);
    const saved = await saveBlueprint(
      id,
      {
        document: applied.blueprint,
        note: 'Foundation answers: name, summary, template sections and governance',
        expectedVersion: head.version,
      },
      options,
    );
    const composedNow = applied.composedCollectionIds;
    if (JSON.stringify(composedNow) !== JSON.stringify(previouslyComposed)) {
      await changeBuildState(
        id,
        options,
        (_state, drafts) => {
          drafts[FOUNDATION_DRAFT_KEYS.composed] = composedNow;
        },
        [FOUNDATION_DRAFT_KEYS.composed],
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      slug: named.slug,
      foundation,
      details,
      steps: held.buildState.steps,
      disclosureLevel: held.buildState.disclosureLevel,
      becameDone,
      blueprintVersion: saved.blueprint.version,
      composedCollectionIds: composedNow,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
