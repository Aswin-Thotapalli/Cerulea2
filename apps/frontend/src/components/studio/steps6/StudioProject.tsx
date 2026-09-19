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

import DeploymentManifestPanel from '@/components/studio/manifest/DeploymentManifestPanel';
import LevelFourBlueprint from '@/components/studio/levels/LevelFourBlueprint';
import LevelOneTemplate from '@/components/studio/levels/LevelOneTemplate';
import LevelTwoOutcomes from '@/components/studio/levels/LevelTwoOutcomes';
import LanguageSwitch from '@/components/studio/common/LanguageSwitch';
import LevelSwitch from '@/components/studio/levels/LevelSwitch';
import Step1Foundation from './Step1Foundation';
import Step3Model from './Step3Model';
import Step4Policies from './Step4Policies';
import Step6Verify from './Step6Verify';
import ReadinessChecklist from './ReadinessChecklist';
import PublicationGate from './PublicationGate';
import ValidationGuidance from './ValidationGuidance';
import ExecutionSubstrate from '@/components/studio/ExecutionSubstrate';
import { api } from '@/lib/apiClient';
import {
  levelOpens,
  readLevel,
  type DisclosureArea,
  type DisclosureLevel,
} from '@/lib/studio/disclosure';
import { screenTarget, type ModelSurface } from '@/lib/studio/screens';
import type { BuildState } from '@/lib/studio/project-state';

/** The areas a project opens with, in the order a person meets them. */
export const PROJECT_AREAS = [
  { id: 'foundation', label: 'Foundation', step: 1, stateKey: 'foundation' as const },
  { id: 'compose', label: 'Compose', step: 2, stateKey: 'compose' as const },
  { id: 'model', label: 'Model', step: 3, stateKey: 'model' as const },
  { id: 'policies', label: 'Policies', step: 4, stateKey: 'policies' as const },
  { id: 'verify', label: 'Verify', step: 6, stateKey: 'verify' as const },
] as const;

/**
 * The typed document itself, opened at level four alone.
 * The area reads the Blueprint rather than one step of the sequence, so it
 * carries the readiness of the verify area.
 */
export const BLUEPRINT_AREA = {
  id: 'blueprint',
  label: 'Blueprint',
  step: 6,
  stateKey: 'verify' as const,
} as const;

/** The areas one disclosure level opens, in the order a person meets them. */
export function areasForLevel(
  level: DisclosureLevel,
): ReadonlyArray<{ id: string; label: string; step: number; stateKey: keyof BuildState['steps'] }> {
  const base = PROJECT_AREAS.filter((area) => levelOpens(level, area.id as DisclosureArea));
  return levelOpens(level, 'blueprint') ? [...base, BLUEPRINT_AREA] : base;
}

