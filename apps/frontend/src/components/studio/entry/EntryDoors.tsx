'use client';

// The three entry doors.
// Describe it, browse it, start fresh. A user picks the door that fits what
// they already know. Every door hands back the same answer shape.
// Without the doors Studio opens on a technical question a new user cannot
// answer yet.

import React from 'react';
import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import type { Catalogue, ProjectTrack } from '@/lib/catalogue/types';
import IntentDoor, { type IntentChoice } from './IntentDoor';
import TemplateGalleryDoor from './TemplateGalleryDoor';
import StartFreshDoor, { type StartFreshChoice } from './StartFreshDoor';

const Shell = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

export type EntryAnswer = {
  door: 'describe' | 'browse' | 'fresh';
  name?: string;
  description?: string;
  track: ProjectTrack;
  templateId: string;
  outcomeIds?: string[];
  moduleIds?: string[];
};

export type EntryDoorsProps = {
  onAnswer?: (answer: EntryAnswer) => void;
  /** Supplies the catalogue instead of reading it from the catalogue routes. Tests use this. */
  catalogue?: Catalogue;
};

const DOORS = ['describe', 'browse', 'fresh'] as const;

export default function EntryDoors({ onAnswer, catalogue }: EntryDoorsProps) {
  const [door, setDoor] = React.useState<(typeof DOORS)[number]>('describe');

  const fromIntent = React.useCallback(
    (choice: IntentChoice) => {
      onAnswer?.({
        door: 'describe',
        description: choice.description,
        track: choice.track,
        templateId: choice.templateId,
        outcomeIds: choice.outcomeIds,
      });
    },
    [onAnswer],
  );

  const fromGallery = React.useCallback(
    (choice: { templateId: string; track: ProjectTrack }) => {
      onAnswer?.({ door: 'browse', track: choice.track, templateId: choice.templateId });
    },
    [onAnswer],
  );

  const fromFresh = React.useCallback(
    (choice: StartFreshChoice) => {
      onAnswer?.({
        door: 'fresh',
        name: choice.name,
        track: choice.track,
        templateId: choice.templateId,
        moduleIds: choice.moduleIds,
      });
    },
    [onAnswer],
  );

  return (
    <Stack spacing={3}>
      <Shell>
        <Typography variant="h5" fontWeight={800}>
          Start a project
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          Three ways in. Describe what we want and Cerulea proposes a start. Browse the templates
          and pick one. Start fresh and shape the project ourselves. Every door reaches the same
          workspace.
        </Typography>
        <Tabs value={door} onChange={(_event, next) => setDoor(next)} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="describe" label="Describe it" />
          <Tab value="browse" label="Browse it" />
          <Tab value="fresh" label="Start fresh" />
        </Tabs>
      </Shell>

      <Box role="tabpanel">
        {door === 'describe' && <IntentDoor catalogue={catalogue} onAccept={fromIntent} />}
        {door === 'browse' && <TemplateGalleryDoor catalogue={catalogue} onChoose={fromGallery} />}
        {door === 'fresh' && <StartFreshDoor catalogue={catalogue} onStart={fromFresh} />}
      </Box>
    </Stack>
  );
}
