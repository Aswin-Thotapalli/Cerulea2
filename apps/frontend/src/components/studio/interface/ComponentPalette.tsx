'use client';

// apps/frontend/src/components/studio/interface/ComponentPalette.tsx
// The component set a person places on a screen.
// The engine publishes fifty two components across six groups. The palette
// shows each one with a sentence stating what it does and what it reads.
// Without the palette a person would guess which component fits a field.

import { Box, Chip, List, ListItemButton, ListItemText, Typography } from '@mui/material';

import { GROUP_WORDS, componentsByGroup } from '@/lib/interface/authoring';
import type { ComponentEntry } from '@/lib/interface/types';

export type ComponentPaletteProps = {
  components: ComponentEntry[];
  /** The component the person is looking at. */
  chosen?: string;
  onChoose: (component: ComponentEntry) => void;
};

/** The words a person reads for what one component binds to. */
export function bindsWords(binds: string): string {
  switch (binds) {
    case 'collection':
      return 'Reads a collection';
    case 'field':
      return 'Collects one field';
    case 'action':
      return 'Runs an action';
    case 'workflow':
      return 'Follows a workflow';
    default:
      return 'Reads nothing';
  }
}

export default function ComponentPalette({
  components,
  chosen,
  onChoose,
}: ComponentPaletteProps) {
  const groups = componentsByGroup(components);
  return (
    <Box data-testid="component-palette">
      {groups.map((group) => (
        <Box key={group.group} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
            {GROUP_WORDS[group.group] ?? group.group}
          </Typography>
          <List dense disablePadding aria-label={`${group.label} components`}>
            {group.entries.map((entry) => (
              <ListItemButton
                key={entry.kind}
                selected={entry.kind === chosen}
                onClick={() => onChoose(entry)}
                aria-label={entry.kind}
              >
                <ListItemText
                  primary={entry.kind}
                  secondary={entry.summary}
                  slotProps={{ secondary: { variant: 'caption' } }}
                />
                <Chip size="small" label={bindsWords(entry.binds)} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );
}
