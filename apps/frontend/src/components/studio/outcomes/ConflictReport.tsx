'use client';

// The conflict report.
// Cerulea states every conflict in plain language, names what stops working and
// offers the fix. A blocking conflict stops deployment. An advisory conflict is
// worth reading before we deploy.

import React from 'react';
import { Alert, AlertTitle, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import type { Conflict, ConflictFix } from '@/lib/outcomes/conflicts';
import { hasBlockingConflict } from '@/lib/outcomes/conflicts';

const SurfaceCard = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

export type ConflictReportProps = {
  conflicts: Conflict[];
  /** Applies the fix the user picked. */
  onApplyFix?: (conflict: Conflict, fix: ConflictFix) => void;
};

export default function ConflictReport({ conflicts, onApplyFix }: ConflictReportProps) {
  if (conflicts.length === 0) {
    return (
      <Alert severity="success" variant="outlined" icon={<CheckCircleOutlineIcon />}>
        <AlertTitle>Nothing blocks this project</AlertTitle>
        Every part this project needs is present and every part installs in a safe order.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <SurfaceCard>
        <Typography variant="h6" fontWeight={800}>
          What needs attention
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {hasBlockingConflict(conflicts)
            ? 'Deployment waits until every blocking line below is cleared.'
            : 'Nothing blocks deployment. Read the lines below before we deploy.'}
        </Typography>
      </SurfaceCard>

      {conflicts.map((conflict) => (
        <Alert
          key={conflict.conflictId}
          severity={conflict.severity === 'blocking' ? 'error' : 'warning'}
          variant="outlined"
          data-testid="conflict"
        >
          <AlertTitle>
            <Stack direction="row" spacing={1} alignItems="center">
              <span>{conflict.title}</span>
              <Chip
                size="small"
                variant="outlined"
                label={conflict.severity === 'blocking' ? 'Stops deployment' : 'Worth reading'}
              />
            </Stack>
          </AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {conflict.detail}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {conflict.fixes.map((fix) => (
              <Button
                key={fix.label}
                size="small"
                variant={fix.kind === 'none' ? 'text' : 'outlined'}
                disabled={fix.kind === 'none'}
                onClick={() => onApplyFix?.(conflict, fix)}
              >
                {fix.label}
              </Button>
            ))}
          </Stack>
        </Alert>
      ))}
    </Stack>
  );
}
