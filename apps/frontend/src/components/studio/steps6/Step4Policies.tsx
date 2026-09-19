'use client';

// apps/frontend/src/components/studio/steps6/Step4Policies.tsx
// Step 4 Policies.
// Seven agreement properties genuinely trade against one another. Cerulea
// exposes the outcomes and solves for the properties, so a person declares what
// matters and never touches a parameter.
// Five questions in ordinary language produce three to five valid profiles.
// Every number appears as a consequence. A point crossing a fixed limit never
// surfaces at all.
// Without a profile a deployment has no agreement thresholds.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
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
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import { useProjectState, type BuildState } from '@/lib/studio/project-state';

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

type Profile = {
  profileId: string;
  point: {
    validatorCount: number;
    toleratedFailures: number;
    routinePercent: number;
    constitutionalPercent: number;
    partitionChoice: 'HaltToStayConsistent' | 'KeepServing';
  };
  routineFinalityBlocks: number;
  constitutionalFinalityBlocks: number;
  retentionBlocks: number;
  consequences: string[];
};

/** The answers the build state carries, in the words the solver reads. */
export function toDeclarations(answers: Record<string, string>): Record<string, string> | null {
  const needed = ['confirmation', 'operators', 'errorCost', 'split', 'retention'];
  if (needed.some((entry) => !answers[entry])) return null;
  return {
    confirmation: answers.confirmation,
    operators: answers.operators,
    errorCost: answers.errorCost,
    split: answers.split,
    retention: answers.retention,
  };
}

/** Turns the build state answers into the solver form, and back. */
export function answersFromBuildState(policies: BuildState['policies']): Record<string, string> {
  const held: Record<string, string> = {};
  const answers = policies.answers;
  if (answers.confirmationPreference === 'instant') held.confirmation = 'InstantConfirmation';
  if (answers.confirmationPreference === 'certain') held.confirmation = 'MaximumCertainty';
  if (answers.organisationCount !== undefined) {
    held.operators =
      answers.organisationCount <= 1
        ? 'SingleOrganisation'
        : answers.organisationCount <= 10
          ? 'SeveralOrganisations'
          : 'ManyOrganisations';
  }
  if (answers.wrongRecordCost === 'low') held.errorCost = 'Recoverable';
  if (answers.wrongRecordCost === 'moderate' || answers.wrongRecordCost === 'high') {
    held.errorCost = 'Expensive';
  }
  if (answers.wrongRecordCost === 'severe') held.errorCost = 'Irreversible';
  if (answers.serveDuringSplit !== undefined) {
    held.split = answers.serveDuringSplit ? 'KeepServing' : 'HaltToStayConsistent';
  }
  if (answers.provableYears !== undefined) {
    held.retention =
      answers.provableYears <= 1 ? 'RecentOnly' : answers.provableYears <= 5 ? 'SeveralYears' : 'Permanent';
  }
  return held;
}

/** Turns the solver answers back into the build state form. */
export function buildStateAnswers(answers: Record<string, string>): BuildState['policies']['answers'] {
  return {
    confirmationPreference:
      answers.confirmation === 'MaximumCertainty' ? 'certain' : 'instant',
    organisationCount:
      answers.operators === 'SingleOrganisation' ? 1 : answers.operators === 'ManyOrganisations' ? 50 : 10,
    wrongRecordCost:
      answers.errorCost === 'Recoverable'
        ? 'low'
        : answers.errorCost === 'Irreversible'
          ? 'severe'
          : 'high',
    serveDuringSplit: answers.split === 'KeepServing',
    provableYears:
      answers.retention === 'RecentOnly' ? 1 : answers.retention === 'SeveralYears' ? 3 : 100,
  };
}

/** States the finality of one profile in the words a person reads. */
export function describeFinality(profile: Profile, blockSeconds: number): string {
  const routine = profile.routineFinalityBlocks * blockSeconds;
  const constitutional = profile.constitutionalFinalityBlocks * blockSeconds;
  return `Everyday work becomes irreversible in about ${routine} seconds. A change to the rules waits about ${constitutional} seconds on top of its delay.`;
}

