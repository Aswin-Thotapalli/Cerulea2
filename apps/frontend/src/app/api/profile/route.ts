// apps/frontend/src/app/api/profile/route.ts
// The profile of the signed in account.
// GET answers the account, the profile fields, the plan, the workspace the
// plan applies to and the usage that workspace recorded. PUT changes the name,
// the company and the role through Cerulea APIs. Every figure is a real read.
// Without this route the account and profile screens open empty.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listProjects, readAccount } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
  withActor,
} from '@/lib/cerulea-server';
import { workspacesWithHome } from '@/lib/workspace-home';
import { planWorkspace, readPlan } from '@/app/api/profile/_shared/plan';
import {
  type ProfileView,
  changeProfile,
  readProfile,
  readUsage,
} from '@/app/api/profile/_shared/profile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const changeBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  displayName: z.string().trim().max(120).optional(),
  avatarUrl: z.string().trim().max(600).optional(),
  company: z.string().trim().max(160).optional(),
  role: z.string().trim().max(120).optional(),
});

export async function GET(request: Request) {
  return withActor(async (actor): Promise<ProfileView> => {
    const options = callOptions(actor);
    const [held, account, plan, workspaces] = await Promise.all([
      readProfile(options),
      readAccount(options),
      readPlan(request, options),
      workspacesWithHome(actor.displayName, options),
    ]);
    const workspace = planWorkspace(plan, workspaces);
    const [projects, usage] = await Promise.all([
      workspace ? listProjects(workspace.workspaceId, options) : Promise.resolve(null),
      readUsage(workspace, options),
    ]);
    return {
      user: {
        ...held.user,
        state: account.account.state,
        multiFactorActive: account.account.multiFactorActive,
        lastSignInAt: account.account.lastSignInAt ?? null,
      },
      profile: held.profile,
      plan,
      workspace: workspace
        ? { workspaceId: workspace.workspaceId, name: workspace.name, application: workspace.application }
        : null,
      projectCount: projects
        ? projects.projects.filter((project) => project.state !== 'closed').length
        : null,
      usage: usage.usage,
      usageFix: usage.fix,
    };
  });
}

export async function PUT(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = changeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return failureResponse(
      {
        code: 'profile.change_incomplete',
        message: 'A profile change carries a name of at least two characters, a company or a role.',
        fix: 'Type the new value, then save again.',
        details: {},
      },
      400,
    );
  }
  try {
    return NextResponse.json(await changeProfile(parsed.data, callOptions(actor)));
  } catch (cause) {
    return failureReply(cause);
  }
}
