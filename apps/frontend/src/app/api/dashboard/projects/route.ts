// apps/frontend/src/app/api/dashboard/projects/route.ts
// The Projects screen reads this route.
// Every row comes from the workspaces of the account and the projects inside
// each one. The type of a row follows the application of its workspace.
// Without this route the Projects screen would list nothing.
import { callOptions, withActor } from '@/lib/cerulea-server';
import { readProjectRows } from '@/app/api/dashboard/_shared/project-rows';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const held = await readProjectRows(callOptions(actor));
    return {
      projects: held.projects,
      workspaces: held.workspaces.map((workspace) => ({
        workspaceId: workspace.workspaceId,
        name: workspace.name,
        application: workspace.application,
      })),
    };
  });
}
