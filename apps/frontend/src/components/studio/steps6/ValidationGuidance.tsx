'use client';

// apps/frontend/src/components/studio/steps6/ValidationGuidance.tsx
// Validation as guidance.
// Every correction renders with the sentence naming the fix and, wherever
// Cerulea carries the correction out on its own, one action that performs it
// on the Blueprint. Every line names the screen that produces it.
// Without this surface a person would read what to do and then hunt for the
// place to do it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import type { CompilerReport } from '@/lib/cerulea-api';
import {
  fixFor,
  guidanceFor,
  guidanceHeadline,
  type GuidanceEntry,
} from '@/lib/blueprint/guidance';
import { useProjectState } from '@/lib/studio/project-state';

export default function ValidationGuidance({
  projectId,
  onChanged,
}: {
  projectId: string;
  onChanged?: () => void;
}) {
  const handle = useProjectState(projectId);
  const [report, setReport] = useState<CompilerReport | null>(null);
  const [checking, setChecking] = useState(true);
  const [applied, setApplied] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
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
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Check the Blueprint again in a moment.',
      });
    } finally {
      setChecking(false);
    }
  }, [projectId]);

  useEffect(() => {
    void check();
  }, [check]);

  const blueprint = handle.state?.blueprint ?? null;

  const entries: GuidanceEntry[] = useMemo(
    () => (blueprint ? guidanceFor(blueprint, report) : []),
    [blueprint, report],
  );

  const apply = async (entry: GuidanceEntry) => {
    if (!blueprint) return;
    const held = fixFor(entry, blueprint);
    if (!held) return;
    setApplied(null);
    const wrote = await handle.saveBlueprint(held.apply(blueprint), `Applied the fix for ${entry.code}`);
    if (!wrote) return;
    setApplied(held.plain);
    await check();
    if (onChanged) onChanged();
  };

  if (handle.loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={24} />
          <Typography variant="body2">Cerulea is checking the Blueprint.</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="validation-guidance">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Corrections to make
        </Typography>
        <Button size="small" onClick={() => void check()} disabled={checking}>
          Check again
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {blueprint ? guidanceHeadline(entries, blueprint) : 'Cerulea is reading the Blueprint.'}
      </Typography>

      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      {handle.failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{handle.failure.message}</AlertTitle>
          {handle.failure.fix}
        </Alert>
      )}

      {applied && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setApplied(null)}>
          <AlertTitle>Cerulea made the correction</AlertTitle>
          {applied}
        </Alert>
      )}

      {entries.length === 0 && failure === null && (
        <Alert severity="success">
          <AlertTitle>Nothing blocks deployment</AlertTitle>
          Every check over this Blueprint passes.
        </Alert>
      )}

      <List dense disablePadding>
        {entries.map((entry, index) => {
          const held = blueprint ? fixFor(entry, blueprint) : undefined;
          return (
            <Box key={`${entry.code}-${entry.path}-${index}`}>
              {index > 0 && <Divider component="li" sx={{ my: 1 }} />}
              <ListItem
                disableGutters
                alignItems="flex-start"
                data-entry-code={entry.code}
                secondaryAction={
                  held ? (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={handle.saving}
                      onClick={() => void apply(entry)}
                    >
                      {held.label}
                    </Button>
                  ) : undefined
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {entry.message}
                      </Typography>
                      <Chip
                        size="small"
                        color={entry.severity === 'error' ? 'warning' : 'default'}
                        label={entry.severity === 'error' ? 'Blocks deployment' : 'Worth a look'}
                      />
                      <Chip size="small" variant="outlined" label={entry.screen} />
                    </Stack>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'block' }}>
                      <Typography component="span" variant="body2" display="block">
                        {entry.fix}
                      </Typography>
                      {held && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {held.plain}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            </Box>
          );
        })}
      </List>
    </Paper>
  );
}
