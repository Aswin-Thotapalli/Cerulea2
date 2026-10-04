'use client';

// apps/frontend/src/components/studio/steps/step3-GovernmentPosture.tsx
// The Government posture of one system, shown on the Economics step.
// Section 11.9 makes four things standard rather than optional. The air-gapped
// installation, the residency lock, multi-organisation governance and the
// extended retention defaults. Every one appears here, the person names the
// organisations and the jurisdiction, and the Governance section records the
// result. The Deployment Manifest reads the same lines.
// Without this surface a public body would read the posture in the manifest
// alone, after the work was finished.

import { useMemo } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { organisationTitlesFor, postureFor, postureLines } from './step3-posture';

export default function GovernmentPosture({
  templateId,
  organisations,
  jurisdiction,
  onOrganisations,
  onJurisdiction,
}: {
  /** The template this system started from. */
  templateId: string;
  /** The organisations that agree to a structural change. */
  organisations: string[];
  /** The jurisdiction storage and processing stay inside. */
  jurisdiction: string;
  onOrganisations: (next: string[]) => void;
  onJurisdiction: (next: string) => void;
}) {
  const lines = useMemo(
    () => postureLines({ templateId, organisations, jurisdiction }),
    [templateId, organisations, jurisdiction],
  );
  const held = useMemo(() => postureFor(templateId), [templateId]);
  const proposed = useMemo(() => organisationTitlesFor(templateId), [templateId]);

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
                    label={line.standard ? 'Standard' : 'Set on the Foundation step'}
                  />
                </Stack>
              }
              secondary={line.states}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
        <Autocomplete
          multiple
          freeSolo
          options={proposed}
          value={organisations}
          onChange={(_, value) =>
            onOrganisations(
              value
                .map((entry) => String(entry).trim())
                .filter((entry, index, all) => entry.length > 0 && all.indexOf(entry) === index),
            )
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label="Organisations that agree to a change"
              placeholder="Type a name and press Enter"
              helperText={
                organisations.length > 0
                  ? `${organisations.length} ${organisations.length === 1 ? 'organisation' : 'organisations'} named. A structural change needs agreement across them.`
                  : 'Name at least two organisations. Every structural change needs agreement across them.'
              }
            />
          )}
        />
        <TextField
          size="small"
          label="Jurisdiction"
          placeholder="India"
          value={jurisdiction}
          onChange={(e) => onJurisdiction(e.target.value)}
          helperText="Storage and processing stay inside this jurisdiction."
        />
      </Box>

      {held && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Agreement the template states per class
          </Typography>
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
    </Paper>
  );
}
