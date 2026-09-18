'use client';

// Step 6, deploy.
// Studio asks Cerulea APIs to install the Blueprint and reports what comes back.
// Every stage on this screen arrives from Cerulea APIs.
// Studio writes no stage of its own.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/KeyboardArrowLeft';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import UndoIcon from '@mui/icons-material/Undo';

import { useStudio } from '@/context/StudioContext';
import {
  Deployment,
  DeploymentStage,
  blueprintHash,
  ceruleaApiBaseUrl,
  createDeployment,
  fetchDeployment,
  isDeploymentSettled,
  rollbackDeployment,
  watchDeployment,
} from '@/lib/cerulea-api';

const SurfaceCard = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

const StageRow = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: 'idle' | 'busy' | 'done' | 'failed' }>(({ theme, tone }) => {
  const accent =
    tone === 'done'
      ? theme.palette.success.main
      : tone === 'failed'
        ? theme.palette.error.main
        : tone === 'busy'
          ? theme.palette.primary.main
          : theme.palette.text.disabled;
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    padding: '14px 18px',
    borderRadius: 12,
    marginBottom: 8,
    border: `1px solid ${alpha(accent, 0.35)}`,
    backgroundColor: alpha(accent, 0.06),
  };
});

/** Plain words for every status Cerulea APIs reports. */
const DEPLOYMENT_STATUS_TEXT: Record<Deployment['status'], string> = {
  queued: 'Cerulea APIs accepted this deployment. Work starts shortly.',
  running: 'Cerulea APIs is installing the Blueprint now.',
  succeeded: 'Cerulea installed the Blueprint. The system is live.',
  failed: 'Cerulea stopped this deployment. The previous state stands.',
  rolled_back: 'Cerulea returned this project to its previous state.',
};

const STAGE_STATUS_TEXT: Record<DeploymentStage['status'], string> = {
  pending: 'Waiting',
  running: 'Running',
  succeeded: 'Done',
  failed: 'Stopped',
  skipped: 'Skipped',
};

function stageTone(status: DeploymentStage['status']): 'idle' | 'busy' | 'done' | 'failed' {
  if (status === 'succeeded') return 'done';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'busy';
  return 'idle';
}

function StageIcon({ status }: { status: DeploymentStage['status'] }) {
  if (status === 'succeeded') return <CheckCircleIcon color="success" />;
  if (status === 'failed') return <ErrorOutlineIcon color="error" />;
  if (status === 'running') return <CircularProgress size={22} />;
  if (status === 'skipped') return <RemoveCircleOutlineIcon color="disabled" />;
  return <PendingOutlinedIcon color="disabled" />;
}

/** Reports how far the stage list has travelled, counting settled stages only. */
export function completedStageShare(stages: DeploymentStage[]): number {
  if (stages.length === 0) return 0;
  const settled = stages.filter(
    (stage) => stage.status === 'succeeded' || stage.status === 'skipped' || stage.status === 'failed',
  ).length;
  return Math.round((settled / stages.length) * 100);
}

/** Reads the elapsed time a stage reported, in whole seconds. */
export function stageDurationSeconds(stage: DeploymentStage): number | null {
  if (!stage.startedAt || !stage.endedAt) return null;
  const started = Date.parse(stage.startedAt);
  const ended = Date.parse(stage.endedAt);
  if (Number.isNaN(started) || Number.isNaN(ended)) return null;
  return Math.max(0, Math.round((ended - started) / 1000));
}

type Props = {
  goPrev?: () => void;
  projectId?: string | null;
};

