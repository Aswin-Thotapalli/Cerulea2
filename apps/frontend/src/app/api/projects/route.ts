// apps/frontend/src/app/api/projects/route.ts
// Reads and opens projects through Cerulea APIs.
// The list spans every workspace the account belongs to, so one screen shows
// the whole of the work.
// Without this route Studio lists nothing and opens nothing.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { type CeruleaProject, createProject, listProjects } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';
import { homeWorkspace, workspacesWithHome } from '@/lib/workspace-home';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createBody = z.object({
  name: z.string().min(2).max(160),
  summary: z.string().max(800).optional(),
  workspaceId: z.string().min(1).optional(),
});

export type ProjectListing = CeruleaProject & {
  workspaceName: string;
  workspaceApplication: string;
};

export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const search = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? '';
  try {
    const options = callOptions(actor);
    const workspaces = await workspacesWithHome(actor.displayName, options);
    const listings: ProjectListing[] = [];
    for (const workspace of workspaces) {
      const page = await listProjects(workspace.workspaceId, options);
      for (const project of page.projects) {
        listings.push({
          ...project,
          workspaceName: workspace.name,
          workspaceApplication: workspace.application,
        });
      }
    }
    const matched = search
      ? listings.filter((entry) => entry.name.toLowerCase().includes(search))
      : listings;
    matched.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return NextResponse.json({ projects: matched, workspaces });
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = createBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'project.name_short',
          message: 'A project carries a name of at least two characters.',
          fix: 'Type a longer name, then open the project again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(actor.displayName, options, parsed.data.workspaceId);
    const outcome = await createProject(
      workspace.workspaceId,
      { name: parsed.data.name, summary: parsed.data.summary },
      options,
    );
    return NextResponse.json({ ...outcome, workspace }, { status: 201 });
  } catch (cause) {
    return failureReply(cause);
  }
}
