// apps/frontend/src/app/api/ai/threads/route.ts
// Lists and opens Cerulea Intelligence threads for the assistant drawer.
// Every thread lives in Cerulea APIs and belongs to one project. The list
// reads the threads of the named project, or of every open project when the
// drawer names none. The time of the last turn orders the list.
// Without this route the assistant drawer shows no history and opens no thread.
import { NextResponse } from 'next/server';

import {
  type CeruleaApiOptions,
  ceruleaRequest,
  listProjects,
  listWorkspaces,
  readIntelligenceThread,
  startIntelligenceThread,
} from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import { objectBody } from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The number of threads the drawer lists, newest first. */
const LISTED_THREADS = 10;

type ListedThread = {
  threadId: string;
  projectId: string;
  title: string;
  state: string;
  createdAt: string;
};

function projectThreads(projectId: string, options: CeruleaApiOptions) {
  return ceruleaRequest<{ threads: ListedThread[] }>(
    `/intelligence/projects/${encodeURIComponent(projectId)}/threads`,
    { method: 'GET' },
    options,
  );
}

async function openProjectIds(options: CeruleaApiOptions): Promise<string[]> {
  const { workspaces } = await listWorkspaces(options);
  const pages = await Promise.all(
    workspaces.map((workspace) => listProjects(workspace.workspaceId, options)),
  );
  return pages.flatMap((page) =>
    page.projects.filter((project) => project.state !== 'closed').map((project) => project.projectId),
  );
}

// GET /api/ai/threads?projectId=
export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const projectId = new URL(request.url).searchParams.get('projectId');
  try {
    const options = callOptions(actor);
    const projectIds = projectId ? [projectId] : await openProjectIds(options);
    const listed = (
      await Promise.all(projectIds.map((id) => projectThreads(id, options)))
    ).flatMap((page) => page.threads);
    listed.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const threads = await Promise.all(
      listed.slice(0, LISTED_THREADS).map(async (thread) => {
        const held = await readIntelligenceThread(thread.threadId, options);
        const lastTurn = held.turns[held.turns.length - 1];
        return {
          id: thread.threadId,
          projectId: thread.projectId,
          title: thread.title,
          state: thread.state,
          createdAt: thread.createdAt,
          updatedAt: lastTurn?.createdAt ?? thread.createdAt,
        };
      }),
    );
    threads.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return NextResponse.json({ threads });
  } catch (cause) {
    return failureReply(cause);
  }
}

// POST /api/ai/threads  body: { projectId, title? }
export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
  if (!projectId) {
    return failureResponse(
      {
        code: 'intelligence.project_unnamed',
        message: 'Cerulea Intelligence opens each thread against one project.',
        fix: 'Open a project in Studio, then start the conversation again.',
        details: {},
      },
      400,
    );
  }
  try {
    const opened = await startIntelligenceThread(projectId, callOptions(actor));
    return NextResponse.json({ thread: { id: opened.threadId, projectId } });
  } catch (cause) {
    return failureReply(cause);
  }
}
