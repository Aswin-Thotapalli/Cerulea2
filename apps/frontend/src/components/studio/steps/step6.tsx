'use client';

// apps/frontend/src/components/studio/steps/step6.tsx
// Step 6, Deploy & UI. Two sub-steps under production's one sidebar entry,
// shown the way Foundation shows its phases.
// 1. Interface. Cerulea generates the application from the model and the drag
//    and drop builder opens over it. Every edit saves into the Views section of
//    the Blueprint through Cerulea APIs.
// 2. Verify and deploy. The readiness checklist, the simulation against
//    generated traffic, the Deployment Manifest with its export, then the real
//    seven stage deployment and the link to the live application.
// The production deployment simulation with its scripted log pools and its
// random metric walk is gone. Every line the console shows comes from Cerulea APIs.
// Without this step a built project would never reach a running system.

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Divider, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/KeyboardArrowLeft';
import ArrowForwardIcon from '@mui/icons-material/KeyboardArrowRight';
import CheckIcon from '@mui/icons-material/Check';

import StepGuidance from '@/components/studio/StepGuidance';
import { useStudio } from '@/context/StudioContext';
import Step5 from './step5';
import VerifyDeploy from './step6-VerifyDeploy';

/** The two sub-steps, in the order a person meets them. */
export const DEPLOY_SUB_STEPS = ['Interface', 'Verify and deploy'] as const;

export type DeploySubStep = 0 | 1;

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

/** The project record the step header reads. */
type ProjectHead = { id: string; name: string; projectType: 'dapp' | 'blockchain'; status: string };

export default function Step6({
  goPrev,
  projectId,
  onSubStepChange,
}: {
  goPrev?: () => void;
  goNext?: () => void;
  projectId: string | null;
  onSubStepChange?: (subStepIndex: number) => void;
}) {
  const theme = useTheme();
  const { projectId: contextId, projectType: contextType, appMetadata } = useStudio();
  const [subStep, setSubStep] = useState<DeploySubStep>(0);
  const [project, setProject] = useState<ProjectHead | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(projectId ?? contextId ?? null);

  useEffect(() => {
    if (projectId) setResolvedId(projectId);
    else if (contextId) setResolvedId(contextId);
    else if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('cerulea.projectId');
      if (stored) setResolvedId(stored);
    }
  }, [projectId, contextId]);

  useEffect(() => {
    onSubStepChange?.(subStep);
  }, [subStep, onSubStepChange]);

  const readProject = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(resolvedId)}`, { cache: 'no-store' });
      if (!response.ok) return;
      const body = (await response.json()) as { project?: ProjectHead } | ProjectHead;
      const held = 'project' in body && body.project ? body.project : (body as ProjectHead);
      if (held && typeof held === 'object' && 'name' in held) setProject(held);
    } catch {
      // The header shows the name the context holds when the read fails.
    }
  }, [resolvedId]);

  useEffect(() => {
    void readProject();
  }, [readProject]);

  const projectName = project?.name || appMetadata?.appName || '';
  const projectType = project?.projectType ?? contextType ?? null;
  const PRIMARY = theme.palette.primary.main;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }} data-testid="step6-deploy-ui">
      <StepGuidance
        stepKey="step6"
        title="Deploy & UI"
        subtitle="Step 6 of 6"
        description="Cerulea generates the application from the model and opens the builder over it. Then the checklist, the simulation and the Deployment Manifest show what the deployment installs, and Deploy Now runs the seven stages."
        steps={[
          { first: 'Shape the interface', next: 'Rearrange, hide, rename and bind the generated screens. Every change saves into the Blueprint.' },
          { first: 'Verify', next: 'Run the model against generated traffic and read the measured figures. Read the Deployment Manifest and hand it to a reviewer.' },
          { first: 'Deploy', next: 'Deploy Now runs the seven stages through Cerulea APIs. The console follows each stage, and the live application opens at the end.' },
        ]}
        tip="Deployment is atomic. The system is either fully present or absent, and a failure at any stage rolls back every stage before it."
      />

      {/* The two sub-steps, shown as Foundation shows its phases */}
      <Box sx={{ px: 3, pt: 1.5, pb: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }} data-testid="deploy-sub-steps">
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'text.secondary', mr: 1 }}>
          Step 6 Deploy & UI
        </Typography>
        {DEPLOY_SUB_STEPS.map((label, index) => {
          const isDone = index < subStep;
          const isActive = index === subStep;
          return (
            <Box key={label} onClick={() => setSubStep(index as DeploySubStep)} role="button" tabIndex={0} aria-current={isActive ? 'step' : undefined} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSubStep(index as DeploySubStep); }} sx={{ display: 'flex', alignItems: 'center', gap: '7px', p: '5px 10px', borderRadius: '6px', cursor: 'pointer', bgcolor: isActive ? PRIMARY : 'transparent', border: `1px solid ${isActive ? PRIMARY : alpha(PRIMARY, 0.25)}`, transition: 'all 0.15s' }} data-testid={`deploy-sub-step-${index}`}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isDone ? 'success.main' : isActive ? alpha('#fff', 0.2) : 'transparent', border: isDone || isActive ? 'none' : `1.5px solid ${alpha(PRIMARY, 0.4)}` }}>
                {isDone ? <CheckIcon sx={{ fontSize: 9, color: '#fff' }} /> : <Typography sx={{ fontSize: '0.58rem', color: isActive ? '#fff' : PRIMARY, fontWeight: 600, lineHeight: 1 }}>{index + 1}</Typography>}
              </Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : PRIMARY }}>{label}</Typography>
            </Box>
          );
        })}
      </Box>

      {subStep === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 2, minHeight: 0 }}>
            <Step5 projectId={resolvedId} embedded onSaved={() => void readProject()} />
          </Box>
          <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', py: 2, borderTop: `1px solid ${alpha(PRIMARY, 0.12)}`, bgcolor: 'background.paper' }}>
            <FloatingIsland elevation={6}>
              <Tooltip title="Back to Integrations">
                <IconButton onClick={goPrev} size="small" sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="Back">
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
              <Button variant="contained" size="large" onClick={() => setSubStep(1)} endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 1, px: 4, fontWeight: 800 }} data-testid="to-verify">
                Next: Verify and deploy
              </Button>
            </FloatingIsland>
          </Box>
        </Box>
      ) : resolvedId ? (
        <Box sx={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <VerifyDeploy projectId={resolvedId} projectName={projectName} projectType={projectType} goPrev={() => setSubStep(0)} />
        </Box>
      ) : (
        <Stack sx={{ p: 4 }} spacing={1}>
          <Typography variant="h6">Open a project first</Typography>
          <Typography variant="body2" color="text.secondary">
            Verify and deploy reads a saved project. Finish Step 1 Foundation, and the checklist appears here.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
