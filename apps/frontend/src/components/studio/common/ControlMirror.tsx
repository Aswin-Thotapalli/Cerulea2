'use client';

// apps/frontend/src/components/studio/common/ControlMirror.tsx
// The plain sentence under one control.
// Every technical setting carries a sentence stating what the setting does and
// a sentence stating what breaks without it. A control standing for a module
// reads both from the module catalogue.
// Without this component a person meets a label and a number with no meaning.

import { Box, Typography } from '@mui/material';

import { mirrorFor } from '@/lib/studio/mirror';

export default function ControlMirror({
  controlId,
  dense = false,
}: {
  /** The control this mirror belongs to, or the module it stands for. */
  controlId: string;
  dense?: boolean;
}) {
  const held = mirrorFor(controlId);
  return (
    <Box data-mirror={controlId} sx={{ mt: dense ? 0.25 : 0.75 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {held.does}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {held.breaks}
      </Typography>
    </Box>
  );
}
