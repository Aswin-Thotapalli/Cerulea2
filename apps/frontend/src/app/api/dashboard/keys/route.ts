// apps/frontend/src/app/api/dashboard/keys/route.ts
// The Keys & Access screen reads and changes access keys through this route.
// A key lets a program outside Cerulea reach a deployed system through
// Cerulea APIs. A key carries scopes, a request limit and an expiry. Cerulea
// stores a hash of the key and shows the key once.
// Without this route nothing outside Cerulea can reach a deployed system.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ceruleaRequest,
  issueAccessKey,
  listAccessKeys,
  revokeAccessKey,
  rotateAccessKey,
} from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
  withActor,
} from '@/lib/cerulea-server';
import { homeWorkspace, workspacesWithHome } from '@/lib/workspace-home';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const issueBody = z.object({
  name: z.string().min(2).max(120),
  scopes: z.array(z.string().min(1)).min(1),
  requestsPerMinute: z.number().int().min(1).max(60000).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
  workspaceId: z.string().min(1).optional(),
});

/** The scopes Cerulea publishes, each with the sentence a reader sees beside it. */
type ScopePurpose = { scope: string; purpose: string };

/**
 * Lists the keys of one workspace.
 * The reply carries the workspace list, so the screen offers a chooser, and
 * the purpose of every scope, so the Generate dialog explains each choice.
 */
export async function GET(request: Request) {
  const named = new URL(request.url).searchParams.get('workspaceId');
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const workspaces = await workspacesWithHome(actor.displayName, options);
    const workspace = await homeWorkspace(actor.displayName, options, named);
    const [page, published] = await Promise.all([
      listAccessKeys(workspace.workspaceId, options),
      ceruleaRequest<{ scopes: ScopePurpose[] }>('/v1/keys/scopes', { method: 'GET' }, options),
    ]);
    const purposes = new Map(published.scopes.map((entry) => [entry.scope, entry.purpose]));
    return {
      workspace,
      workspaces,
      keys: page.keys,
      scopes: page.scopes,
      scopePurposes: page.scopes.map((scope) => ({
        scope,
        purpose: purposes.get(scope) ?? 'Reaches part of the generated surface.',
      })),
    };
  });
}

/** Issues one key. The answer carries the secret once. */
export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = issueBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'keys.request_incomplete',
        message: 'A key carries a name and at least one scope.',
        fix: 'Type a name, choose the scopes the caller needs, then generate the key again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(actor.displayName, options, parsed.data.workspaceId);
    const outcome = await issueAccessKey(
      workspace.workspaceId,
      {
        name: parsed.data.name,
        scopes: parsed.data.scopes,
        requestsPerMinute: parsed.data.requestsPerMinute,
        expiresInDays: parsed.data.expiresInDays,
      },
      options,
    );
    return NextResponse.json(outcome, { status: 201 });
  } catch (cause) {
    return failureReply(cause);
  }
}

/** Rotates one key. The earlier key closes and the answer carries the new secret once. */
export async function PATCH(request: Request) {
  const search = new URL(request.url).searchParams;
  const keyId = search.get('keyId');
  if (!keyId) {
    return failureResponse(
      {
        code: 'keys.key_unnamed',
        message: 'Cerulea reads the key to rotate on this request.',
        fix: 'Choose a key from the list, then rotate it again.',
        details: {},
      },
      400,
    );
  }
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(
      actor.displayName,
      options,
      search.get('workspaceId'),
    );
    return rotateAccessKey(workspace.workspaceId, keyId, options);
  });
}

/** Revokes one key. The key stops working at once. */
export async function DELETE(request: Request) {
  const search = new URL(request.url).searchParams;
  const keyId = search.get('keyId');
  if (!keyId) {
    return failureResponse(
      {
        code: 'keys.key_unnamed',
        message: 'Cerulea reads the key to revoke on this request.',
        fix: 'Choose a key from the list, then revoke it again.',
        details: {},
      },
      400,
    );
  }
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(
      actor.displayName,
      options,
      search.get('workspaceId'),
    );
    return revokeAccessKey(workspace.workspaceId, keyId, options);
  });
}
