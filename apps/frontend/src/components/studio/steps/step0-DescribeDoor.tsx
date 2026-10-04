'use client';

// apps/frontend/src/components/studio/steps/step0-DescribeDoor.tsx
// The Describe it door, the first phase of Foundation.
// A person writes what the system should do. The catalogue words answer at
// once. Cerulea Intelligence reads the same sentence inside a thread of the
// project and answers with the template and the parts it names, each with a
// reason. The person confirms or adjusts, and the rest of Foundation opens
// filled from the answer.
// Without this door a new person meets a technical question first.

import * as React from 'react';
import { Alert, AlertTitle, Box, Button, Chip, CircularProgress, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GridViewIcon from '@mui/icons-material/GridView';

import { api } from '@/lib/apiClient';
import { describeSaveFailure } from '@/lib/studio/project-state';
import type { ProjectTrack } from '@/lib/catalogue/types';
import { deriveTrack, type Application, type TrackDerivation } from '@/lib/track/derive';
import TrackChoice from '@/components/studio/entry/TrackChoice';

/** One template the proposal names. */
export type ProposedTemplate = {
  id: string;
  title: string;
  description: string;
  projectType: ProjectTrack;
  moduleIds: string[];
  reason: string;
};

/** One outcome the proposal names. */
export type ProposedOutcome = {
  outcomeId: string;
  moduleId: string;
  statement: string;
  group: string;
  projectType: ProjectTrack;
  contribution: string;
  removalConsequence: string;
  reason: string;
};

export type Proposal = {
  description: string;
  empty: boolean;
  track: { track: ProjectTrack; label: string; reason: string };
  templates: ProposedTemplate[];
  outcomes: ProposedOutcome[];
};

export type ProposalReply = {
  ok: true;
  answeredBy: 'catalogue' | 'intelligence';
  note: string;
  applicationHint: { application: Application; reason: string } | null;
  proposal: Proposal;
};

/** What the person accepted. */
export type DescribeChoice = {
  description: string;
  template: ProposedTemplate | null;
  outcomeIds: string[];
  derivation: TrackDerivation;
  publishSelectedRecords: boolean;
};

export type DescribeDoorProps = {
  application: Application;
  /** The project the sentence belongs to, or null until the first sentence creates one. */
  projectId: string | null;
  /** Opens the project the sentence belongs to. Answers the identifier. */
  createProject: (description: string) => Promise<string>;
  onAccept: (choice: DescribeChoice) => void;
  onBrowse: () => void;
  /** Sends the sentence. Tests replace the routes. */
  ask?: (projectId: string, description: string, source: 'catalogue' | 'intelligence') => Promise<ProposalReply>;
};

const SurfaceCard = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `0.5px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

const ChoiceRow = styled(Paper, { shouldForwardProp: (prop) => prop !== 'chosen' })<{ chosen?: boolean }>(
  ({ theme, chosen }) => ({
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    cursor: 'pointer',
    border: `${chosen ? 1.5 : 0.5}px solid ${chosen ? theme.palette.primary.main : theme.palette.divider}`,
    boxShadow: chosen ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}` : 'none',
    background: theme.palette.background.paper,
    transition: 'all 0.15s ease',
    '&:hover': { borderColor: theme.palette.primary.main },
  }),
);

const APPLICATION_SEGMENT: Record<Application, string> = {
  dapps: '/dapps',
  enterprise: '/enterprise',
  government: '/govt',
};

const APPLICATION_NAME: Record<Application, string> = {
  dapps: 'Dapps',
  enterprise: 'Enterprise',
  government: 'Government',
};

function defaultAsk(projectId: string, description: string, source: 'catalogue' | 'intelligence') {
  return api<ProposalReply>(`/api/projects/${encodeURIComponent(projectId)}/intent`, {
    method: 'POST',
    body: JSON.stringify({ description, source }),
  });
}

