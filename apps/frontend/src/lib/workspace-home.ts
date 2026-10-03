// apps/frontend/src/lib/workspace-home.ts
// Every project lives inside a workspace.
// A person signing in for the first time holds no workspace, so Cerulea opens
// one named after them. Studio therefore never shows an empty chooser.
// Without this module a first project would have nowhere to go.

import {
  type CeruleaApiOptions,
  type CeruleaWorkspace,
  createWorkspace,
  listWorkspaces,
} from '@/lib/cerulea-api';
import { type Division, DIVISION_LABELS, applicationForDivision } from '@/config/divisions';

/** The name Cerulea gives the first workspace of an account. */
export function firstWorkspaceName(displayName: string): string {
  const trimmed = displayName.trim();
  return trimmed.length > 0 ? `${trimmed} workspace` : 'My workspace';
}

/**
 * Reads every workspace the account belongs to.
 * The list carries at least one entry, since Cerulea opens the first one here.
 */
export async function workspacesWithHome(
  displayName: string,
  options: CeruleaApiOptions,
): Promise<CeruleaWorkspace[]> {
  const listed = await listWorkspaces(options);
  if (listed.workspaces.length > 0) return listed.workspaces;
  const opened = await createWorkspace({ name: firstWorkspaceName(displayName) }, options);
  return [opened.workspace];
}

/** Reads the workspace a screen works inside, taking the named one when present. */
export async function homeWorkspace(
  displayName: string,
  options: CeruleaApiOptions,
  named?: string | null,
): Promise<CeruleaWorkspace> {
  const list = await workspacesWithHome(displayName, options);
  const chosen = named ? list.find((entry) => entry.workspaceId === named) : undefined;
  return chosen ?? list[0];
}

/** The name Cerulea gives the workspace an account opens for one division. */
export function divisionWorkspaceName(displayName: string, division: Division): string {
  const owner = displayName.trim().length > 0 ? displayName.trim() : 'My';
  return `${owner} ${DIVISION_LABELS[division].title} workspace`;
}

/**
 * Reads the workspace serving one division.
 * Cerulea APIs fixes the application of a workspace when it opens, so a person
 * entering a division without a workspace for it receives a new one, named
 * after the division. A named workspace wins when it serves the division.
 */
export async function divisionWorkspace(
  displayName: string,
  options: CeruleaApiOptions,
  division: Division,
  named?: string | null,
): Promise<CeruleaWorkspace> {
  const application = applicationForDivision(division);
  const listed = await listWorkspaces(options);
  const serving = listed.workspaces.filter((entry) => entry.application === application);
  const chosen = named ? serving.find((entry) => entry.workspaceId === named) : undefined;
  if (chosen) return chosen;
  if (serving.length > 0) return serving[0];
  const opened = await createWorkspace(
    { name: divisionWorkspaceName(displayName, division), application },
    options,
  );
  return opened.workspace;
}
