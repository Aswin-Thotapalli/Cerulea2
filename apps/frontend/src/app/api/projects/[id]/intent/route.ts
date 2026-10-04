// apps/frontend/src/app/api/projects/[id]/intent/route.ts
// The Describe it door of the Foundation step.
//
// A person writes what the system should do. Two readers answer. The
// catalogue matcher answers at once from the words. Cerulea Intelligence
// answers from inside a thread of the project, reading the catalogue in its
// knowledge index, and names the template and the parts with a reason each.
// When Cerulea Intelligence names nothing the catalogue holds, or cannot
// answer in time, the catalogue proposal stands and the reply says so.
// The sentence, the thread and the answer are kept in the build state, so the
// project remembers how it started.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  CeruleaApiError,
  readProject,
  readWorkspace,
  sendIntelligenceMessage,
  startIntelligenceThread,
} from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired } from '@/lib/cerulea-server';
import { servedCatalogue } from '@/lib/catalogue/served';
import { proposeFromDescription, type IntentProposal } from '@/lib/intent';
import { DESCRIBE_SCREEN, describeQuestion, readIntelligenceReply, type ApplicationHint } from '@/lib/intent/intelligence';
import { FOUNDATION_DRAFT_KEYS } from '@/lib/studio/foundation-record';
import { divisionForApplication } from '@/config/divisions';
import { changeBuildState, objectBody, readHeldBuildState } from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The longest Studio waits for Cerulea Intelligence before the catalogue stands in. */
const INTELLIGENCE_WAIT_MILLISECONDS = 170_000;

const body = z.object({
  description: z.string().trim().min(3).max(4000),
  source: z.enum(['catalogue', 'intelligence']).default('catalogue'),
});

