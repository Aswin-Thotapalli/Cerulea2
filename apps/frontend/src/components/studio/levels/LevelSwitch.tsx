'use client';

// apps/frontend/src/components/studio/levels/LevelSwitch.tsx
// The control that moves a person between the four disclosure levels.
// Every level writes the same Blueprint. Moving between them changes what
// Cerulea shows and changes nothing about the system itself.
// It sits in the slim bar above the step content, where production placed its
// progress bar across the steps.
// Without this control a person would meet one fixed depth whatever the work.

import {
  Box,
  Button,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';

import {
  DISCLOSURE_LEVELS,
  describeLevel,
  levelOpens,
  type DisclosureLevel,
} from '@/lib/studio/disclosure';

export default function LevelSwitch({
  level,
  onLevelChange,
  onOpenDocument,
  documentOpen,
  saving,
}: {
  level: DisclosureLevel;
  onLevelChange: (next: DisclosureLevel) => void;
  /** Opens the typed document view. Level four alone offers it. */
  onOpenDocument?: () => void;
  documentOpen?: boolean;
  saving?: boolean;
}) {
  const held = describeLevel(level);
  return (
    <Box
      data-testid="level-switch"
      sx={{
        px: 2,
        py: 1,
        borderBottom: '0.5px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
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
            <Tooltip key={entry.level} title={entry.shows} describeChild>
              <ToggleButton value={entry.level} disabled={saving === true} sx={{ py: 0.25, px: 1.25 }}>
                {entry.label}
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
        <Chip size="small" label={held.audience} />
        {levelOpens(level, 'document') && onOpenDocument && (
          <Tooltip title="Read and edit the typed document every level writes" describeChild>
            <Button
              size="small"
              variant={documentOpen ? 'contained' : 'outlined'}
              startIcon={<ArticleOutlinedIcon />}
              onClick={onOpenDocument}
              sx={{ borderRadius: 1, fontSize: '0.7rem', fontWeight: 700, px: 1.5, py: 0.25 }}
            >
              {documentOpen ? 'Back to the steps' : 'The Blueprint document'}
            </Button>
          </Tooltip>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {held.shows} Every level writes the same Blueprint.
        </Typography>
      </Stack>
    </Box>
  );
}