export default function Step6({ goPrev, projectId }: Props) {
  const studio = useStudio();
  const resolvedProjectId = projectId ?? studio.projectId ?? null;

  const [deployment, setDeployment] = React.useState<Deployment | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [rollingBack, setRollingBack] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const stopWatchRef = React.useRef<(() => void) | null>(null);

  React.useEffect(
    () => () => {
      stopWatchRef.current?.();
    },
    [],
  );

  const follow = React.useCallback((deploymentId: string) => {
    stopWatchRef.current?.();
    stopWatchRef.current = watchDeployment(deploymentId, {
      onUpdate: (next) => {
        setDeployment(next);
        setProblem(null);
      },
      onError: (error) => setProblem(error.message),
    });
  }, []);

  const readBlueprint = React.useCallback(async (id: string): Promise<unknown> => {
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}/blueprint`);
    if (!response.ok) {
      throw new Error(
        'Cerulea could not read the Blueprint for this project. ' +
          'Open the Blueprint step, save it once, then start the deployment again.',
      );
    }
    const payload = await response.json();
    const blueprint = payload?.blueprint ?? null;
    if (!blueprint) {
      throw new Error(
        'This project holds no saved Blueprint. ' +
          'Open the Blueprint step, choose the outcomes we want, then start the deployment again.',
      );
    }
    return blueprint;
  }, []);

  const start = React.useCallback(async () => {
    if (!resolvedProjectId) {
      setProblem('Open a project first. Studio deploys the Blueprint of one saved project.');
      return;
    }
    setStarting(true);
    setProblem(null);
    try {
      const blueprint = await readBlueprint(resolvedProjectId);
      const hash = await blueprintHash(blueprint);
      const { deploymentId } = await createDeployment({ projectId: resolvedProjectId, blueprintHash: hash });
      const first = await fetchDeployment(deploymentId);
      setDeployment(first);
      if (!isDeploymentSettled(first.status)) follow(deploymentId);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setStarting(false);
    }
  }, [follow, readBlueprint, resolvedProjectId]);

  const undo = React.useCallback(async () => {
    if (!deployment) return;
    setRollingBack(true);
    setProblem(null);
    try {
      const next = await rollbackDeployment(deployment.id);
      if (next) {
        setDeployment(next);
        if (!isDeploymentSettled(next.status)) follow(next.id);
      } else {
        follow(deployment.id);
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setRollingBack(false);
    }
  }, [deployment, follow]);

  const stages = deployment?.stages ?? [];
  const busy = starting || (deployment != null && !isDeploymentSettled(deployment.status));
  const share = completedStageShare(stages);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, pb: 6 }}>
      <SurfaceCard>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.main', color: 'common.white', display: 'flex' }}>
            <RocketLaunchIcon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              {studio.appMetadata?.appName || 'This project'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {studio.projectType === 'blockchain'
                ? 'A private Blockchain network'
                : 'A decentralised application on the public-access chain'}
            </Typography>
          </Box>
          <Chip
            size="small"
            variant="outlined"
            label={`${studio.selectedModules?.length ?? 0} modules`}
          />
        </Stack>

        <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
          Deployment installs the Blueprint on the chain. Cerulea installs the whole Blueprint or
          none of it. A rollback returns this project to the state it held before.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Cerulea APIs at {ceruleaApiBaseUrl()} runs this work and reports every stage.
        </Typography>
      </SurfaceCard>

      {problem && (
        <Alert severity="error" variant="outlined">
          <AlertTitle>Cerulea stopped here</AlertTitle>
          {problem}
        </Alert>
      )}

      {deployment && (
        <Alert severity={deployment.status === 'failed' ? 'warning' : 'info'} variant="outlined">
          {DEPLOYMENT_STATUS_TEXT[deployment.status]}
        </Alert>
      )}

      <SurfaceCard>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="overline" fontWeight={800} color="text.secondary">
            Deployment stages
          </Typography>
          {stages.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {share} percent of the stages have finished
            </Typography>
          )}
        </Stack>

        {stages.length > 0 && (
          <LinearProgress
            variant="determinate"
            value={share}
            sx={{ height: 6, borderRadius: 3, mb: 2 }}
          />
        )}

        {stages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Cerulea APIs reports the stage list once a deployment starts. Nothing runs yet.
          </Typography>
        ) : (
          stages.map((stage) => {
            const seconds = stageDurationSeconds(stage);
            return (
              <StageRow key={stage.name} tone={stageTone(stage.status)}>
                <Box sx={{ display: 'flex', pt: 0.25 }}>
                  <StageIcon status={stage.status} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>
                      {stage.name}
                    </Typography>
                    <Chip size="small" label={STAGE_STATUS_TEXT[stage.status]} variant="outlined" />
                    {seconds !== null && (
                      <Typography variant="caption" color="text.secondary">
                        {seconds} seconds
                      </Typography>
                    )}
                  </Stack>
                  {stage.outcome && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {stage.outcome}
                    </Typography>
                  )}
                </Box>
              </StageRow>
            );
          })
        )}
      </SurfaceCard>

      {deployment?.record != null && (
        <SurfaceCard>
          <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Deployment record
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Cerulea APIs wrote this record for the deployment. Auditors read it later.
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              borderRadius: 2,
              overflowX: 'auto',
              fontSize: 13,
              bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
            }}
          >
            {JSON.stringify(deployment.record, null, 2)}
          </Box>
        </SurfaceCard>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Tooltip title="Back one step">
          <span>
            <IconButton onClick={goPrev} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ArrowBackIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Button
          variant="contained"
          size="large"
          startIcon={starting ? <CircularProgress size={18} color="inherit" /> : <RocketLaunchIcon />}
          disabled={busy}
          onClick={start}
        >
          {deployment ? 'Deploy again' : 'Deploy this project'}
        </Button>
        {deployment && isDeploymentSettled(deployment.status) && deployment.status !== 'rolled_back' && (
          <Button
            variant="outlined"
            size="large"
            color="warning"
            startIcon={rollingBack ? <CircularProgress size={18} color="inherit" /> : <UndoIcon />}
            disabled={rollingBack}
            onClick={undo}
          >
            Roll this deployment back
          </Button>
        )}
      </Stack>
    </Box>
  );
}