export type ProjectArea = (typeof PROJECT_AREAS)[number]['id'] | 'blueprint';

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
  const [level, setLevel] = useState<DisclosureLevel>(2);
  const [modelSurface, setModelSurface] = useState<ModelSurface>('entities');
  const [failure, setFailure] = useState<string | null>(null);

  const read = useCallback(async () => {
    try {
      const held = await api<{ buildState: BuildState }>(
        `/api/projects/${encodeURIComponent(projectId)}/build-state`,
      );
      setBuildState(held.buildState);
      const held_level = readLevel(held.buildState.disclosureLevel);
      setLevel(held_level);
      const opened = sequenceFinished(held.buildState)
        ? 'foundation'
        : nextArea(held.buildState.steps);
      const reachable = areasForLevel(held_level);
      setArea(
        reachable.some((entry) => entry.id === opened)
          ? opened
          : ((reachable[0]?.id ?? 'verify') as ProjectArea),
      );
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

  /**
   * Moves between the four disclosure levels.
   * The Blueprint stays exactly as it is. Only the depth Cerulea shows changes.
   */
  const changeLevel = useCallback(
    (next: DisclosureLevel) => {
      setLevel(next);
      const reachable = areasForLevel(next);
      setArea((held) =>
        reachable.some((entry) => entry.id === held)
          ? held
          : ((reachable[0]?.id ?? 'verify') as ProjectArea),
      );
      if (!buildState) return;
      const updated: BuildState = { ...buildState, disclosureLevel: next };
      setBuildState(updated);
      void api(`/api/projects/${encodeURIComponent(projectId)}/build-state`, {
        method: 'PUT',
        body: JSON.stringify({ buildState: updated }),
      }).catch(() => undefined);
    },
    [buildState, projectId],
  );

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

  const open = areasForLevel(level);

  /**
   * Opens the area one manifest line names.
   * Every manifest line carries the screen that produces it, so finding a
   * problem and fixing it take one action each.
   */
  const openScreen = (screen: string) => {
    const target = screenTarget(screen);
    if (target === undefined) return;
    if (target.level > level) changeLevel(target.level);
    setArea(target.area as ProjectArea);
    if (target.surface !== undefined) setModelSurface(target.surface);
  };


  const header = (
    <Paper
      variant="outlined"
      square
      sx={{ px: 4, py: 2, borderTop: 0, borderLeft: 0, borderRight: 0 }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {buildState.foundation.projectName || 'This project'}
        </Typography>
        {finished && <Chip size="small" label="Open any area directly" />}
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <LevelSwitch level={level} onLevelChange={changeLevel} />
        <LanguageSwitch dense />
      </Stack>
    </Paper>
  );

  if (level === 1) {
    return (
      <Box>
        {header}
        {buildState.steps.compose && (
          <Box sx={{ px: 4, pt: 3 }}>
            <ReadinessChecklist projectId={projectId} buildState={buildState} />
          </Box>
        )}
        <LevelOneTemplate projectId={projectId} onBuilt={() => void advance()} />
        {buildState.steps.compose && <Step6Verify projectId={projectId} />}
      </Box>
    );
  }

  const surface =
    area === 'foundation' ? (
      <Step1Foundation projectId={projectId} onContinue={advance} />
    ) : area === 'compose' ? (
      <LevelTwoOutcomes projectId={projectId} buildState={buildState} onContinue={advance} />
    ) : area === 'model' ? (
      <Step3Model projectId={projectId} onContinue={advance} surface={modelSurface} />
    ) : area === 'policies' ? (
      <Step4Policies projectId={projectId} onContinue={advance} />
    ) : area === 'blueprint' ? (
      <LevelFourBlueprint projectId={projectId} onSaved={() => void advance()} />
    ) : (
      <Step6Verify projectId={projectId} />
    );

  if (finished) {
    return (
      <Box>
        <Paper
          variant="outlined"
          square
          sx={{ px: 4, pt: 2, borderTop: 0, borderLeft: 0, borderRight: 0 }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {buildState.foundation.projectName || 'This project'}
            </Typography>
            <Chip size="small" label="Open any area directly" />
          </Stack>
          <Box sx={{ py: 1.5 }}>
            <LevelSwitch level={level} onLevelChange={changeLevel} />
          </Box>
          <Tabs
            value={area}
            onChange={(_event, next) => setArea(next as ProjectArea)}
            variant="scrollable"
          >
            {open.map((entry) => (
              <Tab key={entry.id} value={entry.id} label={entry.label} />
            ))}
            <Tab value="substrate" label="Where it runs" />
          </Tabs>
        </Paper>
        <Box sx={{ px: 4, pt: 3 }}>
          <Stack spacing={3}>
            <ReadinessChecklist projectId={projectId} buildState={buildState} />
            <ValidationGuidance projectId={projectId} onChanged={() => void advance()} />
            <PublicationGate projectId={projectId} />
            <DeploymentManifestPanel
              projectId={projectId}
              statement={buildState.foundation.summary}
              outcomeNames={buildState.compose.outcomeIds}
              moduleIds={buildState.compose.moduleIds}
              onOpenScreen={openScreen}
            />
          </Stack>
        </Box>
        {area === ('substrate' as ProjectArea) ? (
          <ExecutionSubstrate projectId={projectId} />
        ) : (
          surface
        )}
      </Box>
    );
  }

  const activeIndex = open.findIndex((entry) => entry.id === area);

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
        <Box sx={{ mb: 2 }}>
          <LevelSwitch level={level} onLevelChange={changeLevel} />
        </Box>
        <Stepper nonLinear activeStep={activeIndex} alternativeLabel>
          {open.map((entry) => (
            <Step key={entry.id} completed={buildState.steps[entry.stateKey]}>
              <StepButton onClick={() => setArea(entry.id as ProjectArea)}>
                {entry.label}
              </StepButton>
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
