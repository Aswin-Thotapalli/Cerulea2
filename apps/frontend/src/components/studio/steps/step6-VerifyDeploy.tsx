'use client';

// apps/frontend/src/components/studio/steps/step6-VerifyDeploy.tsx
// Deploy & UI, second sub-step: Verify and deploy.
// The readiness checklist states what remains. The simulation runs the model
// against generated traffic through Cerulea APIs and shows measured figures
// alone. The Deployment Manifest enumerates what the deployment installs, with
// its export in the Cerulea house format. Then Deploy Now starts the real
// seven stage deployment through Cerulea APIs, the production console follows
// the stages from the deployment reads, and on success the live generated
// application opens with the project reading deployed.
// Without this sub-step a built project could never leave Studio.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/KeyboardArrowLeft';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import { StudioRouteError, api } from '@/lib/apiClient';
import { type DeploymentView, STAGE_ORDER } from '@/lib/deployment/reads';
import { stageName } from '@/lib/deployment/plain';
import type { AccessibilityOutcome } from '@/lib/interface/types';
import { readInterfaceAccessibility } from '@/lib/interface/studio';
import type { BuildState } from '@/lib/studio/project-state';
import DeploymentConsole, { stageWords } from './step6-DeploymentConsole';
import DeploymentManifest from './step6-DeploymentManifest';
import ReadinessChecklist from './step6-ReadinessChecklist';
import SimulationReport, { type SimulationReportView } from './step6-SimulationReport';

const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(8, 14, 36, 0.95)',
  backdropFilter: 'blur(16px)',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.3)',
  borderRadius: 100,
  padding: '8px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  zIndex: 1000,
  pointerEvents: 'auto',
}));

const LeftPanel = styled(Box)(({ theme }) => ({
  width: 340,
  flexShrink: 0,
  height: '100%',
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.mode === 'dark' ? 'rgba(8,14,36,0.95)' : theme.palette.background.paper,
  overflowY: 'auto',
}));

/** The time between two reads of a running deployment. */
export const POLL_INTERVAL_MS = 2000;

type Tabbed = 'simulation' | 'manifest' | 'console';

/** The seven stage names with the purpose each one serves, shown before any deployment ran. */
export const STAGE_PURPOSES: Record<(typeof STAGE_ORDER)[number], string> = {
  verify: 'The compiler passes, the tier permits the resources, the target answers.',
  provision: 'Storage is allocated, the process boundary is created, the genesis file is written.',
  start: 'The validator processes launch, peer and produce blocks.',
  install: 'The schema registers, the Blueprint installs, identity and permission state seeds.',
  publish: 'The generated interface starts, the domain attaches, the certificate issues.',
  health: 'A write, a read, a proof and a permission denial each behave correctly.',
  record: 'The deployment record is written with the Blueprint hash, the manifest and the actor.',
};

/** Reports whether a deployment is still moving. */
export function deploymentMoving(deployment: DeploymentView | null): boolean {
  return deployment !== null && (deployment.status === 'queued' || deployment.status === 'running');
}

/** The reason Deploy Now stays closed, or nothing when it may open. */
export function deployHold(input: {
  ready: boolean;
  gate: AccessibilityOutcome | null;
  moving: boolean;
  compilerOk: boolean | null;
}): string | null {
  if (input.moving) return 'A deployment is running. The console follows its stages.';
  if (input.gate !== null && input.gate.publication?.blocked) return `${input.gate.publication.message} ${input.gate.publication.fix}`;
  if (input.compilerOk === false) return 'The Blueprint holds corrections to make. The checklist names each one and the screen that closes it.';
  if (!input.ready) return 'Items remain before deployment. The checklist on the left names each one.';
  return null;
}

