'use client';

// apps/frontend/src/components/studio/steps/step3-ChainGov.tsx
// The Governance and policies tab of the Economics step.
// Seven agreement properties trade against one another. Cerulea exposes the
// outcomes and solves for the properties, so a person declares what matters
// and never touches a parameter. Five questions in ordinary language produce
// three to five valid profiles from Cerulea APIs. Every number appears as a
// consequence. A point crossing a fixed limit never surfaces at all.
// The chosen profile sets the class thresholds in the Governance section,
// beside the authority roles and the constitutional delay.
// Without a profile a deployment has no agreement thresholds of its own.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Autocomplete,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GavelIcon from '@mui/icons-material/Gavel';

import { StudioRouteError, api } from '@/lib/apiClient';
import type { Role } from '@/lib/blueprint/types';
import GovernmentPosture from './step3-GovernmentPosture';
import {
  CLASS_LINES,
  type GovernanceChoice,
  type PolicyAnswers,
  SectionCard,
  type SolverProfile,
  answersComplete,
  blocksPerDay,
  describeFinality,
  quorumFor,
  safeNum,
} from './step3-shared';

type Question = {
  id: string;
  question: string;
  explanation: string;
  options: { value: string; label: string; meaning: string }[];
};

type Limits = {
  faultMultiple: number;
  minValidatorSet: number;
  maxValidatorSet: number;
  minThresholdPercent: number;
  maxThresholdPercent: number;
  assumedMessageDelayMilliseconds: number;
  statements: string[];
};

interface Props {
  projectId: string;
  governance: GovernanceChoice;
  setGovernance: (change: (previous: GovernanceChoice) => GovernanceChoice) => void;
  chosenProfile: SolverProfile | null;
  setChosenProfile: (profile: SolverProfile | null) => void;
  roles: Role[];
  blockSeconds: number;
  government: boolean;
  templateId: string;
}

const ACCENT = '#4F46E5';

