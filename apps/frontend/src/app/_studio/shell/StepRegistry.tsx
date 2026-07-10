// StepRegistry.tsx
// Registry of steps for the Studio shell.
// Each entry provides a lazy loader so the shell can dynamically import it.

export type StepMeta = {
  id: number;
  label: string;
  path: 'dapp' | 'blockchain' | 'common';
  // Must return a dynamic import promise for the step module
  loader: () => Promise<any>;
};

// NOTE: Step 1 is 'common' so BOTH paths include it.
export const STEP_REGISTRY: StepMeta[] = [
  {
    id: 0,
    label: 'Project Foundation',
    path: 'common',
    loader: () => import('@/components/studio/steps/step0'),
  },
  {
    id: 1,
    label: 'Application Blueprint',
    path: 'common',
    loader: () => import('@/components/studio/steps/step1'),
  },
  {
    id: 2,
    label: '',
    path: 'common',
    loader: () => import('@/components/studio/steps/step2'),
  },
  {
    id: 3,
    label: '',
    path: 'common',
    loader: () => import('@/components/studio/steps/step3'),
  },
  {
    id: 4,
    label: '',
    path: 'common',
    loader: () => import('@/components/studio/steps/step4'),
  },
  /*{
    id: 5,
    label: '',
    path: 'common',
    loader: () => import('@/components/studio/steps/step5'),
  }, */
  {
    id: 5,
    label: '',
    path: 'common',
    loader: () => import('@/components/studio/steps/step6'),
  },

  // Add more steps here as you build them; prefer 'common' unless truly path-specific.
];

// ─── AI KNOWLEDGE ENFORCEMENT ─────────────────────────────────────────────────
// STUDIO_STEP_IDS is the canonical list of step IDs that exist in this Studio.
// ui-element-map.ts is typed as Record<StudioStepId, ...>, so TypeScript will
// error there if you add a new ID here but forget to document the step's UI.
// WHEN ADDING A STEP: add its id here AND add a full entry in ui-element-map.ts.
export const STUDIO_STEP_IDS = [0, 1, 2, 3, 4, 5] as const;
export type StudioStepId = typeof STUDIO_STEP_IDS[number];
// ──────────────────────────────────────────────────────────────────────────────

// Back-compat alias for code that still imports ALL_STEPS
export const ALL_STEPS = STEP_REGISTRY;

// Helpers used by StudioHeader and StudioFooter
export const TOTAL_STEPS = STEP_REGISTRY.length;
export function getStepLabel(step: number): string {
  return STEP_REGISTRY[step - 1]?.label || `Step ${step}`;
}

