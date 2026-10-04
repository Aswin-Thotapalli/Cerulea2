// apps/frontend/src/app/api/dashboard/settings/route.ts
// The account screen under the dashboard reads this route.
// The account, the open sessions, the plan of the current division, the
// workspace that plan applies to, its members, the role matrix and the project
// count all come from Cerulea APIs. POST sends a workspace invitation.
// Without this route the account screen shows no plan, no member and no session.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  inviteMember,
  listMembers,
  listProjects,
  listSessions,
  listWorkspaceRoles,
  readAccount,
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
import { planWorkspace, readPlan } from '@/app/api/profile/_shared/plan';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const inviteBody = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'administrator', 'builder', 'reviewer', 'viewer']),
  workspaceId: z.string().min(1).optional(),
});

// GET /api/dashboard/settings?workspaceId=
export async function GET(request: Request) {
  const named = new URL(request.url).searchParams.get('workspaceId');
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [workspaces, plan, account, sessions, roles] = await Promise.all([
      workspacesWithHome(actor.displayName, options),
      readPlan(request, options),
      readAccount(options),
      listSessions(options),
      listWorkspaceRoles(options),
    ]);
    // A named workspace wins. Otherwise the screen works inside the workspace
    // the plan of the current division applies to.
    const chosen = named ? workspaces.find((entry) => entry.workspaceId === named) : undefined;
    const workspace = chosen ?? planWorkspace(plan, workspaces) ?? workspaces[0];
    const [members, projects] = await Promise.all([
      listMembers(workspace.workspaceId, options),
      listProjects(workspace.workspaceId, options),
    ]);
    return {
      account: account.account,
      sessions: sessions.sessions,
      workspace,
      workspaces,
      members: members.members,
      roles: roles.roles,
      plan,
      projectCount: projects.projects.filter((project) => project.state !== 'closed').length,
    };
  });
}

// POST /api/dashboard/settings {email, role, workspaceId?}
export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = inviteBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'member.invitation_incomplete',
        message: 'An invitation carries an email address and a role.',
        fix: 'Type the address, choose the role, then send the invitation again.',
        details: {},
      },
      400,
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
