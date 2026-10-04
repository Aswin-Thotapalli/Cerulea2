'use client';

// apps/frontend/src/components/studio/steps/step6-DeploymentConsole.tsx
// The production deployment console, driven by the real seven stages.
// Cerulea APIs runs the deployment and keeps one row per stage with its state,
// its instants and its outcome sentence. The console writes one line per
// stage change from those rows, shows live progress as the stages succeed,
// shows the outcome of every stage, and shows the rollback when a stage fails.
// No log line is produced in the browser. Every word on the terminal comes from
// the deployment reads.
// Without this console a person would start a deployment and read nothing.

import React, { useEffect, useMemo, useRef } from 'react';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import TerminalIcon from '@mui/icons-material/Terminal';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import type { DeploymentStageView, DeploymentView } from '@/lib/deployment/reads';
import { deploymentState, plainOutcome, stageName, stageState } from '@/lib/deployment/plain';

const TerminalWindow = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? '#f5f5f5' : '#080E24',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 16,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 12px 24px -8px rgba(0,0,0,0.1)'
      : '0 24px 48px -12px rgba(0,0,0,0.5)',
  fontFamily: '"Fira Code", "Roboto Mono", monospace',
}));

const TerminalHeader = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? '#e0e0e0' : '#0D1535',
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const TerminalDot = styled(Box)<{ color: string }>(({ color }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: color,
}));

/** One line of the console, read from one stage row. */
export type ConsoleLine = {
  key: string;
  at: string | null;
  text: string;
  tone: 'head' | 'done' | 'failed' | 'note' | 'plain';
};

/** Writes one instant as the time of day. */
function clock(instant: string | null): string {
  if (instant === null) return '';
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[1].split('.')[0];
}

/** The words a person reads for one stage state, with a rollback named as one. */
export function stageWords(stage: DeploymentStageView, deployment: DeploymentView): string {
  if (stage.status === 'skipped' && stage.startedAt !== null) return 'Rolled back';
  if (stage.status === 'skipped' && deployment.status === 'rolled_back') return 'Rolled back';
  return stageState(stage.status);
}

/**
 * The lines the console shows for one deployment.
 *
 * The first lines name the deployment, its Blueprint and its target. Then one
 * line per stage that started, carrying the outcome sentence Cerulea APIs
 * recorded. A failed stage carries its failure, and a stage rolled back
 * carries the rollback sentence. The last line states where the deployment
 * stands.
 */
export function consoleLines(deployment: DeploymentView): ConsoleLine[] {
  const lines: ConsoleLine[] = [
    {
      key: 'head-id',
      at: deployment.startedAt,
      text: `DEPLOYMENT ${deployment.id}`,
      tone: 'head',
    },
    {
      key: 'head-blueprint',
      at: deployment.startedAt,
      text: `BLUEPRINT ${deployment.blueprintHash.slice(0, 16)} TARGET ${deployment.target}`,
      tone: 'head',
    },
  ];
  for (const stage of deployment.stages) {
    if (stage.status === 'pending') continue;
    const words = stageWords(stage, deployment);
    const outcome = stage.outcome === null || stage.outcome.length === 0 ? '' : ` ${plainOutcome(stage.outcome)}`;
    lines.push({
      key: `stage-${stage.number}`,
      at: stage.endedAt ?? stage.startedAt,
      text: `> Stage ${stage.number} ${stageName(stage.name)}: ${words}.${outcome}`,
      tone:
        stage.status === 'succeeded'
          ? 'done'
          : stage.status === 'failed'
            ? 'failed'
            : stage.status === 'skipped' && stage.startedAt !== null
              ? 'note'
              : 'plain',
    });
  }
  if (deployment.failureReason) {
    lines.push({
      key: 'failure-line',
      at: deployment.endedAt ?? deployment.rolledBackAt,
      text: `> ${plainOutcome(deployment.failureReason)}`,
      tone: 'failed',
    });
  }
  if (deployment.status === 'succeeded') {
    lines.push({
      key: 'end',
      at: deployment.endedAt,
      text: '> Every stage finished. The deployment is live.',
      tone: 'done',
    });
  } else if (deployment.status === 'failed' || deployment.status === 'rolled_back') {
    lines.push({
      key: 'end',
      at: deployment.rolledBackAt ?? deployment.endedAt,
      text: `> ${deploymentState(deployment.status)}. Every stage that ran was rolled back, so nothing partial remains.`,
      tone: 'note',
    });
  }
  return lines;
}

/** The share of stages that finished, as a percentage. */
export function progressOf(deployment: DeploymentView): number {
  const total = deployment.stages.length || 7;
  const done = deployment.stages.filter((stage) => stage.status === 'succeeded').length;
  return Math.round((done / total) * 100);
}

/** The stage running now, or the newest that changed. */
export function activeStage(deployment: DeploymentView): DeploymentStageView | undefined {
  return (
    deployment.stages.find((stage) => stage.status === 'running') ??
    [...deployment.stages].reverse().find((stage) => stage.status !== 'pending')
  );
}

/** The address of the live application once stage five published it. */
export function liveApplicationPath(projectId: string, deployment: DeploymentView): string | null {
  if (deployment.status !== 'succeeded') return null;
  return `/api/projects/${encodeURIComponent(projectId)}/application?deployment=${encodeURIComponent(deployment.id)}`;
}

