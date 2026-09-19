// apps/frontend/src/lib/studio/project-state.ts
// The state every Studio step reads and writes.
// One project holds a Blueprint and a build state. A step reads both, changes
// one of them and saves. Cerulea APIs holds both, so the work survives a
// closed browser.
// Without this module each step would invent its own persistence.

'use client';

import { useCallback, useEffect, useState } from 'react';

import { StudioRouteError, api } from '@/lib/apiClient';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import type { Blueprint } from '@/lib/blueprint/types';

export type ExecutionSubstrateName = 'Native' | 'WebAssembly' | 'EthereumVirtualMachine';

export type BuildState = {
  version: 1;
  foundation: {
    projectName: string;
    summary: string;
    application: 'dapps' | 'enterprise' | 'government';
    track: 'dapp' | 'blockchain';
    trackOverridden: boolean;
    templateId: string;
    publishSelectedRecords: boolean;
    blockSeconds: number;
    historyRetentionDays: number;
  };
  compose: {
    outcomeIds: string[];
    moduleIds: string[];
    removedModuleIds: string[];
    chosenLinks: { kind: 'feeds' | 'triggers'; from: string; to: string }[];
  };
  policies: {
    answers: {
      confirmationPreference?: 'instant' | 'balanced' | 'certain';
      organisationCount?: number;
      wrongRecordCost?: 'low' | 'moderate' | 'high' | 'severe';
      serveDuringSplit?: boolean;
      provableYears?: number;
    };
    chosenProfileId: string;
  };
  execution: { substrate: ExecutionSubstrateName; reason: string };
  steps: {
    foundation: boolean;
    compose: boolean;
    model: boolean;
    policies: boolean;
    interfaceAuthoring: boolean;
    verify: boolean;
  };
  wizardComplete: boolean;
  wizardCompletedAt: string;
};

export type ProjectState = {
  projectId: string;
  project: { projectId: string; name: string; summary: string; state: string; headVersion: number };
  blueprint: Blueprint;
  blueprintVersion: number;
  buildState: BuildState;
};

export type SaveFailure = { message: string; fix: string };

/** Turns any failure into the message and the fix a step shows. */
export function describeSaveFailure(cause: unknown): SaveFailure {
  if (cause instanceof StudioRouteError) {
    return { message: cause.message.replace(` ${cause.fix}`, ''), fix: cause.fix };
  }
  return {
    message: cause instanceof Error ? cause.message : String(cause),
    fix: 'Save again. Report the problem to the Cerulea operator when it repeats.',
  };
}

/** Reads one project with its Blueprint and its build state. */
export async function readProjectState(projectId: string): Promise<ProjectState> {
  const [projectReply, blueprintReply, buildReply] = await Promise.all([
    api<{ project: ProjectState['project'] }>(`/api/projects/${encodeURIComponent(projectId)}`),
    api<{ version: number; document: unknown }>(
      `/api/projects/${encodeURIComponent(projectId)}/blueprint`,
    ),
    api<{ buildState: BuildState }>(
      `/api/projects/${encodeURIComponent(projectId)}/build-state`,
    ),
  ]);
  return {
    projectId,
    project: projectReply.project,
    blueprint: readBlueprintDocument(blueprintReply.document, projectReply.project.name),
    blueprintVersion: blueprintReply.version,
    buildState: buildReply.buildState,
  };
}

/** Saves the Blueprint of one project and answers with the new version. */
export async function writeBlueprint(
  projectId: string,
  document: Blueprint,
  note: string,
  expectedVersion: number,
): Promise<number> {
  const outcome = await api<{ blueprint: { version: number } }>(
    `/api/projects/${encodeURIComponent(projectId)}/blueprint`,
    { method: 'PUT', body: JSON.stringify({ document, note, expectedVersion }) },
  );
  return outcome.blueprint.version;
}

/** Saves the build state of one project. */
export async function writeBuildState(
  projectId: string,
  buildState: BuildState,
): Promise<BuildState> {
  const outcome = await api<{ buildState: BuildState }>(
    `/api/projects/${encodeURIComponent(projectId)}/build-state`,
    { method: 'PUT', body: JSON.stringify({ buildState }) },
  );
  return outcome.buildState;
}

export type ProjectStateHandle = {
  state: ProjectState | null;
  loading: boolean;
  saving: boolean;
  failure: SaveFailure | null;
  savedAt: string | null;
  readAgain: () => void;
  saveBlueprint: (next: Blueprint, note: string) => Promise<boolean>;
  saveBuildState: (next: BuildState) => Promise<boolean>;
};

/** Holds one project open across a step, reading once and saving on request. */
export function useProjectState(projectId: string): ProjectStateHandle {
  const [state, setState] = useState<ProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      setState(await readProjectState(projectId));
      setFailure(null);
    } catch (cause) {
      setFailure(describeSaveFailure(cause));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  const saveBlueprint = useCallback(
    async (next: Blueprint, note: string) => {
      if (!state) return false;
      setSaving(true);
      setFailure(null);
      try {
        const version = await writeBlueprint(projectId, next, note, state.blueprintVersion);
        setState({ ...state, blueprint: next, blueprintVersion: version });
        setSavedAt(new Date().toISOString());
        return true;
      } catch (cause) {
        setFailure(describeSaveFailure(cause));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [projectId, state],
  );

  const saveBuildState = useCallback(
    async (next: BuildState) => {
      if (!state) return false;
      setSaving(true);
      setFailure(null);
      try {
        const held = await writeBuildState(projectId, next);
        setState({ ...state, buildState: held });
        setSavedAt(new Date().toISOString());
        return true;
      } catch (cause) {
        setFailure(describeSaveFailure(cause));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [projectId, state],
  );

  return {
    state,
    loading,
    saving,
    failure,
    savedAt,
    readAgain: () => void read(),
    saveBlueprint,
    saveBuildState,
  };
}
