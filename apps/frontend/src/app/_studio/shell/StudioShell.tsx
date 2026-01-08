'use client';

import React, { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { Box, Container, Stack, Typography, Paper } from '@mui/material';
import { ALL_STEPS, StepMeta } from './StepRegistry';
import { useStudio } from '@/context/StudioContext';
import { useAutoSave } from '@/lib/useAutoSave';

// Props passed to each step component
type StepProps = {
  goNext: () => void;
  goPrev: () => void;
  projectId: string | null;
};

// Utility to detect a React component export
const isComponentType = (x: any): x is React.ComponentType<any> =>
  typeof x === 'function' ||
  (x &&
    typeof x === 'object' &&
    (x.$$typeof === (Symbol as any).for('react.memo') ||
      x.$$typeof === (Symbol as any).for('react.forward_ref')));

function BrokenStep({ meta, mod }: { meta: StepMeta; mod: any }) {
  return (
    <Paper sx={{ p: 2, border: '1px solid', borderColor: 'error.main', background: (t) => t.palette.error.light + '22' }}>
      <Typography variant="h6" color="error" gutterBottom>
        Step “{meta.label}” isn’t exporting a React component
      </Typography>
      <Typography sx={{ mb: 1 }}>
        File loaded for this step, but no component export was found.
        <br />
        Add <code>export default function YourStep() {'{'} return (&lt;.../&gt;); {'}'}</code>
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, monospace' }}>
        Module export keys: {JSON.stringify(Object.keys(mod || {}), null, 2)}
      </Typography>
    </Paper>
  );
}

// Lazy wrapper that uses StepMeta.loader()
function makeLazy(meta: StepMeta): React.LazyExoticComponent<React.ComponentType<StepProps>> {
  return React.lazy(async () => {
    try {
      const mod = await meta.loader();
      const candidates: any[] = [
        mod?.default,
        mod?.Page,
        mod?.Component,
        mod?.Step,
        ...Object.values(mod ?? {}),
      ];
      let picked = candidates.find(isComponentType);
      if (!picked && React.isValidElement(mod?.default)) {
        const node = mod.default as React.ReactElement;
        picked = function WrappedNode() {
          return node;
        };
      }
      if (!picked) return { default: () => <BrokenStep meta={meta} mod={mod} /> };
      return { default: picked as React.ComponentType<any> };
    } catch {
      return {
        default: () => (
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'error.main' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Failed to load step “{meta.label}”
            </Typography>
            <Typography variant="body2">Check the import path in StepRegistry for this step.</Typography>
          </Paper>
        ),
      };
    }
  });
}

export default function StudioShell({
  initialStep = 0,
  initialProjectId = null,
}: {
  initialStep?: number;
  initialProjectId?: string | null;
}) {
  const studio = useStudio();
  const { projectType } = studio;

  // Build the workflow:
  // If projectType is not chosen yet, show only 'common' steps
  const currentWorkflow = useMemo(() => {
    const commons = ALL_STEPS.filter((s) => s.path === 'common');
    if (!projectType) return commons.length ? commons : [ALL_STEPS[0]];
    return ALL_STEPS.filter((s) => s.path === projectType || s.path === 'common');
  }, [projectType]);

  const [stepIndex, setStepIndex] = useState(() =>
    Math.max(0, Math.min(initialStep, currentWorkflow.length - 1))
  );
  const [projectId] = useState<string | null>(initialProjectId);

  // Clamp index if workflow changes
  useEffect(() => {
    if (stepIndex > currentWorkflow.length - 1) {
      setStepIndex(Math.max(0, currentWorkflow.length - 1));
    }
  }, [currentWorkflow.length, stepIndex]);

  const TOTAL_STEPS = currentWorkflow.length;
  const step = currentWorkflow[stepIndex];
  const StepView = useMemo(() => makeLazy(step), [step]);

  // Navigation (no shell buttons; kept for page-level use + keyboard)
  const goPrev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(TOTAL_STEPS - 1, i + 1)),
    [TOTAL_STEPS]
  );

  // Keyboard nav remains (hint is shown in footer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // Autosave snapshot (unchanged)
  const projectSnapshot = useMemo(
    () => ({
      ...studio,
      selectedModules: (studio as any).selectedModules || [],
      logicFlow: (studio as any).logicFlow || {},
      customDataSchemas: (studio as any).customDataSchemas || [],
      accessControls: (studio as any).accessControls || {},
      tokenomics: (studio as any).tokenomics || {},
      aiConfigs: (studio as any).aiConfigs || [],
      uiBuilder: (studio as any).uiBuilder || {},
      __v: 1,
    }),
    [studio]
  );

  const { status } = useAutoSave({
    projectId: projectId ?? 'local',
    bucket: 'project',
    data: projectSnapshot,
    onRestore: (d) => {
      const set = (studio as any).setStudioState;
      if (!set || !d) return;
      if (d.appMetadata) set({ appMetadata: d.appMetadata });
      if (d.appGoal) set({ appGoal: d.appGoal });
    },
  });

  const statusText =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
      ? 'Saved'
      : status === 'error'
      ? 'Save failed'
      : 'Idle';

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="xl" sx={{ flex: 1, py: 3, display: 'flex', flexDirection: 'column' }}>
        {/* Keep a lightweight step header; pages own Back/Next inside themselves */}
        <Stack sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            STEP {stepIndex + 1} OF {TOTAL_STEPS}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {step.label}
          </Typography>
        </Stack>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Suspense fallback={<Typography>Loading…</Typography>}>
            <StepView goNext={goNext} goPrev={goPrev} projectId={projectId} />
          </Suspense>
        </Box>
      </Container>

      <Box component="footer" sx={{ borderTop: (t) => `1px solid ${t.palette.divider}`, py: 1.5, px: 2, mt: 'auto' }}>
        <Container maxWidth="xl" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {statusText}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tip: use ← / → to navigate steps
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