function Heading({ icon, title, caption }: { icon: React.ReactNode; title: string; caption: string }) {
  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(ACCENT, 0.03),
        borderRadius: '12px 12px 0 0',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: alpha(ACCENT, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: ACCENT,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

/** States the delay in the words a person reads. */
export function describeDelay(blocks: number, blockSeconds: number): string {
  const seconds = blocks * blockSeconds;
  if (seconds >= 86400) {
    const days = Math.round((seconds / 86400) * 10) / 10;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (seconds >= 3600) {
    const hours = Math.round((seconds / 3600) * 10) / 10;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${seconds} seconds`;
}

export default function ChainGovPanel({
  projectId,
  governance,
  setGovernance,
  chosenProfile,
  setChosenProfile,
  roles,
  blockSeconds,
  government,
  templateId,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [profiles, setProfiles] = useState<SolverProfile[]>([]);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  useEffect(() => {
    let open = true;
    void api<{ questions: Question[]; limits: Limits }>(
      `/api/projects/${encodeURIComponent(projectId)}/policies`,
    )
      .then((reply) => {
        if (!open) return;
        setQuestions(Array.isArray(reply.questions) ? reply.questions : []);
        setLimits(reply.limits ?? null);
      })
      .catch((cause: unknown) => {
        if (!open) return;
        setFailure({
          message: cause instanceof Error ? cause.message : String(cause),
          fix: cause instanceof StudioRouteError ? cause.fix : 'Open this step again in a moment.',
        });
      });
    return () => {
      open = false;
    };
  }, [projectId]);

  const readProfiles = useCallback(
    async (answers: PolicyAnswers) => {
      if (!answersComplete(answers)) {
        setProfiles([]);
        return;
      }
      setWorking(true);
      setFailure(null);
      try {
        const reply = await api<{ profiles: SolverProfile[] }>(
          `/api/projects/${encodeURIComponent(projectId)}/policies`,
          { method: 'POST', body: JSON.stringify(answers) },
        );
        setProfiles(reply.profiles);
      } catch (cause) {
        setFailure({
          message: cause instanceof Error ? cause.message : String(cause),
          fix: cause instanceof StudioRouteError ? cause.fix : 'Answer the questions again.',
        });
      } finally {
        setWorking(false);
      }
    },
    [projectId],
  );

  const answersKey = JSON.stringify(governance.answers);
  useEffect(() => {
    void readProfiles(JSON.parse(answersKey) as PolicyAnswers);
  }, [answersKey, readProfiles]);

  // A chosen profile whose identifier left the list is released, so the
  // Blueprint never carries thresholds from answers the person changed.
  useEffect(() => {
    if (!chosenProfile || profiles.length === 0) return;
    if (!profiles.some((entry) => entry.profileId === chosenProfile.profileId)) {
      setChosenProfile(null);
      setGovernance((p) => ({ ...p, chosenProfileId: '' }));
    }
  }, [profiles, chosenProfile, setChosenProfile, setGovernance]);

  const answer = (id: string, value: string) =>
    setGovernance((p) => ({ ...p, answers: { ...p.answers, [id]: value } }));

  const choose = (profile: SolverProfile) => {
    setChosenProfile(profile);
    setGovernance((p) => ({ ...p, chosenProfileId: profile.profileId }));
  };

  const quorum = quorumFor(chosenProfile);
  const authorityRoles = roles.filter((role) => governance.authority.includes(role.id));

  return (
    <Stack spacing={2} data-testid="governance-panel">
      {failure && (
        <Alert severity="error">
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      {government && (
        <GovernmentPosture
          templateId={templateId}
          organisations={governance.organisations}
          jurisdiction={governance.jurisdiction}
          onOrganisations={(next) => setGovernance((p) => ({ ...p, organisations: next }))}
          onJurisdiction={(next) => setGovernance((p) => ({ ...p, jurisdiction: next }))}
        />
      )}

      <SectionCard>
        <Heading
          icon={<GavelIcon sx={{ fontSize: 15 }} />}
          title="Five questions"
          caption="Tell us what matters. Cerulea solves for the parameters and shows what each answer costs."
        />
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {questions.length === 0 && !failure && (
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2">Cerulea is reading the questions.</Typography>
              </Stack>
            )}
            {questions.map((question) => (
              <Paper key={question.id} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <FormControl data-control-group={question.id}>
                  <FormLabel sx={{ fontWeight: 800, mb: 0.5 }}>{question.question}</FormLabel>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1.5 }}
                    data-mirror={`policy.${question.id}`}
                  >
                    {question.explanation}
                  </Typography>
                  <RadioGroup
                    value={governance.answers[question.id as keyof PolicyAnswers] ?? ''}
                    onChange={(event) => answer(question.id, event.target.value)}
                  >
                    {question.options.map((option) => (
                      <Box key={option.value} sx={{ mb: 1 }}>
                        <FormControlLabel value={option.value} control={<Radio />} label={option.label} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                          {option.meaning}
                        </Typography>
                      </Box>
                    ))}
                  </RadioGroup>
                </FormControl>
              </Paper>
            ))}
          </Stack>

          {limits && (limits.statements ?? []).length > 0 && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mt: 2.5 }} data-testid="fixed-limits">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                What no answer changes
              </Typography>
              {(limits.statements ?? []).map((statement) => (
                <Typography key={statement} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {statement}
                </Typography>
              ))}
              <Typography variant="caption" color="text.secondary">
                The validator set stays between {limits.minValidatorSet} and {limits.maxValidatorSet}.
                A threshold stays between {limits.minThresholdPercent} and {limits.maxThresholdPercent}{' '}
                percent. The assumed message delay bound is{' '}
                {Math.round(limits.assumedMessageDelayMilliseconds / 1000)} seconds.
              </Typography>
            </Paper>
          )}
        </Box>
      </SectionCard>

      <SectionCard>
        <Heading
          icon={<AccountBalanceIcon sx={{ fontSize: 15 }} />}
          title="The profiles that fit"
          caption="Three to five profiles, every one checked against the fixed limits"
        />
        <Box sx={{ p: 3 }}>
          {working && (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cerulea is searching the parameter space.</Typography>
            </Stack>
          )}
          {profiles.length === 0 && !working && (
            <Alert severity="info" data-testid="profiles-waiting">
              Answer all five questions. Cerulea then shows the profiles that fit, and every one of
              them passes the fixed limits.
            </Alert>
          )}
          <Stack spacing={2}>
            {profiles.map((profile) => {
              const selected = profile.profileId === chosenProfile?.profileId;
              return (
                <Card
                  key={profile.profileId}
                  variant="outlined"
                  data-profile={profile.profileId}
                  sx={{
                    borderRadius: 3,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? 'primary.main' : 'divider',
                  }}
                >
                  <CardActionArea onClick={() => choose(profile)}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {profile.point.validatorCount} validators
                        </Typography>
                        {selected && <Chip size="small" color="primary" label="Chosen" />}
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`tolerates ${profile.point.toleratedFailures} failing at once`}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            profile.point.partitionChoice === 'KeepServing'
                              ? 'keeps serving through a split'
                              : 'halts through a split to stay consistent'
                          }
                        />
                      </Stack>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {describeFinality(profile, blockSeconds)}
                      </Typography>
                      <Stack spacing={0.5}>
                        {profile.consequences.map((line) => (
                          <Typography key={line} variant="body2" color="text.secondary">
                            {line}
                          </Typography>
                        ))}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        </Box>
      </SectionCard>

      <SectionCard>
        <Heading
          icon={<GavelIcon sx={{ fontSize: 15 }} />}
          title="Class thresholds"
          caption="The share of validator weight each class of transaction needs before it commits"
        />
        <Box sx={{ p: 3 }} data-testid="class-thresholds">
          <Stack spacing={1.5}>
            {CLASS_LINES.map((line) => (
              <Box
                key={line.key}
                sx={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: 2, alignItems: 'baseline' }}
                data-class={line.key}
              >
                <Typography variant="body2" fontWeight={700}>
                  {line.title}
                </Typography>
                <Typography variant="body2" fontWeight={800} color="primary.main">
                  {quorum[line.key]} percent
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {line.covers}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary" data-mirror="governance.thresholds">
            {chosenProfile
              ? `The chosen profile raises the thresholds where its certainty asks for it. A class never drops under the figure the architecture fixes: 51, 67, 80 and 90 percent.`
              : 'Until a profile is chosen the four classes carry the figures the architecture fixes: 51, 67, 80 and 90 percent.'}{' '}
            A domain carrying mixed classes commits at the highest threshold present.
          </Typography>
        </Box>
      </SectionCard>

      <SectionCard>
        <Heading
          icon={<AccountBalanceIcon sx={{ fontSize: 15 }} />}
          title="Who agrees and how long a change waits"
          caption="The authority roles and the constitutional delay"
        />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2.5 }}>
            <Autocomplete
              multiple
              options={roles}
              getOptionLabel={(role) => role.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={authorityRoles}
              onChange={(_, value) =>
                setGovernance((p) => ({ ...p, authority: value.map((role) => role.id) }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Authority roles"
                  placeholder="Choose roles"
                  helperText={
                    authorityRoles.length > 0
                      ? `${authorityRoles.map((role) => role.name).join(', ')} vote on every proposal.`
                      : `No role chosen. The first role of the Blueprint, ${roles[0]?.name ?? 'Owner'}, carries the authority until one is.`
                  }
                />
              )}
            />
            <TextField
              size="small"
              type="number"
              label="Constitutional delay (blocks)"
              value={governance.constitutionalDelayBlocks}
              onChange={(e) =>
                setGovernance((p) => ({
                  ...p,
                  constitutionalDelayBlocks: Math.max(1, Math.round(safeNum(e.target.value, 1))),
                }))
              }
              helperText={`About ${describeDelay(governance.constitutionalDelayBlocks, blockSeconds)} at ${blockSeconds} seconds a block. One day is ${blocksPerDay(blockSeconds)} blocks.`}
              inputProps={{ 'data-testid': 'constitutional-delay' }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }} data-mirror="governance.delay">
            A constitutional change passes its vote and then waits the delay before it takes effect,
            so a mistaken change can be cancelled in time. Without a delay a change to the rules
            would take effect the moment it passed.
          </Typography>
        </Box>
      </SectionCard>
    </Stack>
  );
}
