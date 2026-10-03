// apps/frontend/src/app/api/mcp/keys/[id]/route.ts
// The Keys screen revokes one access key here.
// Cerulea APIs keeps every key against a workspace, so this route finds the
// workspace holding the key and revokes it there. A revoked key stays in the
// audit record, and every caller holding it receives a refusal.
// Without this route a leaked key keeps working.
import { NextResponse } from 'next/server';

import {
  CeruleaApiError,
  listAccessKeys,
  listWorkspaces,
  revokeAccessKey,
} from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const options = callOptions(actor);
    const { workspaces } = await listWorkspaces(options);
    for (const workspace of workspaces) {
      let held;
      try {
        held = await listAccessKeys(workspace.workspaceId, options);
      } catch (cause) {
        // A member whose role carries no key management holds no key in that workspace.
        if (cause instanceof CeruleaApiError && cause.status === 403) continue;
        throw cause;
      }
      if (held.keys.some((key) => key.keyId === id)) {
        const revoked = await revokeAccessKey(workspace.workspaceId, id, options);
        return NextResponse.json({ ok: true, key: revoked.key, guidance: revoked.guidance });
      }
    }
    return failureResponse(
      {
        code: 'keys.key_absent',
        message: 'No workspace of this account holds a key with that identifier.',
        fix: 'Open the key list again and choose a key it names.',
        details: { keyId: id },
      },
      404,
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
