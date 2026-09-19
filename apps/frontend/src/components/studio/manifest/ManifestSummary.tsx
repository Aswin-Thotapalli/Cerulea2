'use client';

// apps/frontend/src/components/studio/manifest/ManifestSummary.tsx
// The Deployment Manifest, summary view.
// Counts and headline figures for a quick scan. A reviewer reads the size of
// the system in one screen and opens the atomic view for the detail.
// Every figure names the screen that produces it.
// Without this view a reviewer would read every line to learn the size.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import { summaryHeadline, summaryLines } from '@/lib/manifest/groups';
import type { ManifestGroupCounts, SummaryReply } from '@/lib/manifest/types';

export default function ManifestSummary({
  projectId,
  onOpenScreen,
}: {
  projectId: string;
  onOpenScreen?: (screen: string) => void;
}) {
  const [counts, setCounts] = useState<ManifestGroupCounts | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      const held = await api<SummaryReply>(
        `/api/projects/${encodeURIComponent(projectId)}/manifest?view=summary`,
      );
      if (held.summary === undefined || held.summary === null) {
        setFailure({
          message: 'Cerulea answered with no summary for this project.',
          fix: 'Read the manifest again. Report the problem to the Cerulea operator when it repeats.',
        });
        return;
      }
      setCounts(held.summary);
      setVersion(held.version);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Make the corrections the checklist names, then read the manifest again.',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  if (loading && counts === null) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={24} />
          <Typography variant="body2">Cerulea is reading the manifest.</Typography>
        </Stack>
      </Box>
    );
  }

  if (failure) {
    return (
      <Alert severity="warning" data-testid="manifest-summary-failure">
        <AlertTitle>{failure.message}</AlertTitle>
        {failure.fix}
      </Alert>
    );
  }

  if (counts === null) return null;

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="manifest-summary">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          What this deployment installs
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {version !== null && <Chip size="small" label={`Version ${version}`} />}
          <Button size="small" onClick={() => void read()} disabled={loading}>
            Read again
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {summaryHeadline(counts)}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
        }}
      >
        {summaryLines(counts).map((line) => (
          <Paper key={line.heading} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {line.count}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {line.heading}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {line.states}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => onOpenScreen?.(line.screen)}
              disabled={onOpenScreen === undefined}
            >
              {line.screen}
            </Button>
          </Paper>
        ))}
      </Box>
    </Paper>
  );
}
