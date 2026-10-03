// apps/frontend/src/app/api/projects/_shared/project-record.ts
// The project record the production Studio screens read, built from Cerulea APIs.
// The project itself lives in Cerulea APIs. The division comes from the
// application of its workspace. The track, the template and every step draft
// live in the Studio build state of the project.
// Without this module each project route would assemble the record its own way.

import {
  type BuildState,
  type CeruleaApiOptions,
  type CeruleaProject,
  CeruleaApiError,
  readBuildState,
  saveBuildState,
} from '@/lib/cerulea-api';
import {
  type Division,
  divisionForApplication,
  divisionForProject,
  lockedProjectType,
} from '@/config/divisions';

/** The build state with the draft area, keyed `<step>::<name>`. */
export type DraftedBuildState = BuildState & { drafts?: Record<string, unknown> };

export type HeldBuildState = {
  buildState: DraftedBuildState;
  rowVersion: number;
  drafts: Record<string, unknown>;
};

/** The draft keys the production screens write through their own routes. */
export const DRAFT_KEYS = {
  graph: 'blueprint::graph',
  schema: 'step2::schema',
  logic: 'step2::logic',
  economics: 'step3::economics',
  integrations: 'step4::integrations',
  ui: 'step5::ui',
} as const;

/** The longest draft key the build state accepts. */
export const DRAFT_KEY_LIMIT = 160;

/** The longest identifier a build state list accepts. */
const IDENTIFIER_LIMIT = 160;

function draftArea(state: DraftedBuildState): Record<string, unknown> {
  const area = state.drafts;
  return area && typeof area === 'object' && !Array.isArray(area) ? area : {};
}

/** Reads the build state of one project with its draft area. */
export async function readHeldBuildState(
  projectId: string,
  options: CeruleaApiOptions,
): Promise<HeldBuildState> {
  const held = await readBuildState(projectId, options);
  const buildState = held.buildState as DraftedBuildState;
  return { buildState, rowVersion: held.rowVersion, drafts: draftArea(buildState) };
}

/** The failure a save reports when Cerulea APIs drops the draft area. */
export function draftsAbsent(projectId: string, keys: string[]): CeruleaApiError {
  return new CeruleaApiError(
    {
      code: 'build_state.drafts_absent',
      message:
        'The running Cerulea APIs keeps no draft area in the build state. The step work stays unsaved.',
      fix: 'Restart Cerulea APIs at a version whose build state holds the drafts field, then save again.',
      details: { projectId, keys },
    },
    502,
  );
}

/**
 * Saves of one project run one after another inside this server.
 * Each save reads the whole build state and writes it back, so two steps
 * saving together would otherwise overwrite each other.
 */
const saveQueues = new Map<string, Promise<unknown>>();

function inTurn<T>(projectId: string, work: () => Promise<T>): Promise<T> {
  const before = saveQueues.get(projectId) ?? Promise.resolve();
  const next = before.catch(() => undefined).then(work);
  const settled = next.catch(() => undefined);
  saveQueues.set(projectId, settled);
  void settled.then(() => {
    if (saveQueues.get(projectId) === settled) saveQueues.delete(projectId);
  });
  return next;
}

/**
 * Changes the build state of one project and writes the whole document back.
 * The change receives a copy and may set drafts, Foundation fields or the
 * compose module list. Every draft key named in `expectedKeys` must come back
 * in the saved document. When Cerulea APIs dropped one, the save reports it.
 */
export function changeBuildState(
  projectId: string,
  options: CeruleaApiOptions,
  change: (state: DraftedBuildState, drafts: Record<string, unknown>) => void,
  expectedKeys: string[] = [],
): Promise<HeldBuildState> {
  return inTurn(projectId, async () => {
    const held = await readHeldBuildState(projectId, options);
    const next = structuredClone(held.buildState);
    const drafts = { ...draftArea(next) };
    change(next, drafts);
    if (expectedKeys.length > 0 || Object.keys(drafts).length > 0) next.drafts = drafts;
    const saved = await saveBuildState(projectId, next, options);
    const returned = saved.buildState as DraftedBuildState;
    const area = draftArea(returned);
    const missing = expectedKeys.filter((key) => !Object.prototype.hasOwnProperty.call(area, key));
    if (missing.length > 0) throw draftsAbsent(projectId, missing);
    return { buildState: returned, rowVersion: saved.rowVersion, drafts: area };
  });
}

/** Writes one draft under its key. A null value stands for an empty draft. */
export function writeDraft(
  projectId: string,
  key: string,
  value: unknown,
  options: CeruleaApiOptions,
): Promise<HeldBuildState> {
  return changeBuildState(
    projectId,
    options,
    (_state, drafts) => {
      drafts[key] = value === undefined ? null : value;
    },
    [key],
  );
}

/** Reads the module identifiers a canvas graph carries, in order and once each. */
export function moduleIdsOf(body: Record<string, unknown>): string[] {
  const found: string[] = [];
  const modules = Array.isArray(body.modules) ? body.modules : [];
  for (const entry of modules) {
    const id = entry && typeof entry === 'object' ? (entry as { moduleId?: unknown }).moduleId : null;
    if (typeof id === 'string') found.push(id);
  }
  if (found.length === 0) {
    const graph = body.graph && typeof body.graph === 'object' ? (body.graph as { nodes?: unknown }) : {};
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    for (const node of nodes) {
      const data = node && typeof node === 'object' ? (node as { data?: unknown }).data : null;
      const id = data && typeof data === 'object' ? (data as { moduleId?: unknown }).moduleId : null;
      if (typeof id === 'string') found.push(id);
    }
  }
  return Array.from(new Set(found.filter((id) => id.length > 0 && id.length <= IDENTIFIER_LIMIT)));
}

/** The status word the production screens read for each Cerulea project state. */
export function statusForState(state: string): string {
  switch (state) {
    case 'draft':
      return 'draft';
    case 'building':
      return 'deploying';
    case 'deployed':
      return 'active';
    default:
      return state;
  }
}

export type ProjectRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  projectType: 'dapp' | 'blockchain';
  workspaceId: string;
  status: string;
  division: Division;
  selectedTemplateIds: string[];
  headVersion: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Builds the record the production screens read.
 * A project whose build state was never saved takes the type its division locks.
 */
export function projectRecord(
  project: CeruleaProject,
  application: string | null | undefined,
  held: { buildState: BuildState; rowVersion: number },
): ProjectRecord {
  const foundation = held.buildState.foundation;
  const workspaceDivision = divisionForApplication(application);
  const projectType =
    held.rowVersion > 0
      ? foundation.track
      : ((workspaceDivision ? lockedProjectType(workspaceDivision) : null) ?? foundation.track);
  const selectedTemplateIds = foundation.templateId ? [foundation.templateId] : [];
  return {
    id: project.projectId,
    name: project.name,
    slug: project.slug,
    description: project.summary,
    projectType,
    workspaceId: project.workspaceId,
    status: statusForState(project.state),
    division: workspaceDivision ?? divisionForProject(projectType, selectedTemplateIds),
    selectedTemplateIds,
    headVersion: project.headVersion,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/** Reads a JSON body as a plain object, or null. */
export async function objectBody(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}
