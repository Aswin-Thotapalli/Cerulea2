'use client';

// The network control.
// Cerulea derives the network from the application and from the starting point,
// states the reason and lets the user change it.
// Cerulea for Government holds a private Blockchain network, so this control
// states the network and asks nothing.

import React from 'react';
import {
  Alert,
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
} from '@mui/material';

import type { ProjectTrack } from '@/lib/catalogue/types';
import { applyTrackOverride, type TrackDerivation } from '@/lib/track/derive';

export type TrackChoiceProps = {
  derivation: TrackDerivation;
  onChange: (next: TrackDerivation) => void;
  /** Set when the project may publish chosen records to the public-access chain. */
  publishSelected?: boolean;
  onPublishSelectedChange?: (next: boolean) => void;
};

export default function TrackChoice({
  derivation,
  onChange,
  publishSelected = false,
  onPublishSelectedChange,
}: TrackChoiceProps) {
  const pick = React.useCallback(
    (track: ProjectTrack) => onChange(applyTrackOverride(derivation, track)),
    [derivation, onChange],
  );

  return (
    <Box>
      <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block' }}>
        The network
      </Typography>

      {!derivation.questionShown ? (
        <Alert severity="info" variant="outlined" sx={{ mt: 1 }} data-testid="track-statement">
          <Typography variant="body2" fontWeight={700}>
            {derivation.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {derivation.reason} {derivation.meaning}
          </Typography>
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
            {derivation.reason} We change this at any time.
          </Typography>
          <RadioGroup
            value={derivation.track}
            onChange={(event) => pick(event.target.value as ProjectTrack)}
          >
            {derivation.options.map((option) => (
              <FormControlLabel
                key={option.track}
                value={option.track}
                control={<Radio />}
                label={
                  <Stack>
                    <Typography variant="body2" fontWeight={700}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.meaning}
                    </Typography>
                  </Stack>
                }
                sx={{ alignItems: 'flex-start', mb: 1 }}
              />
            ))}
          </RadioGroup>

          {derivation.publishSelectedRecords && (
            <FormControlLabel
              control={
                <Switch
                  checked={publishSelected}
                  onChange={(event) => onPublishSelectedChange?.(event.target.checked)}
                  slotProps={{
                    input: { 'aria-label': 'Publish chosen records to the public-access chain' },
                  }}
                />
              }
              label={
                <Stack>
                  <Typography variant="body2" fontWeight={700}>
                    Publish chosen records to the public-access chain
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {derivation.publishNote}
                  </Typography>
                </Stack>
              }
              sx={{ alignItems: 'flex-start', mt: 1 }}
            />
          )}
        </>
      )}
    </Box>
  );
}
