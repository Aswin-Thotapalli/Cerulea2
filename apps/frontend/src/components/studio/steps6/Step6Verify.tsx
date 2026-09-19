'use client';

// apps/frontend/src/components/studio/steps6/Step6Verify.tsx
// Step 6 Verify and deploy.
// The chosen model runs against generated traffic and reports measured
// behaviour. Beside the report sits the readiness checklist, derived from the
// Blueprint validation report the Cerulea APIs compiler produces.
// Without this step a person would deploy without knowing what remains.

import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';

import ReadinessChecklist from './ReadinessChecklist';
import SimulationReport, { type SimulationReportView } from './SimulationReport';
import { useProjectState } from '@/lib/studio/project-state';

export default function Step6Verify({ projectId }: { projectId: string }) {
  const handle = useProjectState(projectId);
  const [report, setReport] = useState<SimulationReportView | null>(null);

  if (handle.loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={28} />
          <Typography variant="body2">Cerulea is opening the project.</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="overline" color="text.secondary">
        Step 6 of 6
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Verify and deploy
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        We measure the model before anybody commits, and we list what remains.
      </Typography>

      {handle.failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{handle.failure.message}</AlertTitle>
          {handle.failure.fix}
        </Alert>
      )}

      <Stack spacing={4}>
        <ReadinessChecklist
          projectId={projectId}
          buildState={handle.state?.buildState ?? null}
          simulationRun={report !== null}
        />
        <SimulationReport projectId={projectId} report={report} onReport={setReport} />
      </Stack>
    </Box>
  );
}
