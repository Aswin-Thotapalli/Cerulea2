'use client';

// apps/frontend/src/components/studio/steps/step0-NetworkPanel.tsx
// The technical side of the Foundation details.
// The production panel asked for an agreement protocol, a token and gas. None
// of those exist in Cerulea. The panel now states the network with the reason
// it was derived, lets the person change it where the application allows, and
// sets the two network properties, each beside a plain sentence on what it
// does and what breaks when it is set wrongly.

import * as React from 'react';
import { Alert, Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type { Division } from '@/config/divisions';
import {
  BLOCK_SECONDS,
  HISTORY_RETENTION_DAYS,
  boundFix,
  describeBlockSeconds,
  describeRetention,
  type ControlWording,
} from '@/lib/studio/foundation-controls';
import type { TrackDerivation } from '@/lib/track/derive';
import TrackChoice from '@/components/studio/entry/TrackChoice';

export const DIVISION_BADGE: Record<Division, string> = {
  dapp: 'Cerulea for Dapps',
  enterprise: 'Cerulea for Enterprise',
  govt: 'Cerulea for Government',
};

export type NetworkPanelProps = {
  division: Division | null;
  derivation: TrackDerivation;
  onDerivationChange: (next: TrackDerivation) => void;
  publishSelected: boolean;
  onPublishSelectedChange: (next: boolean) => void;
  /** The plan line shown when the chosen network needs a plan the account holds no tier for. */
  planNote: string | null;
  blockSeconds: number;
  onBlockSecondsChange: (next: number) => void;
  historyRetentionDays: number;
  onHistoryRetentionDaysChange: (next: number) => void;
};

function PropertyField({
  control,
  value,
  onChange,
  describe,
  testId,
}: {
  control: ControlWording;
  value: number;
  onChange: (next: number) => void;
  describe: (value: number) => string;
  testId: string;
}) {
  const fix = boundFix(value, control);
  return (
    <Box>
      <TextField
        type="number"
        size="small"
        fullWidth
        label={control.label}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(Number(event.target.value))}
        error={fix !== null}
        helperText={fix ?? describe(value)}
        inputProps={{ min: control.bound.least, max: control.bound.most, 'data-testid': testId }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
        {control.does}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5, opacity: 0.8 }}>
        {control.breaks}
      </Typography>
    </Box>
  );
}

export default function NetworkPanel({
  division,
  derivation,
  onDerivationChange,
  publishSelected,
  onPublishSelectedChange,
  planNote,
  blockSeconds,
  onBlockSecondsChange,
  historyRetentionDays,
  onHistoryRetentionDaysChange,
}: NetworkPanelProps) {
  const theme = useTheme();
  return (
    <Stack spacing={2.5}>
      {division && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={DIVISION_BADGE[division]}
            data-testid="division-badge"
            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}
          />
          <Typography variant="caption" color="text.secondary">
            The project belongs to the division of the address it was opened under.
          </Typography>
        </Stack>
      )}

      <TrackChoice
        derivation={derivation}
        onChange={onDerivationChange}
        publishSelected={publishSelected}
        onPublishSelectedChange={onPublishSelectedChange}
      />
      {planNote && (
        <Alert severity="warning" variant="outlined" data-testid="plan-note">
          {planNote}
        </Alert>
      )}

      <PropertyField
        control={BLOCK_SECONDS}
        value={blockSeconds}
        onChange={onBlockSecondsChange}
        describe={describeBlockSeconds}
        testId="block-seconds"
      />
      <PropertyField
        control={HISTORY_RETENTION_DAYS}
        value={historyRetentionDays}
        onChange={onHistoryRetentionDaysChange}
        describe={describeRetention}
        testId="history-retention-days"
      />
    </Stack>
  );
}