/** The proposal as the Foundation step reads it, with plain fields alone. */
function shaped(proposal: IntentProposal) {
  return {
    description: proposal.description,
    terms: proposal.terms,
    empty: proposal.empty,
    track: proposal.track,
    templates: proposal.templates.map((entry) => ({
      id: entry.template.id,
      title: entry.template.title,
      description: entry.template.description ?? '',
      projectType: entry.template.projectType,
      moduleIds: Array.from(new Set(entry.template.modules ?? entry.template.preinstalledModules ?? [])),
      reason: entry.reason,
      score: entry.score,
    })),
    outcomes: proposal.outcomes.map((entry) => ({
      outcomeId: entry.outcome.outcomeId,
      moduleId: entry.outcome.anchorModuleId,
      statement: entry.outcome.statement,
      group: entry.outcome.group,
      projectType: entry.outcome.projectType,
      contribution: entry.outcome.contribution,
      removalConsequence: entry.outcome.removalConsequence,
      reason: entry.reason,
      score: entry.score,
    })),
  };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = body.safeParse(await objectBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'intent.description_short',
        message: 'Cerulea reads a sentence of at least three characters on this request.',
        fix: 'Write what the system should do, then send it again.',
        details: {},
      },
      400,
    );
  }
  const { description, source } = parsed.data;
  try {
    const options = callOptions(actor);
    const [{ project }, held] = await Promise.all([readProject(id, options), readHeldBuildState(id, options)]);
    const { workspace } = await readWorkspace(project.workspaceId, options);
    const division = divisionForApplication(workspace.application);
    const catalogue = servedCatalogue({ projectType: held.buildState.foundation.track, division });
    const fromCatalogue = proposeFromDescription(description, catalogue);

    if (source === 'catalogue') {
      await changeBuildState(
        id,
        options,
        (state, drafts) => {
          if (state.foundation.summary.length === 0) state.foundation.summary = description.slice(0, 800);
          const earlier = drafts[FOUNDATION_DRAFT_KEYS.intent];
          const kept = earlier && typeof earlier === 'object' ? (earlier as Record<string, unknown>) : {};
          drafts[FOUNDATION_DRAFT_KEYS.intent] = {
            ...kept,
            description,
            catalogue: {
              templateId: fromCatalogue.templates[0]?.template.id ?? null,
              outcomeIds: fromCatalogue.outcomes.map((entry) => entry.outcome.outcomeId),
              track: fromCatalogue.track.track,
              askedAt: new Date().toISOString(),
            },
          };
        },
        [FOUNDATION_DRAFT_KEYS.intent],
      );
      return NextResponse.json({
        ok: true,
        answeredBy: 'catalogue',
        note: fromCatalogue.empty
          ? 'The words reach nothing in the catalogue yet. Add the subject of the work, the people involved and the records we keep.'
          : 'The catalogue words answered. Cerulea Intelligence reads the sentence next.',
        applicationHint: null as ApplicationHint | null,
        proposal: shaped(fromCatalogue),
      });
    }

    // Cerulea Intelligence reads the sentence inside a thread of this project.
    const earlier = held.drafts[FOUNDATION_DRAFT_KEYS.intent];
    const earlierThread =
      earlier && typeof earlier === 'object' && typeof (earlier as { threadId?: unknown }).threadId === 'string'
        ? ((earlier as { threadId: string }).threadId)
        : null;
    let threadId = earlierThread;
    let reply = '';
    let answeredBy: 'intelligence' | 'catalogue' = 'intelligence';
    let note = '';
    let applicationHint: ApplicationHint | null = null;
    let proposal: IntentProposal = fromCatalogue;
    let answerSource = '';
    try {
      if (!threadId) threadId = (await startIntelligenceThread(id, options)).threadId;
      const answer = await sendIntelligenceMessage(
        threadId,
        {
          text: describeQuestion(description),
          interfaceState: {
            screen: DESCRIBE_SCREEN,
            selection: [],
            validationErrors: [],
            recentActions: ['describe'],
          },
        },
        { ...options, signal: AbortSignal.timeout(INTELLIGENCE_WAIT_MILLISECONDS) },
      );
      const answered = answer as typeof answer & { reply?: string; answeredBy?: string };
      reply = typeof answered.reply === 'string' ? answered.reply : '';
      answerSource = typeof answered.answeredBy === 'string' ? answered.answeredBy : '';
      const reading = readIntelligenceReply(description, reply, catalogue);
      applicationHint = reading.applicationHint;
      if (reading.proposal.empty) {
        answeredBy = 'catalogue';
        note =
          reply.length > 0
            ? 'Cerulea Intelligence answered without naming a template or a part from the catalogue, so the proposal comes from the catalogue words.'
            : 'Cerulea Intelligence gave no answer, so the proposal comes from the catalogue words.';
      } else {
        proposal = reading.proposal;
        note =
          reading.unmatched.length > 0
            ? `Cerulea Intelligence named ${reading.unmatched.length} identifiers the catalogue does not hold. They were left out.`
            : 'Cerulea Intelligence read the sentence and named these.';
      }
    } catch (cause) {
      answeredBy = 'catalogue';
      const reason =
        cause instanceof CeruleaApiError
          ? cause.message
          : cause instanceof Error && cause.name === 'TimeoutError'
            ? `Cerulea Intelligence gave no answer within ${Math.round(INTELLIGENCE_WAIT_MILLISECONDS / 1000)} seconds.`
            : cause instanceof Error
              ? cause.message
              : String(cause);
      note = `${reason} The proposal comes from the catalogue words.`;
    }

    const chosen = proposal;
    await changeBuildState(
      id,
      options,
      (state, drafts) => {
        if (state.foundation.summary.length === 0) state.foundation.summary = description.slice(0, 800);
        const held = drafts[FOUNDATION_DRAFT_KEYS.intent];
        const kept = held && typeof held === 'object' ? (held as Record<string, unknown>) : {};
        drafts[FOUNDATION_DRAFT_KEYS.intent] = {
          ...kept,
          description,
          threadId,
          intelligence: {
            answeredBy,
            answerSource,
            reply: reply.slice(0, 8000),
            note,
            templateId: chosen.templates[0]?.template.id ?? null,
            outcomeIds: chosen.outcomes.map((entry) => entry.outcome.outcomeId),
            track: chosen.track.track,
            applicationHint,
            askedAt: new Date().toISOString(),
          },
        };
      },
      [FOUNDATION_DRAFT_KEYS.intent],
    );

    return NextResponse.json({
      ok: true,
      answeredBy,
      note,
      threadId,
      reply,
      answerSource,
      applicationHint,
      proposal: shaped(chosen),
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
