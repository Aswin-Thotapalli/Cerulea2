// apps/frontend/src/lib/project-blueprints.ts
// Reading every project of an account with its Blueprint.
// Several Dashboard panels work across the whole of the account. Each reads the
// same set, so the read lives here once.
// Without this module each panel would repeat the same three calls.

import {
  type CeruleaApiOptions,
  type CeruleaProject,
  type CeruleaWorkspace,
  listProjects,
  readBlueprint,
} from '@/lib/cerulea-api';
import { workspacesWithHome } from '@/lib/workspace-home';

export type ProjectWithBlueprint = {
  project: CeruleaProject;
  workspace: CeruleaWorkspace;
  version: number;
  blueprintHash: string;
  document: unknown;
};

/** Reads every project the account holds, each with the Blueprint at its head. */
export async function projectsWithBlueprints(
  displayName: string,
  options: CeruleaApiOptions,
): Promise<{ workspaces: CeruleaWorkspace[]; entries: ProjectWithBlueprint[] }> {
  const workspaces = await workspacesWithHome(displayName, options);
  const entries: ProjectWithBlueprint[] = [];
  for (const workspace of workspaces) {
    const page = await listProjects(workspace.workspaceId, options);
    for (const project of page.projects) {
      const blueprint = await readBlueprint(project.projectId, {}, options);
      entries.push({
        project,
        workspace,
        version: blueprint.version,
        blueprintHash: blueprint.blueprintHash,
        document: blueprint.document,
      });
    }
  }
  entries.sort((left, right) => right.project.updatedAt.localeCompare(left.project.updatedAt));
  return { workspaces, entries };
}
