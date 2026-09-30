// apps/frontend/src/lib/interface/studio.ts
// The calls Step 5 makes from the browser.
// Every call reaches a Studio route. The Studio route reads the Blueprint and
// calls the frontend engine inside Cerulea APIs on the server, so the browser
// holds neither the access token nor the Blueprint document.
// Without this module Step 5 would reach Cerulea APIs directly.

import { api } from '@/lib/apiClient';
import type { BuildState } from '@/lib/studio/project-state';
import type { AccessibilityOutcome, BindingChoice, PreviewOutcome } from './types';
import type { InterfaceWorkspace, PreviewRequest } from './server';

export type { InterfaceWorkspace, PreviewRequest } from './server';

function projectPath(projectId: string, rest: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}${rest}`;
}

/** Reads the generated application, the component set, the roles and the endpoints. */
export function readInterfaceWorkspace(projectId: string): Promise<InterfaceWorkspace> {
  return api<InterfaceWorkspace>(projectPath(projectId, '/interface'));
}

/** Renders the application as one role, at one width, in one mode. */
export function readInterfacePreview(
  projectId: string,
  request: PreviewRequest,
): Promise<PreviewOutcome> {
  return api<PreviewOutcome>(projectPath(projectId, '/interface/preview'), {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** Reads the bindings one component may take for one role. */
export function readInterfaceBindings(
  projectId: string,
  request: { role: string; component: string },
): Promise<{ role: string; component: string; choices: BindingChoice[] }> {
  return api(projectPath(projectId, '/interface/bindings'), {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** Runs the accessibility check over the generated application. */
export function readInterfaceAccessibility(
  projectId: string,
): Promise<AccessibilityOutcome & { version: number }> {
  return api(projectPath(projectId, '/accessibility'));
}

/**
 * Records that the person checked the generated application.
 *
 * The readiness checklist reads the Step 5 line from this flag. The rest of
 * the build state stays exactly as the project holds it.
 */
export async function markInterfaceAuthored(projectId: string): Promise<BuildState> {
  const held = await api<{ buildState: BuildState }>(projectPath(projectId, '/build-state'));
  const next: BuildState = {
    ...held.buildState,
    steps: { ...held.buildState.steps, interfaceAuthoring: true },
  };
  const saved = await api<{ buildState: BuildState }>(projectPath(projectId, '/build-state'), {
    method: 'PUT',
    body: JSON.stringify({ buildState: next }),
  });
  return saved.buildState;
}
