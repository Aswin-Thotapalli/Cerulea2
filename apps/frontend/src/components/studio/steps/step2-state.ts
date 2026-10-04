'use client';

// apps/frontend/src/components/studio/steps/step2-state.ts
// The state of the Data schema step: one Blueprint draft, the two layouts and
// the autosave that writes them through Cerulea APIs.
// Every panel edits the same draft. A change marks the sections it touched.
// After a short pause the step writes the touched sections to the schema
// route, which merges them into the head Blueprint and answers with the new
// version. The layouts save beside the Blueprint in the draft area.
// Without this hook each panel would save on its own and overwrite the others.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { StudioRouteError, api } from '@/lib/apiClient';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import type { Blueprint, BlueprintSection } from '@/lib/blueprint/types';
import type { SchemaFault } from '@/lib/blueprint/validate';
import {
  emptyLogicLayout,
  emptySchemaLayout,
  type LogicLayout,
  type LogicReply,
  type SaveReply,
  type SchemaLayout,
  type SchemaReply,
} from './step2-types';

/** The sections the step owns, in the order the schema route takes them. */
export const STEP_SECTIONS: BlueprintSection[] = [
  'types',
  'collections',
  'identities',
  'permissions',
  'rules',
  'actions',
  'workflows',
  'events',
];

/** How long the step waits after the last edit before it saves. */
export const SAVE_DELAY_MS = 1200;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type StepFailure = {
  message: string;
  fix: string;
  faults: SchemaFault[];
};

export type SchemaStep = {
  loading: boolean;
  failure: StepFailure | null;
  status: SaveStatus;
  blueprint: Blueprint;
  version: number;
  track: 'dapp' | 'blockchain';
  moduleIds: string[];
  schemaLayout: SchemaLayout;
  logicLayout: LogicLayout;
  /** The number of unsaved edits waiting for the next save. */
  pending: number;
  change: (next: Blueprint) => void;
  changeSchemaLayout: (next: SchemaLayout | ((held: SchemaLayout) => SchemaLayout)) => void;
  changeLogicLayout: (next: LogicLayout | ((held: LogicLayout) => LogicLayout)) => void;
  /** Writes everything waiting, now. Answers true when the save landed. */
  saveNow: () => Promise<boolean>;
  /** Replaces the whole document, which is what the Blueprint level sends. */
  saveDocument: (document: Blueprint, note: string) => Promise<boolean>;
  readAgain: () => void;
};

/** Names the sections whose reference changed between two drafts. */
export function changedSections(before: Blueprint, after: Blueprint): BlueprintSection[] {
  return STEP_SECTIONS.filter((section) => before[section] !== after[section]);
}

function describeFailure(cause: unknown): StepFailure {
  if (cause instanceof StudioRouteError) {
    return {
      message: cause.message.replace(` ${cause.fix}`, ''),
      fix: cause.fix,
      faults: [],
    };
  }
  return {
    message: cause instanceof Error ? cause.message : String(cause),
    fix: 'Save again. Report the problem to the Cerulea operator when it repeats.',
    faults: [],
  };
}

/** Reads the faults a refused save named, so the strip lists each place. */
async function faultsOf(cause: unknown): Promise<SchemaFault[]> {
  if (cause instanceof StudioRouteError && cause.code === 'blueprint.document_faulty') {
    const held = cause.details.faults;
    if (Array.isArray(held)) return held as SchemaFault[];
  }
  return [];
}