export default function Step4Policies({
  projectId,
  onContinue,
}: {
  projectId: string;
  onContinue?: () => void;
}) {
  const handle = useProjectState(projectId);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chosen, setChosen] = useState('');
  const [working, setWorking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  useEffect(() => {
    void api<{ questions: Question[]; limits: Limits }>(
      `/api/projects/${encodeURIComponent(projectId)}/policies`,
    )
      .then((reply) => {
        setQuestions(Array.isArray(reply.questions) ? reply.questions : []);
        setLimits(reply.limits ?? null);
      })
      .catch((cause: unknown) =>
        setFailure({
          message: cause instanceof Error ? cause.message : String(cause),
          fix:
            cause instanceof StudioRouteError ? cause.fix : 'Open this step again in a moment.',
        }),
      );
  }, [projectId]);

  useEffect(() => {
    if (!handle.state) return;
    setAnswers(answersFromBuildState(handle.state.buildState.policies));
    setChosen(handle.state.buildState.policies.chosenProfileId);
  }, [handle.state]);

  const readProfiles = useCallback(
    async (next: Record<string, string>) => {
      const declarations = toDeclarations(next);
      if (!declarations) {
        setProfiles([]);
        return;
      }
      setWorking(true);
      setFailure(null);
      try {
        const reply = await api<{ profiles: Profile[] }>(
          `/api/projects/${encodeURIComponent(projectId)}/policies`,
          { method: 'POST', body: JSON.stringify(declarations) },
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

  useEffect(() => {
    void readProfiles(answers);
  }, [answers, readProfiles]);

  const answer = (id: string, value: string) =>
    setAnswers((previous) => ({ ...previous, [id]: value }));

  const save = async () => {
    const state = handle.state;
    if (!state || !chosen) return;
    setSaved(false);
    const profile = profiles.find((entry) => entry.profileId === chosen);
    const next: BuildState = {
      ...state.buildState,
      policies: { answers: buildStateAnswers(answers), chosenProfileId: chosen },
      steps: { ...state.buildState.steps, policies: chosen.length > 0 },
    };
    const wroteState = await handle.saveBuildState(next);
    if (!wroteState || !profile) return;
    const wroteBlueprint = await handle.saveBlueprint(
      {
        ...state.blueprint,
        governance: {
          ...state.blueprint.governance,
          quorum: {
            ...state.blueprint.governance.quorum,
            routine: profile.point.routinePercent,
            constitutional: profile.point.constitutionalPercent,
          },
          change_process:
            state.blueprint.governance.change_process ||
            'The authority roles agree before a change takes effect. A change to the rules waits out its delay first.',
        },
      },
      'Set the agreement thresholds from the chosen profile',
    );
    if (!wroteBlueprint) return;
    setSaved(true);
    if (onContinue) onContinue();
  };

  if (handle.loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={28} />
          <Typography variant="body2">Cerulea is opening the project.</Typography>
        </Stack>
      </Box>
    );
  }

  const blockSeconds = handle.state?.buildState.foundation.blockSeconds ?? 3;

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="overline" color="text.secondary">
        Step 4 of 6
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Policies
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Tell us what matters. Cerulea solves for the parameters and shows what each answer costs.
      </Typography>

      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}
      {handle.failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{handle.failure.message}</AlertTitle>
          {handle.failure.fix}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Cerulea saved the profile and wrote its thresholds into the Blueprint.
        </Alert>
      )}

      <Stack spacing={3}>
        {questions.map((question) => (
          <Paper key={question.id} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <FormControl>
              <FormLabel sx={{ fontWeight: 800, mb: 0.5 }}>{question.question}</FormLabel>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {question.explanation}
              </Typography>
              <RadioGroup
                value={answers[question.id] ?? ''}
                onChange={(event) => answer(question.id, event.target.value)}
              >
                {question.options.map((option) => (
                  <Box key={option.value} sx={{ mb: 1 }}>
                    <FormControlLabel
                      value={option.value}
                      control={<Radio />}
                      label={option.label}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', ml: 4 }}
                    >
                      {option.meaning}
                    </Typography>
                  </Box>
                ))}
              </RadioGroup>
            </FormControl>
          </Paper>
        ))}

        {limits && (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              What no answer changes
            </Typography>
            {limits.statements.map((statement) => (
              <Typography key={statement} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {statement}
              </Typography>
            ))}
          </Paper>
        )}

        <Divider />

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            The profiles that fit
          </Typography>
          {working && (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cerulea is searching the parameter space.</Typography>
            </Stack>
          )}
          {profiles.length === 0 && !working && (
            <Alert severity="info">
              Answer all five questions. Cerulea then shows the profiles that fit, and every one of
              them passes the fixed limits.
            </Alert>
          )}
          <Stack spacing={2}>
            {profiles.map((profile) => {
              const selected = profile.profileId === chosen;
              return (
                <Card
                  key={profile.profileId}
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? 'primary.main' : 'divider',
                  }}
                >
                  <CardActionArea onClick={() => setChosen(profile.profileId)}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {profile.point.validatorCount} validators
                        </Typography>
                        {selected && <Chip size="small" color="primary" label="Chosen" />}
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`tolerates ${profile.point.toleratedFailures} failing at once`}
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

        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => void save()}
            disabled={handle.saving || chosen.length === 0}
          >
            {handle.saving ? 'Saving' : 'Save the profile'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
