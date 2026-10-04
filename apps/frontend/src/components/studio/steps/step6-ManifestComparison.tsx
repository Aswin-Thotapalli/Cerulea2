'use client';

// apps/frontend/src/components/studio/steps/step6-ManifestComparison.tsx
// The Deployment Manifest, comparison view.
// The current manifest set against the previous deployment, showing
// additions, removals and changes. A reviewer reads what moved since the last
// deployment rather than reading the whole system again.
// Every line names the screen that produces it.
// Without this view every deployment would be reviewed from the start.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import { mirrorFor } from '@/lib/studio/mirror';
import {
  COMPARISON_BANDS,
  comparisonHeadline,
  screenForComparisonLine,
  type ComparisonBand,
} from '@/lib/manifest/comparison';
import type { ComparisonReply, ManifestComparison } from '@/lib/manifest/types';

type Version = { version: number; note: string; createdAt: string };

export default function ManifestComparisonView({
  projectId,
  onOpenScreen,
}: {
  projectId: string;
  onOpenScreen?: (screen: string) => void;
}) {
  const [comparison, setComparison] = useState<ManifestComparison | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [against, setAgainst] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  useEffect(() => {
    void api<{ versions: Version[] }>(
      `/api/projects/${encodeURIComponent(projectId)}/blueprint/versions`,
    )
      .then((held) => {
        setVersions(held.versions ?? []);
        const previous = (held.versions ?? [])
          .map((entry) => entry.version)
          .sort((left, right) => right - left)[1];
        if (previous !== undefined) setAgainst(String(previous));
      })
      .catch(() => setVersions([]));
  }, [projectId]);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      const suffix = against.length > 0 ? `&against=${encodeURIComponent(against)}` : '';
      const held = await api<ComparisonReply>(
        `/api/projects/${encodeURIComponent(projectId)}/manifest?view=comparison${suffix}`,
      );
      if (held.comparison === undefined || held.comparison === null) {
        setFailure({
          message: 'Cerulea answered with no comparison for this project.',
          fix: 'Read the comparison again. Report the problem to the Cerulea operator when it repeats.',
        });
        return;
      }
      setComparison(held.comparison);
      setVersion(held.version);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Make the corrections the checklist names, then read the comparison again.',
      });
    } finally {
      setLoading(false);
    }
  }, [against, projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  const bands = useMemo(() => {
    if (comparison === null) return [];
    return COMPARISON_BANDS.map((band) => ({
      band,
      lines: comparison[band.key],
    }));
  }, [comparison]);

  if (loading && comparison === null) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={24} />
          <Typography variant="body2">Cerulea is setting the two manifests side by side.</Typography>
        </Stack>
      </Box>
    );
  }

  if (failure) {
    return (
      <Alert severity="warning" data-testid="manifest-comparison-failure">
        <AlertTitle>{failure.message}</AlertTitle>
        {failure.fix}
      </Alert>
    );
  }

  if (comparison === null) return null;

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="manifest-comparison">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          What moved since the previous deployment
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {version !== null && <Chip size="small" label={`Version ${version}`} />}
          <Button size="small" onClick={() => void read()} disabled={loading}>
            Read again
          </Button>
        </Stack>
      </Stack>

      <TextField
        select
        size="small"
        label="Set against"
        value={against}
        onChange={(event) => setAgainst(event.target.value)}
        helperText={mirrorFor('manifest.comparison_version').does}
        sx={{ minWidth: 320, mb: 1 }}
        inputProps={{ 'aria-label': 'Set against' }}
      >
        <MenuItem value="">No earlier version</MenuItem>
        {versions.map((entry) => (
          <MenuItem key={entry.version} value={String(entry.version)}>
            {`Version ${entry.version}. ${entry.note || 'No note'}`}
          </MenuItem>
        ))}
      </TextField>
      <Box data-mirror="manifest.comparison_version" sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {mirrorFor('manifest.comparison_version').breaks}
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
        data-testid="comparison-headline"
      >
        {comparisonHeadline(comparison)}
      </Typography>

      {bands.map(({ band, lines }) => (
        <Box key={band.key} sx={{ mb: 3 }} data-band={band.key}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {band.heading}
            </Typography>
            <Chip size="small" color={band.colour} label={`${lines.length}`} />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {band.states}
          </Typography>
          {lines.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {band.whenEmpty}
            </Typography>
          ) : (
            <List dense disablePadding>
              {lines.map((line) => (
                <ListItem
                  key={`${band.key}-${line}`}
                  disableGutters
                  data-comparison-line={line}
                  secondaryAction={
                    <Button
                      size="small"
                      onClick={() => onOpenScreen?.(screenForComparisonLine(line))}
                      disabled={onOpenScreen === undefined}
                    >
                      {screenForComparisonLine(line)}
                    </Button>
                  }
                >
                  <ListItemText primary={line} />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      ))}
    </Paper>
  );
}

export type { ComparisonBand };
