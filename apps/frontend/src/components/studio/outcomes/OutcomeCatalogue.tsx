'use client';

// The outcome catalogue.
// A user reads plain statements and picks the ones the system should deliver.
// Every statement names the parts Cerulea installs for it, and the reason each
// part is there.
// Without the statements a user must decompose the work into modules.

import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Checkbox,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

import { loadModules } from '@/lib/catalogue/load';
import type { CatalogueModule, ProjectTrack } from '@/lib/catalogue/types';
import { TRACK_PHRASE } from '@/lib/track/derive';
import {
  describeOutcomes,
  filterOutcomes,
  groupOutcomeCards,
  type OutcomeCard,
} from '@/lib/outcomes/browse';

const SurfaceCard = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

export type OutcomeCatalogueProps = {
  /** The outcomes already selected. */
  selected?: string[];
  onSelectedChange?: (next: string[]) => void;
  /** Narrows the catalogue to the network the project runs on. */
  track?: ProjectTrack | 'any';
  /** Supplies the modules instead of reading them from the catalogue route. Tests use this. */
  modules?: CatalogueModule[];
};

export default function OutcomeCatalogue({
  selected = [],
  onSelectedChange,
  track = 'any',
  modules: supplied,
}: OutcomeCatalogueProps) {
  const [modules, setModules] = React.useState<CatalogueModule[] | null>(supplied ?? null);
  const [loadProblem, setLoadProblem] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [group, setGroup] = React.useState('any');

  React.useEffect(() => {
    if (supplied) return;
    let live = true;
    loadModules()
      .then((next) => {
        if (live) setModules(next);
      })
      .catch((error: Error) => {
        if (live) setLoadProblem(error.message);
      });
    return () => {
      live = false;
    };
  }, [supplied]);

  const cards: OutcomeCard[] = React.useMemo(
    () => (modules ? describeOutcomes(modules) : []),
    [modules],
  );

  const onTrack = React.useMemo(() => filterOutcomes(cards, { track }), [cards, track]);
  const groups = React.useMemo(() => groupOutcomeCards(onTrack), [onTrack]);
  const shown = React.useMemo(
    () => filterOutcomes(onTrack, { query, group }),
    [group, onTrack, query],
  );
  const shownGroups = React.useMemo(() => groupOutcomeCards(shown), [shown]);

  const toggle = React.useCallback(
    (outcomeId: string) => {
      const next = selected.includes(outcomeId)
        ? selected.filter((value) => value !== outcomeId)
        : [...selected, outcomeId];
      onSelectedChange?.(next);
    },
    [onSelectedChange, selected],
  );

  if (loadProblem) {
    return (
      <Alert severity="error" variant="outlined">
        <AlertTitle>Cerulea could not read the catalogue</AlertTitle>
        {loadProblem}
      </Alert>
    );
  }

  if (!modules) {
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
        <Typography variant="h6" fontWeight={800}>
          What should this system do
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          Each line is one thing the system will do. Cerulea installs the parts each line needs and
          links them. Remove a line and the work it names stops.
          {track !== 'any' && ` These lines run on the ${TRACK_PHRASE[track]}.`}
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="Search the outcomes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            inputProps={{ 'aria-label': 'Search the outcomes' }}
          />
          <TextField
            select
            label="Area"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="any">Every area</MenuItem>
            {groups.map((entry) => (
              <MenuItem key={entry.group} value={entry.group}>
                {entry.group} ({entry.cards.length})
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {shown.length} of {onTrack.length} outcomes match. {selected.length} selected.
        </Typography>
      </SurfaceCard>

      {shown.length === 0 && (
        <Alert severity="info" variant="outlined">
          <AlertTitle>No outcome matches yet</AlertTitle>
          Remove a word from the search, or set the area back to every area.
        </Alert>
      )}

      {shownGroups.map((entry) => (
        <SurfaceCard key={entry.group} data-testid="outcome-group">
          <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {entry.group}
          </Typography>
          {entry.cards.map((card) => (
            <Accordion key={card.outcome.outcomeId} disableGutters data-testid="outcome-card">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  <Checkbox
                    checked={selected.includes(card.outcome.outcomeId)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggle(card.outcome.outcomeId)}
                    slotProps={{ input: { 'aria-label': card.outcome.statement } }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {card.outcome.statement}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cerulea installs {card.bundle.length} parts for this.
                    </Typography>
                  </Box>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {card.outcome.contribution}
                </Typography>
                <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                  {card.outcome.removalConsequence}
                </Typography>
                <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block' }}>
                  The parts this installs
                </Typography>
                {card.bundle.map((part) => (
                  <Box key={part.moduleId} sx={{ mt: 1 }} data-testid="bundle-part">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={700}>
                        {part.title}
                      </Typography>
                      {part.anchor && <Chip size="small" variant="outlined" label="The main part" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {part.contribution}
                    </Typography>
                    {part.reason && (
                      <Typography variant="caption" color="primary.main" sx={{ display: 'block' }}>
                        {part.reason}
                      </Typography>
                    )}
                  </Box>
                ))}
                {card.missingParts.length > 0 && (
                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                    Cerulea holds no part for {card.missingParts.length} of the names this bundle asks
                    for. Cerulea reports each one before deployment.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </SurfaceCard>
      ))}
    </Stack>
  );
}
