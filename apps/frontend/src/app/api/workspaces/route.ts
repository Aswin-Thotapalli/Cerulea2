// apps/frontend/src/app/api/workspaces/route.ts
// Reads and opens workspaces through Cerulea APIs.
// A workspace holds the projects a team builds together. Cerulea APIs fixes
// the application of a workspace when it opens, and the application names the
// division the workspace serves. Inside a division this route lists and opens
// workspaces for that division alone.
// Without this route Studio cannot place a project anywhere.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { type CeruleaWorkspace, createWorkspace, listWorkspaces } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  requestDivision,
  signInRequired,
} from '@/lib/cerulea-server';
import { applicationForDivision, divisionForApplication } from '@/config/divisions';
import { divisionWorkspace, workspacesWithHome } from '@/lib/workspace-home';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createBody = z.object({
  name: z.string().trim().min(2).max(120),
  application: z.enum(['dapps', 'enterprise', 'government']).optional(),
});

/** The workspace as the Studio chooser reads it, with the Cerulea fields beside it. */
function screenWorkspace(workspace: CeruleaWorkspace) {
  return {
    ...workspace,
    id: workspace.workspaceId,
    division: divisionForApplication(workspace.application),
  };
}

export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const options = callOptions(actor);
    const division = await requestDivision(request);
    if (!division) {
      const workspaces = await workspacesWithHome(actor.displayName, options);
      return NextResponse.json(workspaces.map(screenWorkspace));
    }
    // A person entering a division without a workspace for it receives one, named after the division.
    const opened = await divisionWorkspace(actor.displayName, options, division);
    const application = applicationForDivision(division);
    const { workspaces } = await listWorkspaces(options);
    const serving = workspaces.filter((entry) => entry.application === application);
    const ordered = [opened, ...serving.filter((entry) => entry.workspaceId !== opened.workspaceId)];
    return NextResponse.json(ordered.map(screenWorkspace));
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = createBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'workspace.name_short',
        message: 'A workspace carries a name of at least two characters.',
        fix: 'Type a longer name, then open the workspace again.',
        details: {},
      },
      400,
    );
  }
  try {
    const division = await requestDivision(request);
    // A named application wins. Inside a division the workspace serves that division.
    const application =
      parsed.data.application ?? (division ? applicationForDivision(division) : undefined);
    const outcome = await createWorkspace(
      { name: parsed.data.name, application },
      callOptions(actor),
    );
    return NextResponse.json(screenWorkspace(outcome.workspace), { status: 201 });
  } catch (cause) {
    return failureReply(cause);
  }
}
