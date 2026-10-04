'use client';

// apps/frontend/src/components/studio/steps/step5-AccessibilityReport.tsx
// The accessibility check and the gate it holds.
// Cerulea checks contrast, focus order, labelling, keyboard reach and target
// size against the Web Content Accessibility Guidelines version 2.2 level AA.
// A failure blocks publication, and every finding names the fix.
// Without the report a person would publish a screen nobody reaches.

import { Alert, AlertTitle, Box, Chip, List, ListItem, ListItemText, Typography } from '@mui/material';

import { findingsByArea } from '@/lib/interface/authoring';
import type { AccessibilityOutcome } from '@/lib/interface/types';

export type AccessibilityReportProps = {
  outcome: AccessibilityOutcome;
};

/** The words a person reads for one area of the check. */
export const AREA_WORDS: Record<string, string> = {
  contrast: 'Contrast',
  focus_order: 'Focus order',
  labelling: 'Labelling',
  keyboard: 'Keyboard reach',
  target_size: 'Target size',
};

export default function AccessibilityReport({ outcome }: AccessibilityReportProps) {
  const areas = findingsByArea(outcome.findings);
  return (
    <Box data-testid="accessibility-report">
      <Alert severity={outcome.passes ? 'success' : 'error'}>
        <AlertTitle>{outcome.passes ? 'Ready to publish' : 'Publication waits'}</AlertTitle>
        {outcome.headline}
        {outcome.publication === undefined ? null : ` ${outcome.publication.fix}`}
      </Alert>
      {areas.length === 0 ? (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Every screen meets the guidelines. Nothing stands between this application and
          publication.
        </Typography>
      ) : (
        areas.map((area) => (
          <Box key={area.area} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" component="h3">
              {AREA_WORDS[area.area] ?? area.area}
              <Chip
                size="small"
                sx={{ ml: 1 }}
                color={area.failures > 0 ? 'error' : 'default'}
                label={`${area.failures} correction${area.failures === 1 ? '' : 's'}`}
              />
            </Typography>
            <List dense aria-label={`${AREA_WORDS[area.area] ?? area.area} findings`}>
              {area.entries.map((finding, position) => (
                <ListItem key={`${finding.component}-${position}`} disableGutters>
                  <ListItemText
                    primary={`${finding.screen} · ${finding.component}`}
                    secondary={`${finding.problem} ${finding.fix} Guideline: ${finding.guideline}.`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ))
      )}
    </Box>
  );
}