export function useSchemaStep(projectId: string | null): SchemaStep {
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<StepFailure | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [blueprint, setBlueprint] = useState<Blueprint>(() => readBlueprintDocument({}, 'New system'));
  const [version, setVersion] = useState(0);
  const [track, setTrack] = useState<'dapp' | 'blockchain'>('dapp');
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [schemaLayout, setSchemaLayout] = useState<SchemaLayout>(emptySchemaLayout);
  const [logicLayout, setLogicLayout] = useState<LogicLayout>(emptyLogicLayout);
  const [pending, setPending] = useState(0);

  const dirty = useRef<{ sections: Set<BlueprintSection>; schemaLayout: boolean; logicLayout: boolean }>({
    sections: new Set(),
    schemaLayout: false,
    logicLayout: false,
  });
  const latest = useRef({ blueprint, version, schemaLayout, logicLayout });
  latest.current = { blueprint, version, schemaLayout, logicLayout };
  const saving = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const read = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      setFailure({
        message: 'This project has no identifier yet, so the Data schema has nowhere to save.',
        fix: 'Finish the Foundation step so Cerulea creates the project, then open this step again.',
        faults: [],
      });
      return;
    }
    setLoading(true);
    try {
      const [schema, logic] = await Promise.all([
        api<SchemaReply>(`/api/projects/${encodeURIComponent(projectId)}/schema`),
        api<LogicReply>(`/api/projects/${encodeURIComponent(projectId)}/logic`),
      ]);
      // The schema read may have seeded a version; the later of the two reads wins.
      const newest = schema.version >= logic.version ? schema : logic;
      setBlueprint(readBlueprintDocument(newest.document, 'New system'));
      setVersion(newest.version);
      setTrack(schema.track);
      setModuleIds(schema.moduleIds);
      setSchemaLayout(schema.layout);
      setLogicLayout(logic.layout);
      dirty.current = { sections: new Set(), schemaLayout: false, logicLayout: false };
      setPending(0);
      setFailure(null);
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  const write = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;
    const held = dirty.current;
    if (held.sections.size === 0 && held.schemaLayout === false && held.logicLayout === false) {
      return true;
    }
    const { blueprint: draft, version: expected, schemaLayout: layoutA, logicLayout: layoutB } =
      latest.current;
    const sections: Partial<Record<BlueprintSection, unknown>> = {};
    for (const section of held.sections) sections[section] = draft[section];
    const wroteSections = new Set(held.sections);
    const wroteSchemaLayout = held.schemaLayout;
    const wroteLogicLayout = held.logicLayout;
    dirty.current = { sections: new Set(), schemaLayout: false, logicLayout: false };
    setStatus('saving');
    try {
      let reply: SaveReply | null = null;
      if (wroteSections.size > 0 || wroteSchemaLayout) {
        reply = await api<SaveReply>(`/api/projects/${encodeURIComponent(projectId)}/schema`, {
          method: 'PUT',
          body: JSON.stringify({
            sections: wroteSections.size > 0 ? sections : undefined,
            expectedVersion: wroteSections.size > 0 ? expected : undefined,
            layout: wroteSchemaLayout ? layoutA : undefined,
            note: 'Changed the data schema',
          }),
        });
      }
      if (wroteLogicLayout) {
        reply = await api<SaveReply>(`/api/projects/${encodeURIComponent(projectId)}/logic`, {
          method: 'PUT',
          body: JSON.stringify({ layout: layoutB }),
        });
      }
      if (reply) setVersion(reply.version);
      setStatus('saved');
      setFailure(null);
      setPending(0);
      return true;
    } catch (cause) {
      // The edit stays waiting, so the next save carries it again.
      for (const section of wroteSections) dirty.current.sections.add(section);
      dirty.current.schemaLayout ||= wroteSchemaLayout;
      dirty.current.logicLayout ||= wroteLogicLayout;
      const described = describeFailure(cause);
      setFailure({ ...described, faults: await faultsOf(cause) });
      setStatus('failed');
      if (cause instanceof StudioRouteError && cause.code === 'projects.version_moved') {
        // Another screen moved the head. Read it, keep our sections, and save on the next pause.
        try {
          const head = await api<SchemaReply>(`/api/projects/${encodeURIComponent(projectId)}/schema`);
          setVersion(head.version);
          setBlueprint((ours) => {
            const theirs = readBlueprintDocument(head.document, 'New system');
            const merged = { ...theirs } as Blueprint;
            for (const section of dirty.current.sections) {
              (merged as unknown as Record<string, unknown>)[section] = ours[section];
            }
            return merged;
          });
        } catch {
          // The failure above already names the fix.
        }
      }
      return false;
    }
  }, [projectId]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current) await saving.current;
    const run = write();
    saving.current = run;
    const outcome = await run;
    saving.current = null;
    return outcome;
  }, [write]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void saveNow();
    }, SAVE_DELAY_MS);
  }, [saveNow]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const change = useCallback(
    (next: Blueprint) => {
      setBlueprint((held) => {
        for (const section of changedSections(held, next)) dirty.current.sections.add(section);
        return next;
      });
      setPending((count) => count + 1);
      setStatus('idle');
      schedule();
    },
    [schedule],
  );

  const changeSchemaLayout = useCallback(
    (next: SchemaLayout | ((held: SchemaLayout) => SchemaLayout)) => {
      setSchemaLayout((held) => (typeof next === 'function' ? next(held) : next));
      dirty.current.schemaLayout = true;
      setPending((count) => count + 1);
      schedule();
    },
    [schedule],
  );

  const changeLogicLayout = useCallback(
    (next: LogicLayout | ((held: LogicLayout) => LogicLayout)) => {
      setLogicLayout((held) => (typeof next === 'function' ? next(held) : next));
      dirty.current.logicLayout = true;
      setPending((count) => count + 1);
      schedule();
    },
    [schedule],
  );

  const saveDocument = useCallback(
    async (document: Blueprint, note: string): Promise<boolean> => {
      if (!projectId) return false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (saving.current) await saving.current;
      setStatus('saving');
      try {
        const reply = await api<SaveReply>(`/api/projects/${encodeURIComponent(projectId)}/schema`, {
          method: 'PUT',
          body: JSON.stringify({ document, expectedVersion: latest.current.version, note }),
        });
        setBlueprint(readBlueprintDocument(reply.document, 'New system'));
        setVersion(reply.version);
        dirty.current.sections.clear();
        setPending(0);
        setStatus('saved');
        setFailure(null);
        return true;
      } catch (cause) {
        setFailure({ ...describeFailure(cause), faults: await faultsOf(cause) });
        setStatus('failed');
        return false;
      }
    },
    [projectId],
  );

  return useMemo(
    () => ({
      loading,
      failure,
      status,
      blueprint,
      version,
      track,
      moduleIds,
      schemaLayout,
      logicLayout,
      pending,
      change,
      changeSchemaLayout,
      changeLogicLayout,
      saveNow,
      saveDocument,
      readAgain: () => void read(),
    }),
    [
      loading,
      failure,
      status,
      blueprint,
      version,
      track,
      moduleIds,
      schemaLayout,
      logicLayout,
      pending,
      change,
      changeSchemaLayout,
      changeLogicLayout,
      saveNow,
      saveDocument,
      read,
    ],
  );
}
