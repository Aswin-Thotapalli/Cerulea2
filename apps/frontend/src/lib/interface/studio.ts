// apps/frontend/src/lib/interface/studio.ts
// The calls the Interface sub-step makes from the browser.
// Every call reaches a Studio route. The Studio route reads the Blueprint and
// calls the frontend engine inside Cerulea APIs on the server, so the browser
// holds neither the access token nor the Blueprint document.
// Without this module the builder would reach Cerulea APIs directly.

import { api } from '@/lib/apiClient';
import type { AccessibilityOutcome, BindingChoice, InterfaceSection, PreviewOutcome } from './types';
import type { InterfaceSaveOutcome, InterfaceWorkspace, PreviewRequest } from './server';

export type { InterfaceSaveOutcome, InterfaceWorkspace, PreviewRequest } from './server';

function projectPath(projectId: string, rest: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}${rest}`;
}

/** Reads the application, the component set, the roles and the endpoints. */
export function readInterfaceWorkspace(projectId: string): Promise<InterfaceWorkspace> {
  return api<InterfaceWorkspace>(projectPath(projectId, '/interface'));
}

/** Writes the edited Views section into the Blueprint as a new version. */
export function saveInterfaceSection(
  projectId: string,
  input: { section: InterfaceSection; expectedVersion?: number },
): Promise<InterfaceSaveOutcome> {
  return api<InterfaceSaveOutcome>(projectPath(projectId, '/interface'), {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/** Removes the saved section, so the engine generates the screens from the model again. */
export function resetInterfaceSection(projectId: string): Promise<InterfaceSaveOutcome> {
  return api<InterfaceSaveOutcome>(projectPath(projectId, '/interface'), { method: 'DELETE' });
}

/** Renders the application as one role, at one width, in one mode. */
export function readInterfacePreview(
  projectId: string,
  request: PreviewRequest & { section?: InterfaceSection },
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

/** Runs the accessibility check over the screens the Blueprint holds. */
export function readInterfaceAccessibility(
  projectId: string,
): Promise<AccessibilityOutcome & { version: number; authored: boolean }> {
  return api(projectPath(projectId, '/accessibility'));
}

/** Runs the accessibility check over the section the builder holds. */
export function checkSectionAccessibility(
  projectId: string,
  section: InterfaceSection,
): Promise<AccessibilityOutcome & { version: number; authored: boolean }> {
  return api(projectPath(projectId, '/accessibility'), {
    method: 'POST',
    body: JSON.stringify({ section }),
  });
}
