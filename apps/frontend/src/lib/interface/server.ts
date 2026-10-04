// apps/frontend/src/lib/interface/server.ts
// The Interface sub-step reads and writes a Studio route handler makes on the server.
// A route handler receives the account behind the request and the access
// token Cerulea APIs issued. The handler reads the Blueprint of the project
// on the server and asks the frontend engine inside Cerulea APIs for the
// generated application, the preview and the legal bindings. A save writes the
// edited Views section back into the Blueprint as a new version.
// The browser receives the answers and never holds the access token.
// Without this module the sub-step would call Cerulea APIs from the browser with the
// token in hand.

import {
  type CeruleaApiOptions,
  CeruleaApiError,
  readBlueprint,
  readDeploymentManifest,
  saveBlueprint,
} from '@/lib/cerulea-api';
import type { IntegrationItem } from '@/lib/manifest/types';
import { changeBuildState } from '@/app/api/projects/_shared/project-record';
import {
  checkInterface,
  generateInterface,
  readBindings,
  readComponentCatalogue,
  readPreview,
  readPreviewRoles,
} from './client';
import type {
  BindingChoice,
  ComponentCatalogue,
  EngineFault,
  GeneratedInterface,
  InterfaceSection,
  PreviewOutcome,
  PreviewRole,
} from './types';

/** Everything the Interface sub-step opens with, read in one pass. */
export type InterfaceWorkspace = {
  projectId: string;
  /** The Blueprint version the application was read from. */
  version: number;
  /** The content address of that version. */
  blueprintHash: string;
  /** True when the Blueprint holds a section a person saved. False when the engine generated it on this read. */
  authored: boolean;
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

/** The answer a save gives. */
export type InterfaceSaveOutcome = {
  version: number;
  blueprintHash: string;
  created: boolean;
  faults: EngineFault[];
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

/** The Views section the Blueprint already holds, when a person saved one. */
export function storedSection(document: unknown): InterfaceSection | null {
  if (document === null || typeof document !== 'object') return null;
  const held = (document as { interface?: unknown }).interface;
  if (held === null || held === undefined || typeof held !== 'object') return null;
  const section = held as Partial<InterfaceSection>;
  return Array.isArray(section.screens) ? (held as InterfaceSection) : null;
}

/**
 * Reads the application of one project.
 *
 * The Blueprint stays the one source. When a person saved the Views section,
 * that section opens, checked by the engine against the model. Otherwise the
 * engine generates the screens from the model, so a change in Data schema
 * reaches the builder on the next open.
 */
export async function readInterfaceWorkspace(
  projectId: string,
  selector: { version?: number },
  options: CeruleaApiOptions,
): Promise<InterfaceWorkspace> {
  const held = await readBlueprint(projectId, { version: selector.version }, options);
  const stored = storedSection(held.document);
  const [generated, catalogue, roles, manifest, checked] = await Promise.all([
    generateInterface({ document: held.document }, options),
    readComponentCatalogue(options),
    readPreviewRoles({ document: held.document, ...(stored ? { section: stored } : {}) }, options),
    readDeploymentManifest(projectId, { view: 'atomic', version: held.version }, options).catch(
      (cause: unknown) => ({ unread: cause instanceof Error ? cause.message : String(cause) }),
    ),
    stored === null
      ? Promise.resolve<{ faults: EngineFault[] } | null>(null)
      : checkInterface({ document: held.document, section: stored }, options),
  ]);
  const unread = typeof manifest.unread === 'string' ? manifest.unread : '';
  return {
    projectId,
    version: held.version,
    blueprintHash: held.blueprintHash,
    authored: stored !== null,
    generated:
      stored === null
        ? generated
        : { section: stored, omissions: generated.omissions, faults: checked?.faults ?? [] },
    catalogue,
    roles: roles.roles,
    endpoints: unread.length > 0 ? [] : endpointsOf(manifest),
    endpointsNote:
      unread.length > 0 ? `Cerulea read no endpoint list for this version. ${unread}` : '',
  };
}

/**
 * Writes the edited Views section into the Blueprint.
 *
 * The engine checks the section against the model first. A fault stops the
 * save and comes back with its fix, so the Blueprint never holds a screen the
 * engine refuses. A clean section lands as a new Blueprint version, and the
 * build state records that the application is authored.
 */
export async function saveInterfaceSection(
  projectId: string,
  input: { section: InterfaceSection; expectedVersion?: number },
  options: CeruleaApiOptions,
): Promise<InterfaceSaveOutcome> {
  const held = await readBlueprint(projectId, {}, options);
  if (input.expectedVersion !== undefined && input.expectedVersion !== held.version) {
    throw new CeruleaApiError(
      {
        code: 'interface.version_moved',
        message: `The Blueprint moved to version ${held.version} while this screen held version ${input.expectedVersion}.`,
        fix: 'Open the Interface sub-step again to read the newest version, then make the change again.',
        details: { held: held.version, expected: input.expectedVersion },
      },
      409,
    );
  }
  const checked = await checkInterface({ document: held.document, section: input.section }, options);
  if (checked.faults.length > 0) {
    throw new CeruleaApiError(
      {
        code: 'interface.faults',
        message: `The engine found ${checked.faults.length} correction${checked.faults.length === 1 ? '' : 's'} to make before the screens save.`,
        fix: checked.faults[0] ? `${checked.faults[0].screen}, ${checked.faults[0].component}: ${checked.faults[0].fix}` : 'Make the corrections the builder lists.',
        details: { faults: checked.faults },
      },
      400,
    );
  }
  const document = { ...(held.document as Record<string, unknown>), interface: input.section };
  const saved = await saveBlueprint(
    projectId,
    { document, note: 'Interface authored in Studio', expectedVersion: held.version },
    options,
  );
  await changeBuildState(projectId, options, (state) => {
    state.steps.interfaceAuthoring = true;
  });
  return {
    version: saved.blueprint.version,
    blueprintHash: saved.blueprint.blueprintHash,
    created: saved.created,
    faults: [],
  };
}

/**
 * Removes the authored Views section, so the engine generates the screens from
 * the model again on the next open.
 */
export async function resetInterfaceSection(
  projectId: string,
  options: CeruleaApiOptions,
): Promise<InterfaceSaveOutcome> {
  const held = await readBlueprint(projectId, {}, options);
  const document = { ...(held.document as Record<string, unknown>), interface: null };
  const saved = await saveBlueprint(
    projectId,
    { document, note: 'Interface returned to the generated screens', expectedVersion: held.version },
    options,
  );
  return {
    version: saved.blueprint.version,
    blueprintHash: saved.blueprint.blueprintHash,
    created: saved.created,
    faults: [],
  };
}

/** Renders the application of one project as one role, at one width, in one mode. */
export async function readInterfacePreview(
  projectId: string,
  request: PreviewRequest & { section?: InterfaceSection },
  options: CeruleaApiOptions,
): Promise<PreviewOutcome> {
  const held = await readBlueprint(projectId, {}, options);
  const section = request.section ?? storedSection(held.document) ?? undefined;
  return readPreview({ document: held.document, ...request, ...(section ? { section } : {}) }, options);
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
