// apps/frontend/src/app/api/mcp/keys/route.ts
// The Keys screen lists and issues access keys here.
// Cerulea APIs keeps every key against a workspace. It stores a hash of the key
// and shows the key itself once, at issue. This route lists the open keys of
// every workspace the account may manage, and issues a new key in the
// workspace the request works inside.
// Without this route nothing outside Cerulea can reach a deployed system.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  type AccessKey,
  type CeruleaWorkspace,
  CeruleaApiError,
  issueAccessKey,
  listAccessKeys,
  listWorkspaces,
} from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  requestDivision,
  signInRequired,
  withActor,
} from '@/lib/cerulea-server';
import { divisionWorkspace, homeWorkspace } from '@/lib/workspace-home';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const issueBody = z.object({
  name: z.string().trim().min(2).max(120),
  workspaceId: z.string().min(1).optional(),
});

/** The key as the production screen reads it, with the Cerulea fields beside it. */
function screenKey(key: AccessKey, workspace: CeruleaWorkspace) {
  return {
    id: key.keyId,
    name: key.name,
    prefix: key.prefix,
    scopes: key.scopes,
    requestsPerMinute: key.requestsPerMinute,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.name,
  };
}

/** Shows the first characters and the last four, so a person recognises the key later. */
function maskKey(secret: string): string {
  return `${secret.slice(0, 12)}${'•'.repeat(12)}${secret.slice(-4)}`;
}

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const { workspaces } = await listWorkspaces(options);
    const keys = [];
    for (const workspace of workspaces) {
      try {
        const page = await listAccessKeys(workspace.workspaceId, options);
        for (const key of page.keys) {
          // A revoked key answers no caller, so the list shows open keys alone.
          if (key.revokedAt === null) keys.push(screenKey(key, workspace));
        }
      } catch (cause) {
        // A member whose role carries no key management sees no keys for that workspace.
        if (cause instanceof CeruleaApiError && cause.status === 403) continue;
        throw cause;
      }
    }
    keys.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return { ok: true, keys };
  });
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = issueBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'keys.name_short',
        message: 'A key carries a name of at least two characters.',
        fix: 'Type a name that says what the key serves, then generate the key again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const division = await requestDivision(request);
    const workspace = division
      ? await divisionWorkspace(actor.displayName, options, division, parsed.data.workspaceId)
      : await homeWorkspace(actor.displayName, options, parsed.data.workspaceId);
    // The screen names no scope. The key receives every scope Cerulea publishes,
    // so it reaches what the earlier account key reached.
    const { scopes } = await listAccessKeys(workspace.workspaceId, options);
    const issued = await issueAccessKey(
      workspace.workspaceId,
      { name: parsed.data.name, scopes },
      options,
    );
    return NextResponse.json({
      ok: true,
      key: {
        ...screenKey(issued.key, workspace),
        fullKey: issued.secret,
        maskedKey: maskKey(issued.secret),
      },
      guidance: issued.guidance,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
