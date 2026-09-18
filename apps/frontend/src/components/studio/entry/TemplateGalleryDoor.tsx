'use client';

// The gallery door.
// A user browses the 100 Cerulea templates, searches them, narrows them by area
// and by difficulty, and starts from one.
// Every badge on a card is derived from the modules the template installs.
// Without the gallery a user picks a starting point with no comparison.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

import { loadCatalogue } from '@/lib/catalogue/load';
import type { Catalogue, ProjectTrack } from '@/lib/catalogue/types';
import {
  TRACK_LABEL,
  describeTemplates,
  filterTemplates,
  galleryAreas,
  type TemplateCard,
  type TemplateDifficulty,
} from '@/lib/templates/gallery';

const SurfaceCard = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

const TemplateTile = styled(Paper)(({ theme }) => ({
  padding: 20,
  borderRadius: 14,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

const DIFFICULTY_MEANING: Record<TemplateDifficulty, string> = {
  Starter: 'Few parts and few areas. A first project fits here.',
  Standard: 'More parts across more areas. Plan an afternoon.',
  Advanced: 'Many parts and many links. Plan a review with the team.',
};

export type TemplateGalleryDoorProps = {
  onChoose?: (choice: { templateId: string; track: ProjectTrack }) => void;
  /** Supplies the catalogue instead of reading it from the catalogue routes. Tests use this. */
  catalogue?: Catalogue;
};

export default function TemplateGalleryDoor({ onChoose, catalogue: supplied }: TemplateGalleryDoorProps) {
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(supplied ?? null);
  const [loadProblem, setLoadProblem] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [area, setArea] = React.useState<string>('any');
  const [track, setTrack] = React.useState<ProjectTrack | 'any'>('any');
  const [difficulty, setDifficulty] = React.useState<TemplateDifficulty | 'any'>('any');

  React.useEffect(() => {
    if (supplied) return;
    let live = true;
    loadCatalogue()
      .then((next) => {
        if (live) setCatalogue(next);
      })
      .catch((error: Error) => {
        if (live) setLoadProblem(error.message);
      });
    return () => {
      live = false;
    };
  }, [supplied]);

  const cards: TemplateCard[] = React.useMemo(
    () => (catalogue ? describeTemplates(catalogue.templates, catalogue.modules) : []),
    [catalogue],
  );

  const areas = React.useMemo(() => galleryAreas(cards), [cards]);

  const shown = React.useMemo(
    () =>
      filterTemplates(cards, {
        query,
        areas: area === 'any' ? [] : [area],
        track,
        difficulty,
      }),
    [area, cards, difficulty, query, track],
  );

  if (loadProblem) {
    return (
      <Alert severity="error" variant="outlined">
        <AlertTitle>Cerulea could not read the catalogue</AlertTitle>
        {loadProblem}
      </Alert>
    );
  }

  if (!catalogue) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 4 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Reading the Cerulea catalogue.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <SurfaceCard>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'primary.main', color: 'common.white', display: 'flex' }}>
            <ViewModuleIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Browse it
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Every template starts a project that already works. Pick the one closest to our idea.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="Search the templates"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            inputProps={{ 'aria-label': 'Search the templates' }}
          />
          <TextField
            select
            label="Area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="any">Every area</MenuItem>
            {areas.map((entry) => (
              <MenuItem key={entry.area} value={entry.area}>
                {entry.area} ({entry.count})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Network"
            value={track}
            onChange={(event) => setTrack(event.target.value as ProjectTrack | 'any')}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="any">Either network</MenuItem>
            <MenuItem value="blockchain">{TRACK_LABEL.blockchain}</MenuItem>
            <MenuItem value="dapp">{TRACK_LABEL.dapp}</MenuItem>
          </TextField>
          <TextField
            select
            label="Difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as TemplateDifficulty | 'any')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="any">Every level</MenuItem>
            <MenuItem value="Starter">Starter</MenuItem>
            <MenuItem value="Standard">Standard</MenuItem>
            <MenuItem value="Advanced">Advanced</MenuItem>
          </TextField>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          The difficulty badge counts the parts a template installs, the areas those parts sit in and
          the parts that need another part. A higher count means more to review before deployment.
        </Typography>
      </SurfaceCard>

      <Typography variant="body2" color="text.secondary">
        {shown.length} of {cards.length} templates match.
      </Typography>

      {shown.length === 0 && (
        <Alert severity="info" variant="outlined">
          <AlertTitle>No template matches yet</AlertTitle>
          Remove a word from the search, or set the area back to every area.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
        }}
      >
        {shown.map((card) => (
          <TemplateTile key={card.template.id} data-testid="template-tile">
            <Typography variant="subtitle1" fontWeight={800}>
              {card.template.title}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" color="primary" variant="outlined" label={card.difficulty} />
              <Chip size="small" variant="outlined" label={card.trackLabel} />
              <Chip size="small" variant="outlined" label={`${card.partCount} parts`} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {card.template.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {DIFFICULTY_MEANING[card.difficulty]} {card.difficultyReason}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 'auto', pt: 1 }}>
              {card.areas.slice(0, 3).map((entry) => (
                <Chip key={entry} size="small" label={entry} />
              ))}
            </Stack>
            {card.missingParts.length > 0 && (
              <Typography variant="caption" color="warning.main">
                Cerulea holds no part for {card.missingParts.length} of the names this template lists.
                Cerulea reports each one before deployment.
              </Typography>
            )}
            <Button
              sx={{ mt: 1 }}
              variant="contained"
              size="small"
              onClick={() => onChoose?.({ templateId: card.template.id, track: card.template.projectType })}
            >
              Start from this template
            </Button>
          </TemplateTile>
        ))}
      </Box>
    </Stack>
  );
}
