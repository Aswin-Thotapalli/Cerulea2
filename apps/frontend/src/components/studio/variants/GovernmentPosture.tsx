'use client';

// apps/frontend/src/components/studio/variants/GovernmentPosture.tsx
// The Government posture of one system.
// Section 11.9 makes four things standard rather than optional. The air-gapped
// installation, the residency lock, multi-organisation governance and the
// extended retention defaults. Every one of them appears here and every one of
// them appears in the Deployment Manifest.
// Without this surface a public body would read the posture in the manifest
// alone, after the work was finished.

import { useMemo } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { organisationCountFor, postureFor, postureLines } from '@/lib/variants/government';

export default function GovernmentPosture({
  templateId,
}: {
  /** The Government template this system started from. */
  templateId: string;
}) {
  const lines = useMemo(() => postureLines(templateId), [templateId]);
  const held = useMemo(() => postureFor(templateId), [templateId]);

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="government-posture">
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        What Cerulea for Government holds as standard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each of these is standard rather than optional. The Deployment Manifest records every one
        of them, so a reviewer reads the position rather than asking for it.
      </Typography>

      <List dense disablePadding>
        {lines.map((line) => (
          <ListItem key={line.id} disableGutters alignItems="flex-start" data-posture={line.id}>
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {line.heading}
                  </Typography>
                  <Chip
                    size="small"
                    color={line.standard ? 'success' : 'default'}
                    label={line.standard ? 'Standard' : 'Set on the foundation screen'}
                  />
                </Stack>
              }
              secondary={line.states}
            />
          </ListItem>
        ))}
      </List>

      {held && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Organisations that agree to a change
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {held.governance.organisations.map((organisation) => (
              <Chip key={organisation.id} label={organisation.title} />
            ))}
          </Stack>
          <List dense disablePadding>
            {held.governance.quorum.map((entry) => (
              <ListItem key={entry.class} disableGutters data-quorum={entry.class}>
                <ListItemText
                  primary={`${entry.class} needs ${entry.threshold_percent} percent across ${entry.minimum_organisations} ${entry.minimum_organisations === 1 ? 'organisation' : 'organisations'}`}
                  secondary={entry.summary}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {held && held.deployment.retention.extended.length > 0 && (
        <Box sx={{ mt: 2 }} data-testid="government-retention">
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Collections holding records for longer
          </Typography>
          <List dense disablePadding>
            {held.deployment.retention.extended.map((entry) => (
              <ListItem key={entry.collection} disableGutters>
                <ListItemText
                  primary={`${entry.collection}, ${entry.years} years`}
                  secondary={entry.statement}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {held === undefined && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>This system started from no Government template</AlertTitle>
          The posture above still holds. Name the {organisationCountFor(templateId)} organisations
          that agree to a change on the policies screen.
        </Alert>
      )}
    </Paper>
  );
}
