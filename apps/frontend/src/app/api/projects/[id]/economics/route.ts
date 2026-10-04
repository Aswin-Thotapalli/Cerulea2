// apps/frontend/src/app/api/projects/[id]/economics/route.ts
// The economics document of one project and the policy answers beside it.
// The Economics step keeps its document in the drafts area of the Studio
// build state under `step3::economics`, and writes the five answers and the
// chosen profile into the `policies` field the readiness checklist and the
// Deployment Manifest read. Both land in one change of the build state, so a
// save never overwrites a draft another step wrote a moment earlier.
// Without this route the step would write the whole build state from the
// browser and clobber the other steps.
import { NextResponse } from 'next/server';
import { z } from 'zod';

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
  readHeldBuildState,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The key the production import writes the economics of an imported project under. */
const IMPORTED_KEY = 'economics::document';

const policiesBody = z.object({
  answers: z
    .object({
      confirmationPreference: z.enum(['instant', 'balanced', 'certain']).optional(),
      organisationCount: z.number().int().min(1).max(1000).optional(),
      wrongRecordCost: z.enum(['low', 'moderate', 'high', 'severe']).optional(),
      serveDuringSplit: z.boolean().optional(),
      provableYears: z.number().int().min(1).max(100).optional(),
    })
    .default({}),
  chosenProfileId: z.string().max(120).default(''),
});

const saveBody = z.object({
  economics: z.record(z.string(), z.unknown()),
  policies: policiesBody.optional(),
});

function heldEconomics(drafts: Record<string, unknown>): unknown {
  return drafts[DRAFT_KEYS.economics] ?? drafts[IMPORTED_KEY] ?? null;
}

/** GET /api/projects/[id]/economics answers the held document and the policy answers. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const held = await readHeldBuildState(id, callOptions(actor));
    return NextResponse.json({
      ok: true,
      economics: heldEconomics(held.drafts),
      policies: held.buildState.policies,
      foundation: held.buildState.foundation,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}

/**
 * PUT /api/projects/[id]/economics  body: { economics, policies? }
 * Writes the draft and the policy answers in one change of the build state.
 * The policies step is marked done once a profile is chosen.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = saveBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'economics.document_absent',
        message: 'Cerulea reads the economics document on this save.',
        fix: 'Send the document as an object, with the policy answers beside it, then save again.',
        details: {},
      },
      400,
    );
  }
  const { economics, policies } = parsed.data;
  try {
    const held = await changeBuildState(
      id,
      callOptions(actor),
      (state, drafts) => {
        drafts[DRAFT_KEYS.economics] = economics;
        if (policies) {
          state.policies = { answers: policies.answers, chosenProfileId: policies.chosenProfileId };
          state.steps = { ...state.steps, policies: policies.chosenProfileId.length > 0 };
        }
      },
      [DRAFT_KEYS.economics],
    );
    return NextResponse.json({
      ok: true,
      policies: held.buildState.policies,
      steps: held.buildState.steps,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
