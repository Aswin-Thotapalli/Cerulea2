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

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertTitle, Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';

import Step2Compose from '@/components/studio/steps6/Step2Compose';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { outcomesForModules } from '@/lib/outcomes/reflect';
import { summariseBlueprint, type SummaryLine } from '@/lib/blueprint/summary';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { api } from '@/lib/apiClient';
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
  const [summary, setSummary] = useState<SummaryLine[]>([]);

  useEffect(() => {
    let cancelled = false;
    void api<{ version: number; document: unknown }>(
      `/api/projects/${encodeURIComponent(projectId)}/blueprint`,
    )
      .then((held) => {
        if (cancelled) return;
        setSummary(
          summariseBlueprint(
            readBlueprintDocument(held.document, buildState.foundation.projectName),
          ),
        );
      })
      .catch(() => setSummary([]));
    return () => {
      cancelled = true;
    };
  }, [buildState.foundation.projectName, projectId]);

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
      {summary.some((line) => line.count > 0) && (
        <Box sx={{ px: 4, pt: 3 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="level-two-summary">
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              What this system holds now
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Every level writes the same Blueprint. A change made in the designer or in the typed
              document appears here.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {summary
                .filter((line) => line.count > 0)
                .map((line) => (
                  <Box key={line.section}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {line.heading}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {line.sentence}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                      {line.names.slice(0, 12).map((name) => (
                        <Chip key={name} size="small" label={name} />
                      ))}
                    </Stack>
                  </Box>
                ))}
            </Stack>
          </Paper>
        </Box>
      )}
      <Step2Compose projectId={projectId} onContinue={onContinue} />
    </Box>
  );
}
