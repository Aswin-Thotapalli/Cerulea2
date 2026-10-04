'use client';

// apps/frontend/src/components/studio/steps/step6-ReadinessChecklist.tsx
// What remains before deployment.
// The six steps collapse into this list once the project opens as a workspace.
// Every line comes from the Blueprint validation report the Cerulea APIs
// compiler produces, or from a step nobody has finished.
// Every line names the screen that closes it.
// Without this list a person would deploy without knowing what is missing.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { StudioRouteError, api } from '@/lib/apiClient';
import type { CompilerReport } from '@/lib/cerulea-api';
import { buildReadiness } from '@/lib/studio/readiness';
import type { BuildState } from '@/lib/studio/project-state';

export default function ReadinessChecklist({
  projectId,
  buildState,
  simulationRun = false,
}: {
  projectId: string;
  buildState: BuildState | null;
  simulationRun?: boolean;
}) {
  const [report, setReport] = useState<CompilerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const outcome = await api<{ report: CompilerReport }>(
        `/api/projects/${encodeURIComponent(projectId)}/compile`,
        { method: 'POST' },
      );
      setReport(outcome.report);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: cause instanceof StudioRouteError ? cause.fix : 'Check the Blueprint again.',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void check();
  }, [check]);

  const readiness = buildReadiness({ report, buildState, simulationRun });
  const done = readiness.items.filter((entry) => entry.state === 'done').length;
  const progress =
    readiness.items.length === 0 ? 0 : Math.round((done / readiness.items.length) * 100);

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          What remains before deployment
        </Typography>
        <Button size="small" onClick={() => void check()} disabled={loading}>
          Check again
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {readiness.headline}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 8, borderRadius: 4, mb: 2 }}
      />

      {loading && report === null && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Cerulea is checking the Blueprint.</Typography>
        </Stack>
      )}

      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      <List dense>
        {readiness.items.map((item) => (
          <ListItem key={item.id} alignItems="flex-start" disableGutters>
            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
              {item.state === 'done' ? (
                <CheckCircleOutlineIcon color="success" fontSize="small" />
              ) : item.state === 'advisory' ? (
                <InfoOutlinedIcon color="info" fontSize="small" />
              ) : (
                <ErrorOutlineIcon color="warning" fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={item.subject}
              secondary={
                <Box component="span">
                  <Typography component="span" variant="caption" color="text.secondary">
                    {item.fix}
                  </Typography>
                  <Chip component="span" size="small" sx={{ ml: 1 }} label={item.screen} />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {readiness.ready && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <AlertTitle>Nothing blocks deployment</AlertTitle>
          Deployment is atomic. The system is either fully present or absent, and a failure at any
          stage rolls back every stage before it.
        </Alert>
      )}
    </Paper>
  );
}
