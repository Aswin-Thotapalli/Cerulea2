'use client';

// apps/frontend/src/context/StudioContext.tsx
// The state every Studio step reads and writes.
// The Blueprint is the single artefact Cerulea deploys. This context carries
// the Blueprint of the open project, the version Cerulea APIs holds, and the
// choices the steps have made so far.
// Without this context each step would read the project from the start again.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** The three applications one Studio codebase serves. */
export type CeruleaApplication = 'dapps' | 'enterprise' | 'government';

/** The two technical tracks a project runs on. */
export type ProjectTrack = 'dapp' | 'blockchain';

export interface AppMetadata {
  appName: string;
  appDescription: string;
  appLogoUrl?: string;
  faviconUrl?: string;
  socialImageUrl?: string;
  primaryColor?: string;
}

export interface StudioState {
  /** The project Cerulea APIs holds this work against. */
  projectId?: string;
  slug?: string;
  workspaceId?: string;
  application: CeruleaApplication;

  /** The Blueprint document Cerulea APIs last sent. */
  blueprint: unknown;
  /** The version number that document carries. */
  blueprintVersion: number;

  projectType: ProjectTrack | null;
  templateId: string | null;

  appMetadata: AppMetadata;

  /** The outcome statements the person selected. */
  selectedOutcomes: string[];
  /** The modules the outcome selection resolved to. */
  selectedModules: string[];
}

export interface StudioContextType extends StudioState {
  setStudioState: (next: Partial<StudioState>) => void;
}

export const initialStudioState: StudioState = {
  application: 'dapps',
  blueprint: null,
  blueprintVersion: 0,
  projectType: null,
  templateId: null,
  appMetadata: { appName: '', appDescription: '' },
  selectedOutcomes: [],
  selectedModules: [],
};

/** Applies one change over the state, merging the nested records rather than replacing them. */
export function mergeStudioState(previous: StudioState, next: Partial<StudioState>): StudioState {
  const merged = { ...previous, ...next };
  if (next.appMetadata) {
    merged.appMetadata = { ...previous.appMetadata, ...next.appMetadata };
  }
  return merged;
}

export const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<StudioState>(initialStudioState);

  const setStudioState = useCallback((next: Partial<StudioState>) => {
    setState((previous) => mergeStudioState(previous, next));
  }, []);

  const value = useMemo(() => ({ ...state, setStudioState }), [state, setStudioState]);

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export const useStudio = () => {
  const held = useContext(StudioContext);
  if (!held) {
    throw new Error(
      'This screen sits outside the Studio provider. Render it inside StudioProvider so it reads the open project.',
    );
  }
  return held;
};
