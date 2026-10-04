// apps/frontend/src/lib/studio/use-disclosure-level.ts
// The disclosure level of the open project, read from and written to the
// build state in Cerulea APIs.
// A project that exists carries its level in buildState.disclosureLevel, so a
// colleague opening the same project meets the same depth. A project that is
// still being founded has no build state yet; its level lives in memory and
// starts at the default for the division and the template.
// Without this hook the shell would hold the level in the browser alone.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/apiClient';
import {
  defaultLevel,
  readLevel,
  type DisclosureLevel,
} from '@/lib/studio/disclosure';
import { describeSaveFailure, type BuildState, type SaveFailure } from '@/lib/studio/project-state';

export type DisclosureLevelHandle = {
  level: DisclosureLevel;
  /** True once the stored level has been read, or at once when no project exists. */
  ready: boolean;
  saving: boolean;
  failure: SaveFailure | null;
  setLevel: (next: DisclosureLevel) => Promise<boolean>;
};

export function useDisclosureLevel(input: {
  projectId: string | null;
  division: 'dapp' | 'enterprise' | 'govt' | null | undefined;
  templateId: string | null | undefined;
}): DisclosureLevelHandle {
  const { projectId, division, templateId } = input;
  const [level, setHeld] = useState<DisclosureLevel>(() => defaultLevel({ division, templateId }));
  const [ready, setReady] = useState(projectId === null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const buildState = useRef<BuildState | null>(null);

  useEffect(() => {
    if (!projectId) {
      buildState.current = null;
      setHeld(defaultLevel({ division, templateId }));
      setReady(true);
      return;
    }
    let live = true;
    setReady(false);
    void api<{ buildState: BuildState }>(`/api/projects/${encodeURIComponent(projectId)}/build-state`)
      .then((reply) => {
        if (!live) return;
        buildState.current = reply.buildState;
        setHeld(readLevel(reply.buildState?.disclosureLevel));
        setFailure(null);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        // The build state is unreadable, so the shell shows the default depth
        // and names the fault; the level still changes in memory.
        setFailure(describeSaveFailure(cause));
        setHeld(defaultLevel({ division, templateId }));
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [projectId, division, templateId]);

  const setLevel = useCallback(
    async (next: DisclosureLevel) => {
      setHeld(next);
      if (!projectId || !buildState.current) return true;
      setSaving(true);
      setFailure(null);
      try {
        const reply = await api<{ buildState: BuildState }>(
          `/api/projects/${encodeURIComponent(projectId)}/build-state`,
          {
            method: 'PUT',
            body: JSON.stringify({ buildState: { ...buildState.current, disclosureLevel: next } }),
          },
        );
        buildState.current = reply.buildState;
        return true;
      } catch (cause) {
        setFailure(describeSaveFailure(cause));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [projectId],
  );

  return { level, ready, saving, failure, setLevel };
}