export default function VerifyDeploy({
  projectId,
  projectName,
  projectType,
  goPrev,
}: {
  projectId: string;
  projectName: string;
  projectType: 'dapp' | 'blockchain' | null;
  goPrev?: () => void;
}) {
  const theme = useTheme();
  const [tab, setTab] = useState<Tabbed>('simulation');
  const [buildState, setBuildState] = useState<BuildState | null>(null);
  const [readiness, setReadiness] = useState<{ ready: boolean; remaining: number; compilerOk: boolean } | null>(null);
  const [gate, setGate] = useState<AccessibilityOutcome | null>(null);
  const [report, setReport] = useState<SimulationReportView | null>(null);
  const [deployment, setDeployment] = useState<DeploymentView | null>(null);
  const [history, setHistory] = useState<DeploymentView[]>([]);
  const [starting, setStarting] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);
  const [checklistKey, setChecklistKey] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readState = useCallback(async () => {
    try {
      const [held, ready, access] = await Promise.all([
        api<{ buildState: BuildState }>(`/api/projects/${encodeURIComponent(projectId)}/build-state`),
        api<{ ready: boolean; remaining: number; compilerOk: boolean }>(`/api/projects/${encodeURIComponent(projectId)}/readiness`),
        readInterfaceAccessibility(projectId),
      ]);
      setBuildState(held.buildState);
      setReadiness({ ready: ready.ready, remaining: ready.remaining, compilerOk: ready.compilerOk });
      setGate(access);
      setChecklistKey((count) => count + 1);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: cause instanceof StudioRouteError ? cause.fix : 'Open the sub-step again once Cerulea APIs answers.',
      });
    }
  }, [projectId]);

  const readDeployments = useCallback(async () => {
    try {
      const held = await api<{ deployments: DeploymentView[] }>(`/api/projects/${encodeURIComponent(projectId)}/deployments`);
      setHistory(held.deployments);
      setDeployment((current) => {
        if (current && deploymentMoving(current)) return current;
        return held.deployments[0] ?? null;
      });
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: cause instanceof StudioRouteError ? cause.fix : 'Read the deployments again once Cerulea APIs answers.',
      });
    }
  }, [projectId]);

  useEffect(() => {
    void readState();
    void readDeployments();
  }, [readState, readDeployments]);

  // The console reads the running deployment every two seconds until it settles.
  useEffect(() => {
    if (!deploymentMoving(deployment)) return;
    let live = true;
    const tick = async () => {
      if (!live || !deployment) return;
      try {
        const next = await api<DeploymentView>(`/api/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deployment.id)}`);
        if (!live) return;
        setDeployment(next);
        if (!deploymentMoving(next)) {
          void readDeployments();
          void readState();
          return;
        }
      } catch (cause) {
        if (!live) return;
        setFailure({
          message: cause instanceof Error ? cause.message : String(cause),
          fix: cause instanceof StudioRouteError ? cause.fix : 'The console reads the deployment again in two seconds.',
        });
      }
      pollTimer.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };
    pollTimer.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      live = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // The watch restarts when the deployment identity or its moving state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployment?.id, deploymentMoving(deployment), projectId]);

  const moving = deploymentMoving(deployment);
  const hold = deployHold({
    ready: readiness?.ready ?? false,
    gate,
    moving,
    compilerOk: readiness?.compilerOk ?? null,
  });

  const deploy = async () => {
    if (hold !== null || starting) return;
    setStarting(true);
    setFailure(null);
    setTab('console');
    try {
      const started = await api<DeploymentView>(`/api/projects/${encodeURIComponent(projectId)}/deployments`, { method: 'POST' });
      setDeployment(started);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: cause instanceof StudioRouteError ? cause.fix : 'Start the deployment again once Cerulea APIs answers.',
      });
    } finally {
      setStarting(false);
    }
  };

  const askIntelligence = (held: DeploymentView) => {
    const failed = held.stages.find((stage) => stage.status === 'failed');
    window.dispatchEvent(
      new CustomEvent('cerulea:deploy-error', {
        detail: {
          phase: failed?.name ?? held.status,
          errorCode: 'deployment.' + (failed?.name ?? held.status),
          errorMessage: held.failureReason ?? failed?.outcome ?? 'The deployment stopped.',
          logs: held.stages.filter((stage) => stage.status !== 'pending').map((stage) => `${stage.name}: ${stage.status}. ${stage.outcome ?? ''}`),
          projectType,
          deploymentId: held.id,
        },
      }),
    );
  };

  const pipeline = useMemo(() => {
    if (deployment) return deployment.stages.map((stage) => ({ number: stage.number, name: stage.name, words: stageWords(stage, deployment), status: stage.status, outcome: stage.outcome }));
    return STAGE_ORDER.map((name, index) => ({ number: index + 1, name, words: 'Waiting', status: 'pending' as const, outcome: STAGE_PURPOSES[name] }));
  }, [deployment]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="step6-verify-deploy">
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: theme.palette.mode === 'dark' ? 'radial-gradient(rgba(0,74,173,0.16) 1px, transparent 1px)' : 'radial-gradient(rgba(0,74,173,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1, pt: 2, px: 3, pb: 2, minHeight: 0 }}>
        <LeftPanel>
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.15), color: 'primary.main', display: 'flex' }}>
                <RocketLaunchIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  {projectName || 'Project'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {projectType === 'blockchain' ? 'Private Blockchain network' : 'Decentralised application'}
                </Typography>
              </Box>
            </Stack>
            {deployment && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.15) }}>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block">
                  Deployment {deployment.id}
                </Typography>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block">
                  Target {deployment.target}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2 }}>
            <Typography variant="overline" fontSize="0.6rem" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 1.2, pl: 1, mb: 1.5, display: 'block' }}>
              DEPLOYMENT PIPELINE
            </Typography>
            <Stack spacing={0.75} data-testid="pipeline">
              {pipeline.map((stage) => {
                const isActive = stage.status === 'running';
                const isDone = stage.status === 'succeeded';
                const isFailed = stage.status === 'failed';
                const colour = isDone ? '#10b981' : isFailed ? '#ef4444' : isActive ? theme.palette.primary.main : theme.palette.text.disabled;
                return (
                  <Tooltip key={stage.name} title={stage.outcome ?? ''} placement="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : isDone ? alpha('#10b981', 0.05) : isFailed ? alpha('#ef4444', 0.06) : 'transparent', border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.25) : isDone ? alpha('#10b981', 0.2) : isFailed ? alpha('#ef4444', 0.3) : 'transparent'}`, opacity: !deployment || isActive || isDone || isFailed ? 1 : 0.5, transition: 'all 0.3s' }} data-testid={`pipeline-${stage.name}`}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(colour, 0.15), color: colour, fontSize: '0.75rem', fontWeight: 800 }}>
                        {isDone ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : isActive ? <CircularProgress size={14} color="inherit" /> : isFailed ? <ErrorOutlineIcon sx={{ fontSize: 14 }} /> : <Typography variant="caption" fontWeight={800}>{stage.number}</Typography>}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={isDone || isActive || isFailed ? 700 : 500} sx={{ lineHeight: 1.2, color: colour === theme.palette.text.disabled ? 'text.secondary' : colour }}>
                          {stageName(stage.name)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colour, opacity: 0.8 }}>
                          {stage.words}
                        </Typography>
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={800} mb={1}>
              Before we deploy
            </Typography>
            <ReadinessChecklist key={checklistKey} projectId={projectId} buildState={buildState} simulationRun={report !== null} />
            {gate !== null && (
              <Alert severity={gate.passes ? 'success' : 'error'} sx={{ mt: 1.5 }} data-testid="publication-gate">
                <AlertTitle>{gate.passes ? 'The screens pass the accessibility check' : 'Publication waits on the screens'}</AlertTitle>
                {gate.headline} {gate.publication ? gate.publication.fix : ''}
              </Alert>
            )}
          </Box>
        </LeftPanel>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', pl: 2.5, minWidth: 0, minHeight: 0 }}>
          {failure && (
            <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setFailure(null)}>
              <AlertTitle>{failure.message}</AlertTitle>
              {failure.fix}
            </Alert>
          )}
          <Tabs value={tab} onChange={(_event, next: Tabbed) => setTab(next)} sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }} aria-label="Verify and deploy panels">
            <Tab value="simulation" label="Simulation" />
            <Tab value="manifest" label="Deployment Manifest" />
            <Tab value="console" label={<Stack direction="row" spacing={1} alignItems="center"><span>Deployment console</span>{history.length > 0 && <Chip size="small" label={history.length} />}</Stack>} />
          </Tabs>
          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, pr: 0.5, display: 'flex', flexDirection: 'column' }}>
            {tab === 'simulation' && <SimulationReport projectId={projectId} report={report} onReport={(next) => { setReport(next); void readState(); }} />}
            {tab === 'manifest' && <DeploymentManifest projectId={projectId} statement={buildState?.foundation.summary ?? ''} moduleIds={buildState?.compose.moduleIds ?? []} />}
            {tab === 'console' && (
              <Stack spacing={2} sx={{ flex: 1 }}>
                <DeploymentConsole projectId={projectId} deployment={deployment} busy={starting} onAskIntelligence={askIntelligence} />
                {history.length > 1 && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="subtitle2" fontWeight={800} mb={1}>
                      Earlier deployments
                    </Typography>
                    <Stack spacing={0.5}>
                      {history.map((held) => (
                        <Button key={held.id} size="small" variant={held.id === deployment?.id ? 'contained' : 'text'} onClick={() => setDeployment(held)} sx={{ justifyContent: 'flex-start', textTransform: 'none', fontFamily: 'monospace' }}>
                          {held.id} · {held.status} · {held.startedAt ? new Date(held.startedAt).toLocaleString('en-GB') : 'queued'}
                        </Button>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', py: 2, borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`, bgcolor: 'background.paper', position: 'relative', zIndex: 1 }}>
        <FloatingIsland elevation={6}>
          <Tooltip title="Back to the Interface">
            <IconButton onClick={goPrev} size="small" sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="Back">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          {moving || starting ? (
            <Tooltip title="Deployment in progress">
              <span>
                <Button variant="outlined" size="large" disabled startIcon={<LockIcon />} sx={{ borderRadius: 1, px: 4, fontWeight: 700 }}>
                  Deploying
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title={hold ?? 'Start the seven stage deployment through Cerulea APIs'}>
              <span>
                <Button variant="contained" size="large" onClick={() => void deploy()} disabled={hold !== null || readiness === null} startIcon={<RocketLaunchIcon />} sx={{ borderRadius: 1, px: 4, fontWeight: 800, background: 'linear-gradient(135deg, #004AAD 0%, #30B700 100%)', boxShadow: '0 4px 20px rgba(0,74,173,0.4)' }} data-testid="deploy-now">
                  Deploy Now
                </Button>
              </span>
            </Tooltip>
          )}
          {hold !== null && !moving && (
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360 }} data-testid="deploy-hold">
              {hold}
            </Typography>
          )}
        </FloatingIsland>
      </Box>
    </Box>
  );
}
