'use client';

// apps/frontend/src/components/studio/levels/LevelSwitch.tsx
// The control that moves a person between the four disclosure levels.
// Every level writes the same Blueprint. Moving between them changes what
// Cerulea shows and changes nothing about the system itself.
// Without this control a person would meet one fixed depth whatever the work.

import {
  Box,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  DISCLOSURE_LEVELS,
  describeLevel,
  type DisclosureLevel,
} from '@/lib/studio/disclosure';

export default function LevelSwitch({
  level,
  onLevelChange,
  saving,
}: {
  level: DisclosureLevel;
  onLevelChange: (next: DisclosureLevel) => void;
  saving?: boolean;
}) {
  const held = describeLevel(level);
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          How much we show
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={level}
          aria-label="How much we show"
          onChange={(_event, next) => {
            if (next !== null) onLevelChange(next as DisclosureLevel);
          }}
        >
          {DISCLOSURE_LEVELS.map((entry) => (
            <Tooltip key={entry.level} title={entry.shows}>
              <ToggleButton value={entry.level} disabled={saving === true}>
                {entry.label}
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
        <Chip size="small" label={held.audience} />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        {held.shows} {held.holdsBack}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Every level writes the same Blueprint. Moving between them changes nothing in the system.
      </Typography>
    </Box>
  );
}
