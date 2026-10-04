'use client';

// The triggers picker.
// A trigger says one part starts work in another without a person. Cerulea
// derives none of them. The picker lists only the pairs the catalogue records
// between parts this project holds, so an invalid pair never appears.
// Without a triggers link the work waits for a person instead.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material';

import type { TriggerPair } from '@/lib/map/triggers';

export type TriggersPickerProps = {
  pairs: TriggerPair[];
  /** The pairs already chosen, as from and to joined by an arrow. */
  chosen: string[];
  onToggle: (pair: TriggerPair, next: boolean) => void;
};

export default function TriggersPicker({ pairs, chosen, onToggle }: TriggersPickerProps) {
  if (pairs.length === 0) {
    return (
      <Alert severity="info" variant="outlined">
        <AlertTitle>No pair in this project can trigger another yet</AlertTitle>
        Add an outcome that brings a part which starts work elsewhere. The pairs then appear here.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        A trigger starts work automatically. Cerulea lists only the pairs the catalogue records, so
        every line here is a pair that works. Leave a line off and a person starts that work.
      </Typography>
      {pairs.map((pair) => {
        const key = `${pair.from}->${pair.to}`;
        return (
          <Paper key={key} variant="outlined" sx={{ p: 2, borderRadius: 3 }} data-testid="trigger-pair">
            <FormControlLabel
              control={
                <Switch
                  checked={chosen.includes(key)}
                  onChange={(event) => onToggle(pair, event.target.checked)}
                  slotProps={{
                    input: { 'aria-label': `${pair.fromTitle} triggers ${pair.toTitle}` },
                  }}
                />
              }
              label={
                <Stack>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={800}>
                      {pair.fromTitle}
                    </Typography>
                    <Chip size="small" variant="outlined" label="triggers" />
                    <Typography variant="body2" fontWeight={800}>
                      {pair.toTitle}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {pair.effect} {pair.reason}
                  </Typography>
                </Stack>
              }
              sx={{ alignItems: 'flex-start' }}
            />
          </Paper>
        );
      })}
    </Stack>
  );
}
