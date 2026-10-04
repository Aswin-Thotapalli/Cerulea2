'use client';

import React, { Component, ErrorInfo, useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ALL_STEPS, StepMeta } from './StepRegistry';
import StudioSidebar from './StudioSidebar';
import { useStudio } from '@/context/StudioContext';
import { useAutoSave } from '@/lib/useAutoSave';
import dynamic from 'next/dynamic';
import LevelSwitch from '@/components/studio/levels/LevelSwitch';
import { getClientDivision } from '@/lib/division-client';
import { STEP_DEPLOY, STEP_FOUNDATION, hiddenSteps, levelOpens, nearestOpenStep, type DisclosureLevel } from '@/lib/studio/disclosure';
import { useDisclosureLevel } from '@/lib/studio/use-disclosure-level';

const SmartContractsScreen = dynamic(() => import('@/components/SmartContractsScreen'), { ssr: false });
// The two level views the shell renders itself: the plain questions of level
// one in place of Foundation, and the typed document of level four over the steps.
const LevelOneTemplate = dynamic(() => import('@/components/studio/levels/LevelOneTemplate'), { ssr: false });
const LevelFourBlueprint = dynamic(() => import('@/components/studio/levels/LevelFourBlueprint'), { ssr: false });

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
            {`The ${this.props.stepLabel} step stopped while it loaded.`}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Press Retry to load the step again. Report the message below to the Cerulea operator when it repeats.
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
  /** The disclosure level the shell shows: 1 Template, 2 Outcomes, 3 Designer, 4 Blueprint. */
  disclosureLevel?: DisclosureLevel;
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
        {`The ${meta.label} step module holds no screen.`}
      </Typography>
      <Typography sx={{ mb: 1 }}>
        The step module needs a default export holding a React component. The export names it holds follow.
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
            <Typography variant="h6" color="error" gutterBottom>{`The ${meta.label} step failed to load.`}</Typography>
            <Typography variant="body2">Open the project again. The step registry names the module path for each step.</Typography>
          </Paper>
        ),
      };
    }
  });
}

export default function StudioShell({
  initialStep = 0,
  initialProjectId = null,
  onShowProjects,
}: {
  initialStep?: number;
  initialProjectId?: string | null;
  onShowProjects?: () => void;
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
  const [documentOpen, setDocumentOpen] = useState(false);

  // The disclosure level (specification 11.6). It lives in the build state of
  // the project through Cerulea APIs; a project still being founded holds it
  // in memory at the default for its division and template.
  const disclosure = useDisclosureLevel({
    projectId,
    division: typeof window === 'undefined' ? null : getClientDivision(),
    templateId: (studio as { templateId?: string | null }).templateId ?? null,
  });
  const level = disclosure.level;
  const withheld = useMemo(() => hiddenSteps(level), [level]);

  useEffect(() => {
    if (stepIndex > currentWorkflow.length - 1) {
      setStepIndex(Math.max(0, currentWorkflow.length - 1));
    }
  }, [currentWorkflow.length, stepIndex]);

  // Reset sub-step when advancing beyond step 0
  useEffect(() => {
    if (stepIndex > 0) setSubStepIndex(0);
  }, [stepIndex]);

  // A level that withholds the open step moves the person to the nearest open one.
  useEffect(() => {
    if (!disclosure.ready) return;
    const open = nearestOpenStep(level, stepIndex);
    if (open !== stepIndex) setStepIndex(open);
    if (!levelOpens(level, 'document')) setDocumentOpen(false);
  }, [level, stepIndex, disclosure.ready]);

  const TOTAL_STEPS = currentWorkflow.length;
  const step = currentWorkflow[stepIndex];
  const StepView = useMemo(() => makeLazy(step), [step]);

  // Previous and next move through the steps the level opens.
  const goPrev = useCallback(() => setStepIndex((i) => {
    let next = i - 1;
    while (next >= 0 && withheld.includes(next)) next -= 1;
    return Math.max(0, next < 0 ? i : next);
  }), [withheld]);
  const goNext = useCallback(() => setStepIndex((i) => {
    let next = i + 1;
    while (next <= TOTAL_STEPS - 1 && withheld.includes(next)) next += 1;
    return next > TOTAL_STEPS - 1 ? i : next;
  }), [TOTAL_STEPS, withheld]);

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

  // The snapshot autosaves to this browser and to the drafts area of the Studio
  // build state in Cerulea APIs, so a project reopens where the person left it
  // on any machine. A project without an identifier stays in this browser.
  const remoteDraft = useMemo(
    () =>
      projectId
        ? {
            url: '/api/drafts',
            method: 'POST' as const,
            body: (data: typeof projectSnapshot) => ({ projectId, bucket: 'shell::project', data }),
          }
        : null,
    [projectId]
  );

  const { status } = useAutoSave({
    projectId: projectId ?? 'local',
    stepCode: 'project',
    data: projectSnapshot,
    debounceMs: 1200,
    remote: remoteDraft,
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
          onShowProjects={onShowProjects}
          hiddenSteps={withheld}
        />

        {/* Step content area */}
        <Box sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* The level switch, in the place of the production track bar */}
          <LevelSwitch
            level={level}
            saving={disclosure.saving}
            onLevelChange={(next) => void disclosure.setLevel(next)}
            onOpenDocument={projectId ? () => setDocumentOpen((o) => !o) : undefined}
            documentOpen={documentOpen}
          />
          {disclosure.failure && (
            <Typography variant="caption" color="error" sx={{ px: 2, py: 0.5 }}>
              {disclosure.failure.message} {disclosure.failure.fix}
            </Typography>
          )}
          <StepErrorBoundary stepLabel={step.label || `Step ${stepIndex + 1}`}>
            <Suspense fallback={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">Loading…</Typography>
              </Box>
            }>
              {documentOpen && projectId && levelOpens(level, 'document') ? (
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <LevelFourBlueprint projectId={projectId} />
                </Box>
              ) : level === 1 && stepIndex === STEP_FOUNDATION && projectId ? (
                <LevelOneTemplate projectId={projectId} onBuilt={() => setStepIndex(STEP_DEPLOY)} />
              ) : (
                <StepView
                  goNext={goNext}
                  goPrev={goPrev}
                  projectId={projectId}
                  onSubStepChange={setSubStepIndex}
                  disclosureLevel={level}
                />
              )}
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
