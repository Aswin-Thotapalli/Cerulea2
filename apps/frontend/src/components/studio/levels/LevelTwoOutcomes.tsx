'use client';

// apps/frontend/src/components/studio/levels/LevelTwoOutcomes.tsx
// Disclosure level two, the outcome level.
// A person reads the statements this system delivers and the map of the parts
// Cerulea assembled for them. Fields, roles and workflow states stay out of
// sight here.
// A project built at level one carries parts and no statement. This level
// reads the statements back from those parts, so the map explains the system
// somebody already has.
// Without this level a business owner would meet the record editor first.

import { useMemo } from 'react';
import { Alert, AlertTitle, Box, Chip, Paper, Stack, Typography } from '@mui/material';

import Step2Compose from '@/components/studio/steps6/Step2Compose';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { outcomesForModules } from '@/lib/outcomes/reflect';
import type { BuildState } from '@/lib/studio/project-state';

export default function LevelTwoOutcomes({
  projectId,
  buildState,
  onContinue,
}: {
  projectId: string;
  buildState: BuildState;
  onContinue?: () => void;
}) {
  const readBack = useMemo(
    () =>
      buildState.compose.outcomeIds.length === 0
        ? outcomesForModules(buildState.compose.moduleIds, SEED_MODULES)
        : [],
    [buildState.compose.moduleIds, buildState.compose.outcomeIds.length],
  );

  return (
    <Box>
      {readBack.length > 0 && (
        <Box sx={{ px: 4, pt: 3 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              What this system already delivers
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These statements explain the parts already installed. They came from the answers
              given at the questions level. Change any of them below.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {readBack.map((outcome) => (
                <Chip key={outcome.outcomeId} label={outcome.statement} />
              ))}
            </Stack>
          </Paper>
        </Box>
      )}
      {buildState.compose.moduleIds.length === 0 &&
        buildState.compose.outcomeIds.length === 0 && (
          <Box sx={{ px: 4, pt: 3 }}>
            <Alert severity="info">
              <AlertTitle>Nothing is installed yet</AlertTitle>
              Pick a statement below. Cerulea installs every part that statement needs and explains
              why each part is there.
            </Alert>
          </Box>
        )}
      <Step2Compose projectId={projectId} onContinue={onContinue} />
    </Box>
  );
}
