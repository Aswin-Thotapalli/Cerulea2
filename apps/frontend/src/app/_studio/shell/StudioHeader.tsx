'use client';

import React from 'react';
import { AppBar, Toolbar, Box, Typography, IconButton, LinearProgress } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { getStepLabel, TOTAL_STEPS } from './StepRegistry';

type Props = {
  step: number;
  onPrev: () => void;
  onNext: () => void;
  projectId?: string | null;
  autosaveLabel?: string; // e.g., "Saved • 14:03:11"
  busy?: boolean;         // show a thin progress when saving/loading
};

export default function StudioHeader({
  step,
  onPrev,
  onNext,
  projectId,
  autosaveLabel,
  busy = false,
}: Props) {
  const pct = (Math.min(Math.max(step, 1), TOTAL_STEPS) / TOTAL_STEPS) * 100;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        backdropFilter: 'blur(14px)',
        backgroundColor: (t) => t.palette.background.paper + 'CC',
        borderBottom: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      <Toolbar sx={{ minHeight: 56, display: 'flex', gap: 1 }}>
        <IconButton color="inherit" onClick={onPrev} size="small" aria-label="Previous step">
          <ArrowBackIosNewIcon fontSize="inherit" />
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap fontWeight={600}>
            Step {step} of {TOTAL_STEPS} — {getStepLabel(step)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {projectId ? `Project: ${projectId}` : 'No project selected'}
            {autosaveLabel ? ` • ${autosaveLabel}` : ''}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 3, borderRadius: 1, mt: 0.5 }}
          />
        </Box>

        <IconButton color="inherit" aria-label="Open AI">
          <SmartToyOutlinedIcon />
        </IconButton>
      </Toolbar>
      {busy && <LinearProgress />}
    </AppBar>
  );
}
