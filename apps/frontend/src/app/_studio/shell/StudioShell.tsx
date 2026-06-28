'use client';

import React, { Component, ErrorInfo, useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ALL_STEPS, StepMeta } from './StepRegistry';
import StudioSidebar from './StudioSidebar';
import { useStudio } from '@/context/StudioContext';
import { useAutoSave } from '@/lib/useAutoSave';
import dynamic from 'next/dynamic';

const SmartContractsScreen = dynamic(() => import('@/components/SmartContractsScreen'), { ssr: false });

/* ---- Error Boundary ---- */
class StepErrorBoundary extends Component<
  { children: React.ReactNode; stepLabel: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[StudioShell] Step render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Something went wrong loading "{this.props.stepLabel}"
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </Typography>
          <Button variant="outlined" onClick={() => this.setState({ hasError: false })}>
            Retry
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

/* Props passed to each step component */
export type StepProps = {
  goNext: () => void;
  goPrev: () => void;
  projectId: string | null;
  onSubStepChange?: (subStepIndex: number) => void;
};

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
        Step "{meta.label}" isn't exporting a React component
      </Typography>
      <Typography sx={{ mb: 1 }}>
        <code>export default function YourStep() {'{'} return (&lt;.../&gt;); {'}'}</code>
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, monospace' }}>
        Module export keys: {JSON.stringify(Object.keys(mod || {}), null, 2)}
      </Typography>
    </Paper>
  );
}

function makeLazy(meta: StepMeta): React.LazyExoticComponent<React.ComponentType<StepProps>> {
  return React.lazy(async (): Promise<{ default: React.ComponentType<StepProps> }> => {
    try {
      const mod = await meta.loader();
      const candidates: any[] = [
        mod?.default, mod?.Page, mod?.Component, mod?.Step, ...Object.values(mod ?? {}),
      ];
      let picked = candidates.find(isComponentType);
      if (!picked && React.isValidElement(mod?.default)) {
        const node = mod.default as React.ReactElement;
        picked = function WrappedNode() { return node; };
      }
      if (!picked) return { default: () => <BrokenStep meta={meta} mod={mod} /> };
      return { default: picked as React.ComponentType<any> };
    } catch {
      return {
        default: () => (
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'error.main' }}>
            <Typography variant="h6" color="error" gutterBottom>Failed to load step "{meta.label}"</Typography>
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

  const currentWorkflow = useMemo(() => {
    const commons = ALL_STEPS.filter((s) => s.path === 'common');
    if (!projectType) return commons.length ? commons : [ALL_STEPS[0]];
    return ALL_STEPS.filter((s) => s.path === projectType || s.path === 'common');
  }, [projectType]);

  const [stepIndex, setStepIndex] = useState(() =>
    Math.max(0, Math.min(initialStep, currentWorkflow.length - 1))
  );
  const [subStepIndex, setSubStepIndex] = useState(0);
  const [projectId] = useState<string | null>(initialProjectId);
  const [contractsOpen, setContractsOpen] = useState(false);

  useEffect(() => {
    if (stepIndex > currentWorkflow.length - 1) {
      setStepIndex(Math.max(0, currentWorkflow.length - 1));
    }
  }, [currentWorkflow.length, stepIndex]);

  // Reset sub-step when advancing beyond step 0
  useEffect(() => {
    if (stepIndex > 0) setSubStepIndex(0);
  }, [stepIndex]);

  const TOTAL_STEPS = currentWorkflow.length;
  const step = currentWorkflow[stepIndex];
  const StepView = useMemo(() => makeLazy(step), [step]);

  const goPrev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setStepIndex((i) => Math.min(TOTAL_STEPS - 1, i + 1)), [TOTAL_STEPS]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

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
    stepCode: 'project',
    data: projectSnapshot,
  });

  const statusText =
    status === 'saving' ? 'Saving…'
    : status === 'saved' ? 'Saved'
    : status === 'error' ? 'Save failed'
    : 'Idle';

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      top: 64,
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      overflow: 'hidden',
    }}>
      {/* Smart Contracts overlay */}
      {contractsOpen && (
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 1400,
          bgcolor: 'background.default', overflow: 'auto',
        }}>
          <SmartContractsScreen
            onClose={() => setContractsOpen(false)}
            onGoToBlueprint={() => { setContractsOpen(false); setStepIndex(1); }}
          />
        </Box>
      )}

      {/* Main layout — sidebar + content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <StudioSidebar
          stepIndex={stepIndex}
          subStepIndex={subStepIndex}
          projectType={projectType ?? null}
          onStepChange={setStepIndex}
          onSmartContractsOpen={() => setContractsOpen((o) => !o)}
          smartContractsActive={contractsOpen}
        />

        {/* Step content area */}
        <Box sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <StepErrorBoundary stepLabel={step.label || `Step ${stepIndex + 1}`}>
            <Suspense fallback={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">Loading…</Typography>
              </Box>
            }>
              <StepView
                goNext={goNext}
                goPrev={goPrev}
                projectId={projectId}
                onSubStepChange={setSubStepIndex}
              />
            </Suspense>
          </StepErrorBoundary>
        </Box>
      </Box>


      {/* Autosave indicator */}
      <Box sx={{
        position: 'fixed',
        bottom: 10,
        right: 20,
        zIndex: 1200,
      }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
          {statusText}
        </Typography>
      </Box>
    </Box>
  );
}
