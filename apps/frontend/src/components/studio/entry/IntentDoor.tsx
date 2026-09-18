'use client';

// The intent door.
// A user writes what they want in plain language. Cerulea reads the words and
// proposes a track, a template and a set of outcomes, with a reason for each.
// The reason names the words from the description that led there.
// Without this door a new user meets a technical question first.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { loadCatalogue } from '@/lib/catalogue/load';
import type { Catalogue, ProjectTrack } from '@/lib/catalogue/types';
import { TRACK_LABEL, proposeFromDescription, type IntentProposal } from '@/lib/intent';

const SurfaceCard = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

const ChoiceRow = styled(Paper, { shouldForwardProp: (prop) => prop !== 'chosen' })<{ chosen?: boolean }>(
  ({ theme, chosen }) => ({
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    cursor: 'pointer',
    border: `1px solid ${chosen ? theme.palette.primary.main : theme.palette.divider}`,
    background: theme.palette.background.paper,
  }),
);

export type IntentChoice = {
  description: string;
  track: ProjectTrack;
  templateId: string;
  outcomeIds: string[];
};

export type IntentDoorProps = {
  /** Receives the proposal the user accepted. */
  onAccept?: (choice: IntentChoice) => void;
  /** Supplies the catalogue instead of reading it from the catalogue routes. Tests use this. */
  catalogue?: Catalogue;
};

/** Takes the first descriptions of the catalogue, so the field never starts blank. */
function starterDescriptions(catalogue: Catalogue): string[] {
  return catalogue.templates
    .map((template) => template.description ?? '')
    .filter((text) => text.length > 30)
    .slice(0, 3);
}

export default function IntentDoor({ onAccept, catalogue: supplied }: IntentDoorProps) {
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(supplied ?? null);
  const [loadProblem, setLoadProblem] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [proposal, setProposal] = React.useState<IntentProposal | null>(null);
  const [track, setTrack] = React.useState<ProjectTrack | null>(null);
  const [templateId, setTemplateId] = React.useState<string | null>(null);
  const [chosenOutcomes, setChosenOutcomes] = React.useState<string[]>([]);

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

  const propose = React.useCallback(() => {
    if (!catalogue) return;
    const next = proposeFromDescription(description, catalogue);
    setProposal(next);
    setTrack(next.track.track);
    setTemplateId(next.templates[0]?.template.id ?? null);
    setChosenOutcomes(next.outcomes.map((item) => item.outcome.outcomeId));
  }, [catalogue, description]);

  const toggleOutcome = React.useCallback((outcomeId: string) => {
    setChosenOutcomes((held) =>
      held.includes(outcomeId) ? held.filter((value) => value !== outcomeId) : [...held, outcomeId],
    );
  }, []);

  const accept = React.useCallback(() => {
    if (!proposal || !track || !templateId) return;
    onAccept?.({ description, track, templateId, outcomeIds: chosenOutcomes });
  }, [chosenOutcomes, description, onAccept, proposal, templateId, track]);

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

  const starters = starterDescriptions(catalogue);

  return (
    <Stack spacing={3}>
      <SurfaceCard>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'primary.main', color: 'common.white', display: 'flex' }}>
            <AutoAwesomeIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Describe it
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Write what we want in plain language. Cerulea proposes a starting point and states why.
            </Typography>
          </Box>
        </Stack>

        <TextField
          fullWidth
          multiline
          minRows={4}
          label="What should this system do"
          placeholder="We track every handling step of a shipment and let a buyer verify it."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          inputProps={{ 'aria-label': 'What should this system do' }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>
          Cerulea matches the words we write against the names, the summaries and the labels in the
          catalogue. Start from one of these lines if it helps.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {starters.map((starter) => (
            <Chip
              key={starter}
              label={starter}
              variant="outlined"
              onClick={() => setDescription(starter)}
              sx={{ maxWidth: '100%', height: 'auto', py: 0.75, '& .MuiChip-label': { whiteSpace: 'normal' } }}
            />
          ))}
        </Stack>

        <Button
          sx={{ mt: 3 }}
          variant="contained"
          size="large"
          startIcon={<AutoAwesomeIcon />}
          disabled={description.trim().length === 0}
          onClick={propose}
        >
          Show what Cerulea proposes
        </Button>
      </SurfaceCard>

      {proposal?.empty && (
        <Alert severity="info" variant="outlined">
          <AlertTitle>Cerulea found no match yet</AlertTitle>
          Add the subject of the work, the people involved and the records we keep. Words such as
          shipment, inspector, invoice or certificate reach the catalogue.
        </Alert>
      )}

      {proposal && !proposal.empty && (
        <>
          <SurfaceCard>
            <Typography variant="overline" fontWeight={800} color="text.secondary">
              The network Cerulea proposes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              {proposal.track.reason} A private Blockchain network keeps every record inside our
              organisation. The public-access chain lets anyone verify a record. We change this at
              any time.
            </Typography>
            <RadioGroup
              value={track ?? proposal.track.track}
              onChange={(event) => setTrack(event.target.value as ProjectTrack)}
            >
              <FormControlLabel value="blockchain" control={<Radio />} label={TRACK_LABEL.blockchain} />
              <FormControlLabel value="dapp" control={<Radio />} label={TRACK_LABEL.dapp} />
            </RadioGroup>
          </SurfaceCard>

          <SurfaceCard>
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              The templates that match
            </Typography>
            {proposal.templates.map((candidate) => (
              <ChoiceRow
                key={candidate.template.id}
                chosen={templateId === candidate.template.id}
                onClick={() => setTemplateId(candidate.template.id)}
                role="button"
                aria-pressed={templateId === candidate.template.id}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  {templateId === candidate.template.id && <CheckCircleOutlineIcon color="primary" fontSize="small" />}
                  <Typography variant="subtitle1" fontWeight={700}>
                    {candidate.template.title}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={candidate.template.projectType === 'blockchain' ? 'Private network' : 'Public-access chain'}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {candidate.template.description}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1 }}>
                  {candidate.reason}
                </Typography>
              </ChoiceRow>
            ))}
          </SurfaceCard>

          <SurfaceCard>
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              The outcomes that match
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Each line is something the system will do. Cerulea installs the parts each line needs.
              Remove a line and the work it names stops.
            </Typography>
            {proposal.outcomes.map((candidate) => (
              <ChoiceRow
                key={candidate.outcome.outcomeId}
                chosen={chosenOutcomes.includes(candidate.outcome.outcomeId)}
                onClick={() => toggleOutcome(candidate.outcome.outcomeId)}
                role="button"
                aria-pressed={chosenOutcomes.includes(candidate.outcome.outcomeId)}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  {chosenOutcomes.includes(candidate.outcome.outcomeId) && (
                    <CheckCircleOutlineIcon color="primary" fontSize="small" />
                  )}
                  <Typography variant="subtitle1" fontWeight={700}>
                    {candidate.outcome.statement}
                  </Typography>
                  <Chip size="small" variant="outlined" label={candidate.outcome.group} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {candidate.outcome.contribution}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1 }}>
                  {candidate.reason}
                </Typography>
              </ChoiceRow>
            ))}
          </SurfaceCard>

          <Divider />

          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="contained" size="large" disabled={!templateId} onClick={accept}>
              Start from this proposal
            </Button>
            <Typography variant="caption" color="text.secondary">
              Cerulea fills the first step from these answers. Every one of them stays editable.
            </Typography>
          </Stack>
        </>
      )}
    </Stack>
  );
}
