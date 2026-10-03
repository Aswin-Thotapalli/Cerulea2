// apps/frontend/src/app/api/projects/route.ts
// Lists and opens projects through Cerulea APIs.
// The list spans every workspace the account belongs to. Each entry carries
// the division of its workspace and the track held in its build state.
// A new project opens inside the workspace serving its division, and its
// Foundation choices go into the build state at the same moment.
// Without this route Studio and the dashboard list nothing and open nothing.
import { NextResponse } from 'next/server';

import { createProject, listProjects, listWorkspaces } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  requestDivision,
  signInRequired,
} from '@/lib/cerulea-server';
import { divisionWorkspace } from '@/lib/workspace-home';
import {
  applicationForDivision,
  divisionForProject,
  lockedProjectType,
} from '@/config/divisions';
import {
  type ProjectRecord,
  changeBuildState,
  objectBody,
  projectRecord,
  readHeldBuildState,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TEMPLATE_ID_LIMIT = 120;

// GET /api/projects?q=&limit=&offset=
export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const search = new URL(request.url).searchParams;
  const q = (search.get('q') ?? '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number.parseInt(search.get('limit') ?? '50', 10) || 50, 1), 200);
  const offset = Math.max(Number.parseInt(search.get('offset') ?? '0', 10) || 0, 0);
  try {
    const options = callOptions(actor);
    const { workspaces } = await listWorkspaces(options);
    const pages = await Promise.all(
      workspaces.map(async (workspace) => ({
        workspace,
        projects: (await listProjects(workspace.workspaceId, options)).projects,
      })),
    );
    const open = pages.flatMap((page) =>
      page.projects
        .filter((project) => project.state !== 'closed')
        .filter((project) => !q || project.name.toLowerCase().includes(q))
        .map((project) => ({ project, application: page.workspace.application })),
    );
    open.sort((left, right) => right.project.createdAt.localeCompare(left.project.createdAt));
    const shown = open.slice(offset, offset + limit);
    const records: ProjectRecord[] = await Promise.all(
      shown.map(async ({ project, application }) =>
        projectRecord(project, application, await readHeldBuildState(project.projectId, options)),
      ),
    );
    return NextResponse.json({ ok: true, projects: records });
  } catch (cause) {
    return failureReply(cause);
  }
}

// POST /api/projects
export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (name.length < 2) {
    return failureResponse(
      {
        code: 'project.name_short',
        message: 'A project carries a name of at least two characters.',
        fix: 'Type a longer name, then create the project again.',
        details: {},
      },
      400,
    );
  }
  const projectType = body?.projectType;
  if (projectType !== 'dapp' && projectType !== 'blockchain') {
    return failureResponse(
      {
        code: 'project.type_unnamed',
        message: 'A project is a decentralised application or a private Blockchain.',
        fix: 'Choose dapp or blockchain as the project type, then create the project again.',
        details: {},
      },
      400,
    );
  }
  const templateId =
    typeof body?.templateId === 'string' && body.templateId !== 'scratch'
      ? body.templateId.slice(0, TEMPLATE_ID_LIMIT)
      : '';
  const summary = typeof body?.description === 'string' ? body.description.slice(0, 800) : '';
  const namedWorkspace = typeof body?.workspaceId === 'string' ? body.workspaceId : null;

  try {
    const options = callOptions(actor);
    const division =
      (await requestDivision(request)) ??
      divisionForProject(projectType, templateId ? [templateId] : []);
    const workspace = await divisionWorkspace(actor.displayName, options, division, namedWorkspace);
    const opened = await createProject(
      workspace.workspaceId,
      { name, summary: summary || undefined },
      options,
    );
    const projectId = opened.project.projectId;
    await changeBuildState(projectId, options, (state) => {
      state.foundation.projectName = name.slice(0, 160);
      state.foundation.summary = summary;
      state.foundation.application = applicationForDivision(division);
      state.foundation.track = projectType;
      state.foundation.trackOverridden = lockedProjectType(division) !== projectType;
      state.foundation.templateId = templateId;
    });
    return NextResponse.json({
      ok: true,
      id: projectId,
      slug: opened.project.slug,
      workspaceId: workspace.workspaceId,
      division,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
