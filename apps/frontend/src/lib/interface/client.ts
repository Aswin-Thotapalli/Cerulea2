// apps/frontend/src/lib/interface/client.ts
// The calls Step 5 makes to the frontend engine.
// The engine lives in Cerulea APIs. It generates the application from the
// model, answers which bindings a role may legally reach, renders the preview
// as any role and reports the accessibility gate.
// Without this module Step 5 would hold a second copy of the engine.

import { type CeruleaApiOptions, ceruleaRequest } from '@/lib/cerulea-api';
import type {
  AccessibilityOutcome,
  BindingChoice,
  ComponentCatalogue,
  EngineFault,
  GeneratedInterface,
  InterfaceSection,
  PreviewOutcome,
  PreviewRole,
} from './types';

/** Reads the component set, the theme and the widths. */
export function readComponentCatalogue(
  options: CeruleaApiOptions = {},
): Promise<ComponentCatalogue> {
  return ceruleaRequest<ComponentCatalogue>('/engine/components', { method: 'GET' }, options);
}

/** Generates the interface section from one Blueprint. */
export function generateInterface(
  input: { document: unknown },
  options: CeruleaApiOptions = {},
): Promise<GeneratedInterface> {
  return ceruleaRequest<GeneratedInterface>(
    '/engine/interface',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Reads the generated interface of a stored project. */
export function readProjectInterface(
  input: { projectId: string; version?: number },
  options: CeruleaApiOptions = {},
): Promise<GeneratedInterface & { version: number }> {
  const version = input.version === undefined ? '' : `?version=${input.version}`;
  return ceruleaRequest<GeneratedInterface & { version: number }>(
    `/projects/${encodeURIComponent(input.projectId)}/engine/interface${version}`,
    { method: 'GET' },
    options,
  );
}

/** Checks a section a person edited and names every correction. */
export function checkInterface(
  input: { document: unknown; section: InterfaceSection },
  options: CeruleaApiOptions = {},
): Promise<{ faults: EngineFault[] }> {
  return ceruleaRequest<{ faults: EngineFault[] }>(
    '/engine/interface/checks',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/**
 * Reads the bindings one component may take on a screen serving one role.
 *
 * The engine offers only the bindings the permission resolver admits, so the
 * picker never presents an invalid binding.
 */
export function readBindings(
  input: { document: unknown; role: string; component: string },
  options: CeruleaApiOptions = {},
): Promise<{ role: string; component: string; choices: BindingChoice[] }> {
  return ceruleaRequest<{ role: string; component: string; choices: BindingChoice[] }>(
    '/engine/bindings',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Asks the engine whether one binding is legal before writing it. */
export function checkBinding(
  input: { document: unknown; role: string; component: string; binding: unknown },
  options: CeruleaApiOptions = {},
): Promise<{ legal: true; binding: unknown }> {
  return ceruleaRequest<{ legal: true; binding: unknown }>(
    '/engine/bindings/checks',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Renders the application as one role, at one width, in one mode. */
export function readPreview(
  input: {
    document: unknown;
    section?: InterfaceSection;
    role: string;
    screen?: string;
    breakpoint?: string;
    mode?: 'light' | 'dark';
    language?: string;
    record?: Record<string, unknown>;
  },
  options: CeruleaApiOptions = {},
): Promise<PreviewOutcome> {
  return ceruleaRequest<PreviewOutcome>(
    '/engine/preview',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Counts the screens every role reaches. */
export function readPreviewRoles(
  input: { document: unknown; section?: InterfaceSection },
  options: CeruleaApiOptions = {},
): Promise<{ roles: PreviewRole[] }> {
  return ceruleaRequest<{ roles: PreviewRole[] }>(
    '/engine/preview/roles',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Runs the accessibility check and reads the publication gate. */
export function readAccessibility(
  input: { section: InterfaceSection },
  options: CeruleaApiOptions = {},
): Promise<AccessibilityOutcome> {
  return ceruleaRequest<AccessibilityOutcome>(
    '/engine/accessibility',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Shows what a declared conflict rule does to two readings. */
export function tryConflictRule(
  input: {
    document: unknown;
    section: InterfaceSection;
    collection: string;
    stored?: Record<string, unknown>;
    captured: Record<string, unknown>;
  },
  options: CeruleaApiOptions = {},
): Promise<{
  outcome: string;
  rule: string;
  reason: string;
  changed: string[];
  record: Record<string, unknown>;
  faults: { collection: string; problem: string; fix: string }[];
}> {
  return ceruleaRequest(
    '/engine/conflicts',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}
