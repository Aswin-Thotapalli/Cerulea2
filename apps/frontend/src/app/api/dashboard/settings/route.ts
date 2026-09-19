// apps/frontend/src/app/api/dashboard/settings/route.ts
// The account and workspace screen reads this route.
// The account, the open sessions, the workspace, its members and the role
// matrix all come from Cerulea APIs.
// Without this route nobody can see where an account is signed in.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  closeSession,
  inviteMember,
  listMembers,
  listSessions,
  listWorkspaceRoles,
  readAccount,
} from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired, withActor } from '@/lib/cerulea-server';
import { homeWorkspace, workspacesWithHome } from '@/lib/workspace-home';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const inviteBody = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'administrator', 'builder', 'reviewer', 'viewer']),
  workspaceId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const named = new URL(request.url).searchParams.get('workspaceId');
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const workspaces = await workspacesWithHome(actor.displayName, options);
    const workspace = await homeWorkspace(actor.displayName, options, named);
    const [account, sessions, members, roles] = await Promise.all([
      readAccount(options),
      listSessions(options),
      listMembers(workspace.workspaceId, options),
      listWorkspaceRoles(options),
    ]);
    return {
      account: account.account,
      sessions: sessions.sessions,
      workspace,
      workspaces,
      members: members.members,
      roles: roles.roles,
    };
  });
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = inviteBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'member.invitation_incomplete',
          message: 'An invitation carries an email address and a role.',
          fix: 'Type the address, choose the role, then send the invitation again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(actor.displayName, options, parsed.data.workspaceId);
    return NextResponse.json(
      await inviteMember(
        workspace.workspaceId,
        { email: parsed.data.email, role: parsed.data.role },
        options,
      ),
      { status: 201 },
    );
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function DELETE(request: Request) {
  const sessionId = new URL(request.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json(
      {
        error: {
          code: 'session.unnamed',
          message: 'Cerulea reads the session to close on this request.',
          fix: 'Choose a session from the list, then close it again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  return withActor((actor) => closeSession(sessionId, callOptions(actor)));
}
