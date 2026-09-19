'use client';

// apps/frontend/src/components/studio/steps6/StudioProject.tsx
// A wizard once, a workspace afterwards.
// A linear sequence serves the first pass well. Returning to a wizard to change
// one field serves nobody. Studio runs the steps once to establish the project.
// The project then opens as a persistent workspace with direct navigation to
// any area, and the sequence collapses into the readiness checklist.
// Without this transition every later change would walk the whole sequence.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Step,
  StepButton,
  Stepper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

import Step1Foundation from './Step1Foundation';
import Step2Compose from './Step2Compose';
import Step3Model from './Step3Model';
import Step4Policies from './Step4Policies';
import Step6Verify from './Step6Verify';
import ReadinessChecklist from './ReadinessChecklist';
import ExecutionSubstrate from '@/components/studio/ExecutionSubstrate';
import { api } from '@/lib/apiClient';
import type { BuildState } from '@/lib/studio/project-state';

/** The areas a project opens with, in the order a person meets them. */
export const PROJECT_AREAS = [
  { id: 'foundation', label: 'Foundation', step: 1, stateKey: 'foundation' as const },
  { id: 'compose', label: 'Compose', step: 2, stateKey: 'compose' as const },
  { id: 'model', label: 'Model', step: 3, stateKey: 'model' as const },
  { id: 'policies', label: 'Policies', step: 4, stateKey: 'policies' as const },
  { id: 'verify', label: 'Verify', step: 6, stateKey: 'verify' as const },
] as const;

export type ProjectArea = (typeof PROJECT_AREAS)[number]['id'];

/** The steps a person has finished, counted from the build state. */
export function finishedCount(steps: BuildState['steps']): number {
  return PROJECT_AREAS.filter((area) => steps[area.stateKey]).length;
}

/** The first area that still needs work, so the wizard opens where the person stopped. */
export function nextArea(steps: BuildState['steps']): ProjectArea {
  return PROJECT_AREAS.find((area) => steps[area.stateKey] === false)?.id ?? 'verify';
}

/**
 * Reports whether the sequence is finished.
 * The sequence collapses into the checklist once every area carries work.
 */
export function sequenceFinished(state: BuildState): boolean {
  return state.wizardComplete || finishedCount(state.steps) === PROJECT_AREAS.length;
}

export default function StudioProject({ projectId }: { projectId: string }) {
  const [buildState, setBuildState] = useState<BuildState | null>(null);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState<ProjectArea>('foundation');
  const [failure, setFailure] = useState<string | null>(null);

  const read = useCallback(async () => {
    try {
      const held = await api<{ buildState: BuildState }>(
        `/api/projects/${encodeURIComponent(projectId)}/build-state`,
      );
      setBuildState(held.buildState);
      setArea(sequenceFinished(held.buildState) ? 'foundation' : nextArea(held.buildState.steps));
      setFailure(null);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  const finished = useMemo(
    () => (buildState ? sequenceFinished(buildState) : false),
    [buildState],
  );

  const markComplete = useCallback(async () => {
    if (!buildState) return;
    const next: BuildState = {
      ...buildState,
      wizardComplete: true,
      wizardCompletedAt: new Date().toISOString(),
    };
    await api(`/api/projects/${encodeURIComponent(projectId)}/build-state`, {
      method: 'PUT',
      body: JSON.stringify({ buildState: next }),
    }).catch(() => undefined);
    await read();
  }, [buildState, projectId, read]);

  const advance = useCallback(async () => {
    await read();
  }, [read]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={28} />
          <Typography variant="body2">Cerulea is opening the project.</Typography>
        </Stack>
      </Box>
    );
  }

  if (failure || !buildState) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          <AlertTitle>{failure ?? 'Cerulea could not open this project.'}</AlertTitle>
          Open the project again. Report the problem to the Cerulea operator when it repeats.
        </Alert>
      </Box>
    );
  }

  const surface =
    area === 'foundation' ? (
      <Step1Foundation projectId={projectId} onContinue={advance} />
    ) : area === 'compose' ? (
      <Step2Compose projectId={projectId} onContinue={advance} />
    ) : area === 'model' ? (
      <Step3Model projectId={projectId} onContinue={advance} />
    ) : area === 'policies' ? (
      <Step4Policies projectId={projectId} onContinue={advance} />
    ) : (
      <Step6Verify projectId={projectId} />
    );

  if (finished) {
    return (
      <Box>
        <Paper variant="outlined" square sx={{ px: 4, pt: 2, borderTop: 0, borderLeft: 0, borderRight: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {buildState.foundation.projectName || 'This project'}
            </Typography>
            <Chip size="small" label="Open any area directly" />
          </Stack>
          <Tabs
            value={area}
            onChange={(_event, next) => setArea(next as ProjectArea)}
            variant="scrollable"
          >
            {PROJECT_AREAS.map((entry) => (
              <Tab key={entry.id} value={entry.id} label={entry.label} />
            ))}
            <Tab value="substrate" label="Where it runs" />
          </Tabs>
        </Paper>
        <Box sx={{ px: 4, pt: 3 }}>
          <ReadinessChecklist projectId={projectId} buildState={buildState} />
        </Box>
        {area === ('substrate' as ProjectArea) ? (
          <ExecutionSubstrate projectId={projectId} />
        ) : (
          surface
        )}
      </Box>
    );
  }

  const activeIndex = PROJECT_AREAS.findIndex((entry) => entry.id === area);

  return (
    <Box>
      <Paper
        variant="outlined"
        square
        sx={{ px: 4, py: 2, borderTop: 0, borderLeft: 0, borderRight: 0 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          We run these steps once. The project then opens as a workspace with direct navigation.
        </Typography>
        <Stepper nonLinear activeStep={activeIndex} alternativeLabel>
          {PROJECT_AREAS.map((entry) => (
            <Step key={entry.id} completed={buildState.steps[entry.stateKey]}>
              <StepButton onClick={() => setArea(entry.id)}>{entry.label}</StepButton>
            </Step>
          ))}
        </Stepper>
      </Paper>
      {surface}
      {finishedCount(buildState.steps) === PROJECT_AREAS.length && (
        <Box sx={{ px: 4, pb: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Button variant="contained" onClick={() => void markComplete()}>
            Open this project as a workspace
          </Button>
        </Box>
      )}
    </Box>
  );
}
