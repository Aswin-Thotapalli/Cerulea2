// apps/frontend/src/app/api/admin/projects/route.ts
// Every project on the platform, for the Cerulea operator.
// Cerulea APIs lists the projects and the workspaces through the administration
// reads. Those reads open for the operator role alone. The workspace a project
// lives in fixes its division, and the division fixes the project type. The
// owner rides on the row once Cerulea APIs carries it; until then the workspace
// name stands as the owner.
// Without this route the operator project screens show nothing.
import { readAdministration } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { divisionForApplication, lockedProjectType } from '@/config/divisions';

import type { ProjectRow, WorkspaceRow } from '../_shared/reads';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Names the status the production screens show. A deployed project reads active. */
function screenStatus(state: string): string {
  if (state === 'deployed') return 'active';
  if (state === 'building') return 'draft';
  return state;
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const term = search.get('search')?.toLowerCase() ?? '';
  const type = search.get('type') ?? '';
  const status = search.get('status') ?? '';
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [held, spaces] = await Promise.all([
      readAdministration<{ projects: ProjectRow[] }>('projects', options),
      readAdministration<{ workspaces: WorkspaceRow[] }>('workspaces', options),
    ]);
    const applications = new Map(spaces.workspaces.map((row) => [row.workspaceId, row.application]));
    const everything = held.projects.map((row) => {
      const division = divisionForApplication(applications.get(row.workspaceId));
      return {
        id: row.projectId,
        name: row.name,
        projectType: division ? lockedProjectType(division) : null,
        division,
        status: screenStatus(row.state),
        state: row.state,
        headVersion: row.headVersion,
        deployments: row.deployments,
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        ownerEmail: row.ownerEmail ?? null,
        ownerName: row.ownerName ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    let projects = everything;
    if (term) {
      projects = projects.filter(
        (row) =>
          row.name.toLowerCase().includes(term) ||
          row.workspaceName.toLowerCase().includes(term) ||
          (row.ownerEmail ?? '').toLowerCase().includes(term) ||
          (row.ownerName ?? '').toLowerCase().includes(term),
      );
    }
    if (type && type !== 'all') projects = projects.filter((row) => row.projectType === type);
    if (status && status !== 'all') projects = projects.filter((row) => row.status === status);
    return {
      projects,
      total: projects.length,
      // The header chips count the whole platform, whatever the filters hold.
      counts: {
        projects: everything.length,
        dapp: everything.filter((row) => row.projectType === 'dapp').length,
        blockchain: everything.filter((row) => row.projectType === 'blockchain').length,
      },
      statuses: Array.from(new Set(everything.map((row) => row.status))).sort(),
    };
  });
}