export default function DescribeDoor({
  application,
  projectId,
  createProject,
  onAccept,
  onBrowse,
  ask = defaultAsk,
}: DescribeDoorProps) {
  const theme = useTheme();
  const [description, setDescription] = React.useState('');
  const [asking, setAsking] = React.useState(false);
  const [waitingForIntelligence, setWaitingForIntelligence] = React.useState(false);
  const [problem, setProblem] = React.useState<{ message: string; fix: string } | null>(null);
  const [shown, setShown] = React.useState<ProposalReply | null>(null);
  const [fromIntelligence, setFromIntelligence] = React.useState<ProposalReply | null>(null);
  const [adjusted, setAdjusted] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<string | null>(null);
  const [outcomeIds, setOutcomeIds] = React.useState<string[]>([]);
  const [derivation, setDerivation] = React.useState<TrackDerivation | null>(null);
  const [publishSelected, setPublishSelected] = React.useState(false);
  const askedRef = React.useRef(0);

  /** Takes one proposal onto the screen as the current choice. */
  const adopt = React.useCallback(
    (reply: ProposalReply) => {
      setShown(reply);
      setTemplateId(reply.proposal.templates[0]?.id ?? null);
      setOutcomeIds(reply.proposal.outcomes.map((entry) => entry.outcomeId));
      setDerivation(deriveTrack(application, { proposedTrack: reply.proposal.track.track }));
      setAdjusted(false);
    },
    [application],
  );

  const propose = React.useCallback(async () => {
    const sentence = description.trim();
    if (sentence.length < 3) return;
    const turn = (askedRef.current += 1);
    setAsking(true);
    setProblem(null);
    setFromIntelligence(null);
    try {
      const id = projectId ?? (await createProject(sentence));
      const quick = await ask(id, sentence, 'catalogue');
      if (turn !== askedRef.current) return;
      adopt(quick);
      setAsking(false);
      setWaitingForIntelligence(true);
      ask(id, sentence, 'intelligence')
        .then((slow) => {
          if (turn !== askedRef.current) return;
          setWaitingForIntelligence(false);
          if (slow.answeredBy === 'intelligence') setFromIntelligence(slow);
          else setShown((held) => (held ? { ...held, note: slow.note } : held));
        })
        .catch((cause: unknown) => {
          if (turn !== askedRef.current) return;
          setWaitingForIntelligence(false);
          const failure = describeSaveFailure(cause);
          setShown((held) => (held ? { ...held, note: `${failure.message} The proposal comes from the catalogue words.` } : held));
        });
    } catch (cause) {
      if (turn !== askedRef.current) return;
      setProblem(describeSaveFailure(cause));
      setAsking(false);
    }
  }, [adopt, ask, createProject, description, projectId]);

  // A proposal from Cerulea Intelligence replaces the catalogue one until the
  // person has adjusted something. After that the person chooses.
  React.useEffect(() => {
    if (fromIntelligence && !adjusted) adopt(fromIntelligence);
  }, [adopt, adjusted, fromIntelligence]);

  const toggleOutcome = (outcomeId: string) => {
    setAdjusted(true);
    setOutcomeIds((held) => (held.includes(outcomeId) ? held.filter((value) => value !== outcomeId) : [...held, outcomeId]));
  };

  const accept = () => {
    if (!shown || !derivation) return;
    onAccept({
      description: description.trim(),
      template: shown.proposal.templates.find((entry) => entry.id === templateId) ?? null,
      outcomeIds,
      derivation,
      publishSelectedRecords: publishSelected,
    });
  };

  const proposal = shown?.proposal ?? null;
  const otherApplication =
    shown?.applicationHint && shown.applicationHint.application !== application ? shown.applicationHint : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 860, px: 3 }}>
      <SurfaceCard elevation={0}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AutoAwesomeIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ letterSpacing: '-0.3px' }}>
              Describe it
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Write what the system should do in plain words. Cerulea proposes a starting point and states why.
            </Typography>
          </Box>
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="What should this system do"
          placeholder="We track every handling step of a shipment and let a buyer verify it."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          inputProps={{ 'aria-label': 'What should this system do' }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={asking ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
            disabled={description.trim().length < 3 || asking}
            onClick={() => void propose()}
            sx={{ borderRadius: 99, px: 2.5, boxShadow: 'none' }}
          >
            Show what Cerulea proposes
          </Button>
          <Button variant="text" startIcon={<GridViewIcon />} onClick={onBrowse} sx={{ color: 'text.secondary' }}>
            Browse the templates instead
          </Button>
        </Stack>
        {problem && (
          <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
            <AlertTitle>{problem.message}</AlertTitle>
            {problem.fix}
          </Alert>
        )}
      </SurfaceCard>

      {proposal && (
        <>
          <Alert
            severity={shown?.answeredBy === 'intelligence' ? 'success' : 'info'}
            variant="outlined"
            icon={waitingForIntelligence ? <CircularProgress size={18} /> : undefined}
            data-testid="proposal-source"
          >
            <AlertTitle>
              {shown?.answeredBy === 'intelligence'
                ? 'Cerulea Intelligence read the sentence'
                : waitingForIntelligence
                  ? 'The catalogue words answered first. Cerulea Intelligence is reading the sentence.'
                  : 'The catalogue words answered'}
            </AlertTitle>
            {shown?.note}
          </Alert>

          {fromIntelligence && adjusted && shown !== fromIntelligence && (
            <Alert
              severity="info"
              variant="outlined"
              action={
                <Button size="small" onClick={() => adopt(fromIntelligence)}>
                  Use it
                </Button>
              }
            >
              Cerulea Intelligence proposes a different set. {fromIntelligence.note}
            </Alert>
          )}

          {otherApplication && (
            <Alert severity="warning" variant="outlined">
              <AlertTitle>This reads like a {APPLICATION_NAME[otherApplication.application]} system</AlertTitle>
              {otherApplication.reason} This Studio builds for {APPLICATION_NAME[application]}. Open{' '}
              <Box component="a" href={APPLICATION_SEGMENT[otherApplication.application]} sx={{ color: 'primary.main' }}>
                {APPLICATION_SEGMENT[otherApplication.application]}
              </Box>{' '}
              to build it there.
            </Alert>
          )}

          {proposal.empty ? (
            <Alert severity="info" variant="outlined">
              <AlertTitle>Cerulea found no match yet</AlertTitle>
              Add the subject of the work, the people involved and the records we keep. Words such as shipment,
              inspector, invoice or certificate reach the catalogue.
            </Alert>
          ) : (
            <>
              <SurfaceCard elevation={0}>
                <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  The network Cerulea proposes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {proposal.track.reason}
                </Typography>
                {derivation && (
                  <TrackChoice
                    derivation={derivation}
                    onChange={(next) => {
                      setAdjusted(true);
                      setDerivation(next);
                    }}
                    publishSelected={publishSelected}
                    onPublishSelectedChange={(next) => {
                      setAdjusted(true);
                      setPublishSelected(next);
                    }}
                  />
                )}
              </SurfaceCard>

              <SurfaceCard elevation={0}>
                <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  The templates that match
                </Typography>
                {proposal.templates.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No template matched. The outcomes below still install their parts, and the gallery stays one step back.
                  </Typography>
                )}
                {proposal.templates.map((candidate) => (
                  <ChoiceRow
                    key={candidate.id}
                    chosen={templateId === candidate.id}
                    elevation={0}
                    onClick={() => {
                      setAdjusted(true);
                      setTemplateId(candidate.id);
                    }}
                    role="button"
                    aria-pressed={templateId === candidate.id}
                    data-testid="proposed-template"
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      {templateId === candidate.id && <CheckCircleOutlineIcon color="primary" fontSize="small" />}
                      <Typography variant="subtitle2" fontWeight={600}>
                        {candidate.title}
                      </Typography>
                      <Chip size="small" variant="outlined" label={`${candidate.moduleIds.length} parts`} sx={{ height: 20, fontSize: '0.65rem' }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {candidate.description}
                    </Typography>
                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.75 }}>
                      {candidate.reason}
                    </Typography>
                  </ChoiceRow>
                ))}
              </SurfaceCard>

              <SurfaceCard elevation={0}>
                <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  The outcomes that match
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Each line is something the system will do. Cerulea installs the parts each line needs. Remove a
                  line and the work it names stops.
                </Typography>
                {proposal.outcomes.map((candidate) => {
                  const chosen = outcomeIds.includes(candidate.outcomeId);
                  return (
                    <ChoiceRow
                      key={candidate.outcomeId}
                      chosen={chosen}
                      elevation={0}
                      onClick={() => toggleOutcome(candidate.outcomeId)}
                      role="button"
                      aria-pressed={chosen}
                      data-testid="proposed-outcome"
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        {chosen && <CheckCircleOutlineIcon color="primary" fontSize="small" />}
                        <Typography variant="subtitle2" fontWeight={600}>
                          {candidate.statement}
                        </Typography>
                        <Chip size="small" variant="outlined" label={candidate.group} sx={{ height: 20, fontSize: '0.65rem' }} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {candidate.contribution}
                      </Typography>
                      <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.75 }}>
                        {candidate.reason}
                      </Typography>
                    </ChoiceRow>
                  );
                })}
              </SurfaceCard>

              <Divider />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ pb: 2 }}>
                <Button variant="contained" size="large" onClick={accept} sx={{ borderRadius: 99, px: 3, boxShadow: 'none' }}>
                  Start from this proposal
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Cerulea fills the details from these answers. Every one of them stays editable.
                </Typography>
              </Stack>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
