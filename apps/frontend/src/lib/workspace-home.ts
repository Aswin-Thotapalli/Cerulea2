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
