// apps/frontend/src/app/api/projects/[id]/integrations/route.ts
// The outside service choices one project holds.
// The Integrations step keeps its document in the drafts area of the Studio
// build state under `step4::integrations`, the key the production draft
// carried. The document names each provider's kind, whether it is enabled,
// its environment, its plain settings, the secret field names Cerulea APIs
// key custody holds and the Blueprint choices. A secret value never lands
// here. The Dashboard integrations screen reads the same document.
// Without this route every integration choice is lost when the project reopens.
import { NextResponse } from 'next/server';

import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import {
  DRAFT_KEYS,
  objectBody,
  readHeldBuildState,
  writeDraft,
} from '@/app/api/projects/_shared/project-record';
import {
  type IntegrationsDocument,
  readIntegrationsDocument,
  withoutSecrets,
} from '@/components/studio/steps/step4-catalogue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function answerFor(document: IntegrationsDocument) {
  return {
    ok: true,
    document,
    configs: document.configs,
    enabled: Object.entries(document.configs)
      .filter(([, config]) => config.enabled)
      .map(([id]) => id),
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const held = await readHeldBuildState(id, callOptions(actor));
    return NextResponse.json(answerFor(readIntegrationsDocument(held.drafts[DRAFT_KEYS.integrations])));
  } catch (cause) {
    return failureReply(cause);
  }
}

/**
 * PATCH /api/projects/[id]/integrations
 * body: { document } (version 2) or { configs } (the production and Dashboard shape).
 * Every secret value is dropped before the document is held.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  const source = body?.document ?? (body?.configs !== undefined ? { configs: body.configs } : null);
  if (!source || typeof source !== 'object') {
    return failureResponse(
      {
        code: 'integrations.document_absent',
        message: 'Cerulea reads the integrations document on this save.',
        fix: 'Send the document as an object, then save again.',
        details: {},
      },
      400,
    );
  }
  const document = withoutSecrets(readIntegrationsDocument(source));
  try {
    await writeDraft(id, DRAFT_KEYS.integrations, document, callOptions(actor));
    return NextResponse.json(answerFor(document));
  } catch (cause) {
    return failureReply(cause);
  }
}
