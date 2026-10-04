// apps/frontend/src/app/api/projects/[id]/integrations/[integrationId]/credentials/route.ts
// The secret credentials of one provider, held by Cerulea APIs key custody.
// The browser sends a secret once and never reads it back. Cerulea APIs seals
// it under its key custody and answers with the field names it holds. Studio
// forwards the call and keeps nothing.
// Cerulea APIs serves the custody route at
// PUT, GET and DELETE /studio/projects/:projectId/integrations/:integrationId/credentials.
// While a running Cerulea APIs predates that route, the answer names the
// restart as the fix, and nothing is held anywhere else.
// Without this route a provider key would sit in the browser or in a draft.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CeruleaApiError, ceruleaRequest } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import { type CustodyAnswer, providerById } from '@/components/studio/steps/step4-catalogue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; integrationId: string }> };

const storeBody = z.object({
  environment: z.enum(['test', 'live']),
  values: z.record(z.string().min(1).max(80), z.string().min(1).max(8000)),
});

function custodyPath(projectId: string, integrationId: string): string {
  return `/studio/projects/${encodeURIComponent(projectId)}/integrations/${encodeURIComponent(integrationId)}/credentials`;
}

function custodyAbsent(cause: unknown): NextResponse | null {
  if (cause instanceof CeruleaApiError && cause.status === 404 && cause.code === 'route.absent') {
    return failureResponse(
      {
        code: 'integrations.custody_absent',
        message:
          'The running Cerulea APIs holds no key custody route for integration credentials yet. Nothing was stored.',
        fix: 'Restart Cerulea APIs at a version carrying PUT /studio/projects/:projectId/integrations/:integrationId/credentials, then store the credentials again.',
        details: {},
      },
      502,
    );
  }
  return null;
}

function unknownProvider(integrationId: string): NextResponse {
  return failureResponse(
    {
      code: 'integrations.provider_unknown',
      message: `The catalogue lists no provider named ${integrationId}.`,
      fix: 'Choose a provider from the Integrations step list.',
      details: { integrationId },
    },
    404,
  );
}

/** GET answers the field names held, never a value. */
export async function GET(_request: Request, context: Params) {
  const { id, integrationId } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  if (!providerById(integrationId)) return unknownProvider(integrationId);
  try {
    const answer = await ceruleaRequest<Omit<CustodyAnswer, 'ok'>>(
      custodyPath(id, integrationId),
      { method: 'GET' },
      callOptions(actor),
    );
    return NextResponse.json({ ok: true, ...answer });
  } catch (cause) {
    return custodyAbsent(cause) ?? failureReply(cause);
  }
}

/** PUT stores the secret values of one environment. Only secret fields of the provider are accepted. */
export async function PUT(request: Request, context: Params) {
  const { id, integrationId } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const provider = providerById(integrationId);
  if (!provider) return unknownProvider(integrationId);
  const parsed = storeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'integrations.credentials_absent',
        message: 'Cerulea reads the environment and at least one secret value on this call.',
        fix: 'Fill in a secret field, then store the credentials again.',
        details: {},
      },
      400,
    );
  }
  const secretKeys = new Set(provider.fields.filter((field) => field.secret).map((field) => field.key));
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data.values)) {
    if (secretKeys.has(key)) values[key] = value;
  }
  if (Object.keys(values).length === 0) {
    return failureResponse(
      {
        code: 'integrations.credentials_absent',
        message: `None of the values sent is a secret field of ${provider.name}.`,
        fix: `Fill in one of ${[...secretKeys].join(', ')}, then store the credentials again.`,
        details: { secretFields: [...secretKeys] },
      },
      400,
    );
  }
  try {
    const answer = await ceruleaRequest<Omit<CustodyAnswer, 'ok'>>(
      custodyPath(id, integrationId),
      {
        method: 'PUT',
        body: JSON.stringify({
          kind: provider.kind,
          environment: parsed.data.environment,
          values,
        }),
      },
      callOptions(actor),
    );
    return NextResponse.json({ ok: true, ...answer });
  } catch (cause) {
    return custodyAbsent(cause) ?? failureReply(cause);
  }
}

/** DELETE removes every held value of the provider. */
export async function DELETE(_request: Request, context: Params) {
  const { id, integrationId } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  if (!providerById(integrationId)) return unknownProvider(integrationId);
  try {
    await ceruleaRequest(custodyPath(id, integrationId), { method: 'DELETE' }, callOptions(actor));
    return NextResponse.json({ ok: true, integrationId, held: [] });
  } catch (cause) {
    return custodyAbsent(cause) ?? failureReply(cause);
  }
}
