// apps/frontend/src/lib/interface/server.ts
// The Step 5 reads a Studio route handler makes on the server.
// A route handler receives the account behind the request and the access
// token Cerulea APIs issued. The handler reads the Blueprint of the project
// on the server and asks the frontend engine inside Cerulea APIs for the
// generated application, the preview and the legal bindings.
// The browser receives the answers and never holds the access token or the
// Blueprint document.
// Without this module Step 5 would call Cerulea APIs from the browser with the
// token in hand.

import { type CeruleaApiOptions, readBlueprint, readDeploymentManifest } from '@/lib/cerulea-api';
import type { IntegrationItem } from '@/lib/manifest/types';
import {
  generateInterface,
  readBindings,
  readComponentCatalogue,
  readPreview,
  readPreviewRoles,
} from './client';
import type {
  BindingChoice,
  ComponentCatalogue,
  GeneratedInterface,
  PreviewOutcome,
  PreviewRole,
} from './types';

/** Everything Step 5 opens with, read in one pass. */
export type InterfaceWorkspace = {
  projectId: string;
  /** The Blueprint version the application was generated from. */
  version: number;
  generated: GeneratedInterface;
  catalogue: ComponentCatalogue;
  roles: PreviewRole[];
  /** Every endpoint the deployment publishes beside the screens. */
  endpoints: IntegrationItem[];
  /** The reason the endpoint list is empty when the manifest could not be read. */
  endpointsNote: string;
};

/** The preview a person asks for. */
export type PreviewRequest = {
  role: string;
  breakpoint?: string;
  mode?: 'light' | 'dark';
  screen?: string;
  language?: string;
};

/** Reads the endpoint list out of the atomic Deployment Manifest. */
function endpointsOf(reply: Record<string, unknown>): IntegrationItem[] {
  const manifest = reply.manifest;
  if (manifest === null || typeof manifest !== 'object') return [];
  const held = (manifest as { integration?: unknown }).integration;
  if (!Array.isArray(held)) return [];
  return held.filter(
    (entry): entry is IntegrationItem =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as IntegrationItem).method === 'string' &&
      typeof (entry as IntegrationItem).path === 'string',
  );
}

/**
 * Generates the application of one project.
 *
 * The engine generates the screens from the model every time. The Blueprint
 * stays the one source, so a change in Step 3 reaches Step 5 on the next open.
 */
export async function readInterfaceWorkspace(
  projectId: string,
  selector: { version?: number },
  options: CeruleaApiOptions,
): Promise<InterfaceWorkspace> {
  const held = await readBlueprint(projectId, { version: selector.version }, options);
  const [generated, catalogue, roles, manifest] = await Promise.all([
    generateInterface({ document: held.document }, options),
    readComponentCatalogue(options),
    readPreviewRoles({ document: held.document }, options),
    readDeploymentManifest(projectId, { view: 'atomic', version: held.version }, options).catch(
      (cause: unknown) => ({ unread: cause instanceof Error ? cause.message : String(cause) }),
    ),
  ]);
  const unread = typeof manifest.unread === 'string' ? manifest.unread : '';
  return {
    projectId,
    version: held.version,
    generated,
    catalogue,
    roles: roles.roles,
    endpoints: unread.length > 0 ? [] : endpointsOf(manifest),
    endpointsNote:
      unread.length > 0
        ? `Cerulea read no endpoint list for this version. ${unread}`
        : '',
  };
}

/** Renders the application of one project as one role, at one width, in one mode. */
export async function readInterfacePreview(
  projectId: string,
  request: PreviewRequest,
  options: CeruleaApiOptions,
): Promise<PreviewOutcome> {
  const held = await readBlueprint(projectId, {}, options);
  return readPreview({ document: held.document, ...request }, options);
}

/** Reads the bindings one component may take for one role of one project. */
export async function readInterfaceBindings(
  projectId: string,
  request: { role: string; component: string },
  options: CeruleaApiOptions,
): Promise<{ role: string; component: string; choices: BindingChoice[] }> {
  const held = await readBlueprint(projectId, {}, options);
  return readBindings({ document: held.document, ...request }, options);
}
