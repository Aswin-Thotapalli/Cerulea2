'use client';

// apps/frontend/src/components/studio/manifest/IntentReconciliation.tsx
// Intent reconciliation against the stated goal.
// A person stated a goal in plain language at the entry door. Cerulea checks
// the manifest against that statement and reports what looks absent, naming
// the words that raised each subject and the screen that closes the gap.
// The matcher is deterministic, so the same statement reads the same way every
// time. Cerulea Intelligence enriches the report once the intelligence routes
// answer.
// Without this check a person would compare the manifest against memory.

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
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import { reconcileIntent, type Reconciliation } from '@/lib/manifest/reconcile';
import type { AtomicReply } from '@/lib/manifest/types';

export default function IntentReconciliation({
  projectId,
  statement,
  outcomeNames = [],
  onOpenScreen,
}: {
  projectId: string;
  /** The plain-language goal the person stated at the entry door. */
  statement: string;
  outcomeNames?: string[];
  onOpenScreen?: (screen: string) => void;
}) {
  const [reading, setReading] = useState<AtomicReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      const held = await api<AtomicReply>(
        `/api/projects/${encodeURIComponent(projectId)}/manifest?view=atomic`,
      );
      if (held.manifest === undefined || held.manifest === null) {
        setFailure({
          message: 'Cerulea answered with no manifest for this project.',
          fix: 'Read the manifest again. Report the problem to the Cerulea operator when it repeats.',
        });
        return;
      }
      setReading(held);
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

  const held: Reconciliation | null = useMemo(
    () =>
      reading === null ? null : reconcileIntent(statement, reading.manifest, outcomeNames),
    [outcomeNames, reading, statement],
  );

  if (loading && reading === null) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={24} />
          <Typography variant="body2">Cerulea is checking the manifest against the goal.</Typography>
        </Stack>
      </Box>
    );
  }

  if (failure) {
    return (
      <Alert severity="warning" data-testid="reconciliation-failure">
        <AlertTitle>{failure.message}</AlertTitle>
        {failure.fix}
      </Alert>
    );
  }

  if (held === null) return null;

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="intent-reconciliation">
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
        The manifest against the goal we stated
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} data-testid="reconciliation-headline">
        {held.headline}
      </Typography>

      {statement.trim().length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>
            The goal stated at the start
          </Typography>
          <Typography variant="body2">{statement}</Typography>
        </Paper>
      )}

      {held.flags.length === 0 ? (
        <Alert severity="success" data-testid="reconciliation-clear">
          <AlertTitle>Nothing the goal named looks absent</AlertTitle>
          Every subject the statement raised is present in the manifest.
        </Alert>
      ) : (
        <List dense disablePadding data-testid="reconciliation-flags">
          {held.flags.map((flag) => (
            <ListItem
              key={flag.subjectId}
              disableGutters
              alignItems="flex-start"
              data-flag={flag.subjectId}
              secondaryAction={
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onOpenScreen?.(flag.screen)}
                  disabled={onOpenScreen === undefined}
                >
                  {flag.screen}
                </Button>
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {flag.label}
                    </Typography>
                    {flag.raisedBy.map((word) => (
                      <Chip key={word} size="small" label={word} />
                    ))}
                  </Stack>
                }
                secondary={
                  <Box component="span" sx={{ display: 'block' }}>
                    <Typography component="span" variant="body2" display="block">
                      {flag.absent}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {flag.fix}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {held.answered.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
            Present in the manifest
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {held.answered.map((entry) => (
              <Chip key={entry.subjectId} size="small" color="success" label={entry.label} />
            ))}
          </Stack>
        </Box>
      )}

      {held.unmatchedWords.length > 0 && (
        <Box sx={{ mt: 2 }} data-testid="reconciliation-unmatched">
          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
            Words of the goal nothing in the manifest answers
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {held.unmatchedWords.map((word) => (
              <Chip key={word} size="small" variant="outlined" label={word} />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Each word above appears in the goal and nowhere in the manifest. Add the part that
            carries it, or reword the goal.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