export default function DeploymentConsole({
  projectId,
  deployment,
  busy,
  onAskIntelligence,
}: {
  projectId: string;
  deployment: DeploymentView | null;
  /** True while the console polls a running deployment. */
  busy: boolean;
  /** Opens the assistant with the failure. */
  onAskIntelligence?: (deployment: DeploymentView) => void;
}) {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => (deployment ? consoleLines(deployment) : []), [deployment]);
  const running = deployment !== null && (deployment.status === 'queued' || deployment.status === 'running');
  const failed = deployment !== null && (deployment.status === 'failed' || deployment.status === 'rolled_back');
  const live = deployment ? liveApplicationPath(projectId, deployment) : null;
  const current = deployment ? activeStage(deployment) : undefined;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines.length]);

  return (
    <TerminalWindow elevation={8} sx={{ flex: 1, minHeight: 360 }} data-testid="deployment-console">
      <TerminalHeader>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TerminalDot color="#FF5F56" />
          <TerminalDot color="#FFBD2E" />
          <TerminalDot color="#27C93F" />
          <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ ml: 1.5 }}>
            cerulea:deploy
          </Typography>
        </Stack>
        {(running || busy) && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#27C93F', animation: 'pulse 1.5s infinite' }} />
            <Typography variant="caption" fontFamily="monospace" sx={{ color: '#27C93F' }}>
              LIVE
            </Typography>
          </Stack>
        )}
      </TerminalHeader>

      <Box ref={scrollRef} sx={{ flex: 1, p: 2.5, overflowY: 'auto', lineHeight: 1.7, fontFamily: '"Fira Code","Roboto Mono",monospace', fontSize: 13, minHeight: 220 }}>
        {deployment === null ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.35, py: 6 }}>
            <TerminalIcon sx={{ fontSize: 56, mb: 2 }} />
            <Typography fontFamily="monospace">No deployment yet. Deploy Now starts the seven stages.</Typography>
          </Box>
        ) : (
          <>
            {lines.map((line) => (
              <Box key={line.key} sx={{ mb: 0.25, wordBreak: 'break-word' }} data-testid={`console-${line.key}`}>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    fontWeight: line.tone === 'head' || line.tone === 'done' || line.tone === 'failed' ? 700 : 400,
                    color:
                      line.tone === 'head'
                        ? theme.palette.primary.main
                        : line.tone === 'done'
                          ? '#10b981'
                          : line.tone === 'failed'
                            ? '#ef4444'
                            : line.tone === 'note'
                              ? '#f59e0b'
                              : theme.palette.mode === 'light'
                                ? '#374151'
                                : '#d1d5db',
                  }}
                >
                  {clock(line.at) ? `${clock(line.at)} ` : ''}
                  {line.text}
                </Typography>
              </Box>
            ))}
            {running && (
              <Box component="span" sx={{ color: '#10b981', fontWeight: 700, animation: 'blink 1s infinite' }}>
                █
              </Box>
            )}
          </>
        )}
      </Box>

      {deployment !== null && (
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)', borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
              {current ? `STAGE ${current.number} ${stageName(current.name).toUpperCase()}` : deploymentState(deployment.status).toUpperCase()}
            </Typography>
            <Typography variant="caption" fontFamily="monospace" color="primary.main" fontWeight={700} data-testid="console-progress">
              {progressOf(deployment)}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressOf(deployment)}
            sx={{ height: 3, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), '& .MuiLinearProgress-bar': { background: failed ? '#ef4444' : 'linear-gradient(90deg, #004AAD, #30B700)' } }}
          />
        </Box>
      )}

      {deployment !== null && live !== null && (
        <Box sx={{ px: 2.5, py: 2, bgcolor: alpha('#10b981', 0.08), borderTop: `1px solid ${alpha('#10b981', 0.25)}` }} data-testid="console-live">
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="caption" fontFamily="monospace" sx={{ color: '#10b981', fontWeight: 700, display: 'block' }}>
                DEPLOYMENT LIVE
              </Typography>
              <Typography variant="caption" color="text.secondary">
                The generated application answers on its own name. The project now reads deployed.
              </Typography>
            </Box>
            <Button variant="contained" color="success" size="small" href={live} target="_blank" rel="noopener" endIcon={<OpenInNewIcon />} sx={{ borderRadius: 1.5 }}>
              Open the live application
            </Button>
          </Stack>
        </Box>
      )}

      {deployment !== null && failed && (
        <Box sx={{ px: 2.5, py: 2, bgcolor: alpha('#ef4444', 0.08), borderTop: `1px solid ${alpha('#ef4444', 0.25)}` }} data-testid="console-failure">
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Box sx={{ flexShrink: 0, mt: 0.25 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" fontFamily="monospace" sx={{ color: '#ef4444', fontWeight: 700, display: 'block', mb: 0.5 }}>
                DEPLOYMENT {deployment.status === 'rolled_back' ? 'ROLLED BACK' : 'FAILED'}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" sx={{ color: alpha('#ef4444', 0.85), display: 'block', mb: 1, lineHeight: 1.5 }}>
                {deployment.failureReason ? plainOutcome(deployment.failureReason) : 'A stage stopped and every earlier stage was rolled back.'}
              </Typography>
              {onAskIntelligence && (
                <Button size="small" variant="outlined" onClick={() => onAskIntelligence(deployment)} sx={{ fontSize: '0.7rem', borderRadius: 1.5, px: 1.5, py: 0.4, borderColor: alpha('#ef4444', 0.4), color: '#ef4444', '&:hover': { borderColor: '#ef4444', bgcolor: alpha('#ef4444', 0.06) } }}>
                  Ask Cerulea AI to explain and fix this
                </Button>
              )}
            </Box>
          </Stack>
        </Box>
      )}
    </TerminalWindow>
  );
}
