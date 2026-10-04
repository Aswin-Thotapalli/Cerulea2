// apps/frontend/src/app/api/dashboard/_shared/project-rows.ts
// The project rows the Overview and the Projects screens list.
// Every row comes from Cerulea APIs: the workspaces the account belongs to and
// the projects inside each one. The type of a project follows the application
// of its workspace. A dApps workspace holds dApps. Every other workspace holds
// private Blockchain networks. A closed project leaves the list.
// Without this module the two screens would count the same projects two ways.

import {
  type CeruleaApiOptions,
  type CeruleaWorkspace,
  listProjects,
  listWorkspaces,
} from '@/lib/cerulea-api';
import { type Division, divisionForApplication, lockedProjectType } from '@/config/divisions';

/** One project as the production tables read it. */
export type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  /** The kind the workspace application fixes. */
  projectType: 'dapp' | 'blockchain';
  /** The status word the production screens colour. */
  status: 'active' | 'deploying' | 'draft' | string;
  /** The Cerulea project state behind the status word. */
  state: string;
  division: Division;
  workspaceId: string;
  workspaceName: string;
  headVersion: number;
  createdAt: string;
  updatedAt: string;
};

/** The status word the production screens read for each Cerulea project state. */
export function statusForState(state: string): string {
  switch (state) {
    case 'deployed':
      return 'active';
    case 'building':
      return 'deploying';
    default:
      return state;
  }
}

/** The division of a workspace. A workspace with an unknown application counts as enterprise. */
export function workspaceDivision(workspace: Pick<CeruleaWorkspace, 'application'>): Division {
  return divisionForApplication(workspace.application) ?? 'enterprise';
}

/** Lists every open project of every workspace the account belongs to, newest first. */
export async function readProjectRows(
  options: CeruleaApiOptions,
): Promise<{ workspaces: CeruleaWorkspace[]; projects: ProjectRow[] }> {
  const { workspaces } = await listWorkspaces(options);
  const pages = await Promise.all(
    workspaces.map(async (workspace) => ({
      workspace,
      projects: (await listProjects(workspace.workspaceId, options)).projects,
    })),
  );
  const projects: ProjectRow[] = [];
  for (const page of pages) {
    const division = workspaceDivision(page.workspace);
    const projectType = lockedProjectType(division) ?? 'blockchain';
    for (const project of page.projects) {
      if (project.state === 'closed') continue;
      projects.push({
        id: project.projectId,
        name: project.name,
        slug: project.slug,
        summary: project.summary,
        projectType,
        status: statusForState(project.state),
        state: project.state,
        division,
        workspaceId: page.workspace.workspaceId,
        workspaceName: page.workspace.name,
        headVersion: project.headVersion,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    }
  }
  projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return { workspaces, projects };
}
