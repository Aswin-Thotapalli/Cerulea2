'use client';

// apps/frontend/src/components/studio/levels/LevelOneTemplate.tsx
// Disclosure level one, the template level.
// A person answers plain questions and Cerulea deploys. No structure appears
// at this level. No part, no record, no rule and no threshold is shown.
// Answering writes the same Blueprint every other level writes, so moving up a
// level shows exactly the system these answers produced.
// Without this level every Dapps builder would meet the designer first.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { describeTemplates } from '@/lib/templates/gallery';
import { buildStateAnswers } from '@/components/studio/steps6/Step4Policies';
import {
  DECLARATION_IDS,
  answersComplete,
  describePlan,
  firstUnanswered,
  planFromTemplate,
  type TemplateAnswers,
} from '@/lib/studio/template-build';
import { useProjectState, type BuildState } from '@/lib/studio/project-state';

type Question = {
  id: string;
  question: string;
  explanation: string;
  options: { value: string; label: string; meaning: string }[];
};

type Profile = {
  profileId: string;
  point: { routinePercent: number; constitutionalPercent: number };
  consequences: string[];
};

export default function LevelOneTemplate({
  projectId,
  onBuilt,
}: {
  projectId: string;
  onBuilt?: () => void;
}) {
  const handle = useProjectState(projectId);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<TemplateAnswers>({
    projectName: '',
    summary: '',
    templateId: '',
    declarations: {},
  });
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);
  const [built, setBuilt] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void api<{ questions: Question[] }>(`/api/projects/${encodeURIComponent(projectId)}/policies`)
      .then((reply) => setQuestions(Array.isArray(reply.questions) ? reply.questions : []))
      .catch((cause: unknown) =>
        setFailure({
          message: cause instanceof Error ? cause.message : String(cause),
          fix: cause instanceof StudioRouteError ? cause.fix : 'Open this screen again in a moment.',
        }),
      );
  }, [projectId]);

  useEffect(() => {
    const state = handle.state;
    if (!state) return;
    const held = state.buildState.foundation;
    setAnswers((previous) => ({
      projectName: held.projectName || state.project.name,
      summary: held.summary || state.project.summary,
      templateId: held.templateId,
      declarations: previous.declarations,
    }));
  }, [handle.state]);

  const track = handle.state?.buildState.foundation.track ?? 'dapp';

  const templates = useMemo(
    () =>
      describeTemplates(SEED_TEMPLATES, SEED_MODULES).filter(
        (card) => card.template.projectType === track,
      ),
    [track],
  );

  const plan = useMemo(
    () => planFromTemplate(answers.templateId, SEED_TEMPLATES, SEED_MODULES),
    [answers.templateId],
  );

  const composed = useMemo(
    () =>
      composeSections(plan.moduleIds, {
        retentionDays: handle.state?.buildState.foundation.historyRetentionDays,
      }),
    [plan.moduleIds, handle.state],
  );

  const answer = useCallback((id: string, value: string) => {
    setAnswers((previous) => ({
      ...previous,
      declarations: { ...previous.declarations, [id]: value },
    }));
  }, []);

  const build = async () => {
    const state = handle.state;
    if (!state || answersComplete(answers) === false) return;
    setWorking(true);
    setBuilt(false);
    setFailure(null);
    try {
      const solved = await api<{ profiles: Profile[] }>(
        `/api/projects/${encodeURIComponent(projectId)}/policies`,
        { method: 'POST', body: JSON.stringify(answers.declarations) },
      );
      const profile = solved.profiles[0];
      if (profile === undefined) {
        setFailure({
          message: 'Cerulea found no agreement profile for those answers.',
          fix: 'Change one answer above, so a valid profile appears.',
        });
        return;
      }
      const next: BuildState = {
        ...state.buildState,
        disclosureLevel: 1,
        foundation: {
          ...state.buildState.foundation,
          projectName: answers.projectName.trim(),
          summary: answers.summary.trim(),
          templateId: answers.templateId,
        },
        compose: {
          ...state.buildState.compose,
          moduleIds: plan.moduleIds,
        },
        policies: {
          answers: buildStateAnswers(answers.declarations),
          chosenProfileId: profile.profileId,
        },
        steps: {
          ...state.buildState.steps,
          foundation: true,
          compose: plan.moduleIds.length > 0,
          model: composed.collections.length > 0,
          policies: true,
        },
      };
      if ((await handle.saveBuildState(next)) === false) return;
      const composedBlueprint = applyComposition(
        {
          ...state.blueprint,
          name: answers.projectName.trim(),
          summary: answers.summary.trim(),
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
        composed,
        state.blueprint.collections.map((entry) => entry.id),
      );
      if ((await handle.saveBlueprint(composedBlueprint, 'Built from plain answers')) === false) {
        return;
      }
      await api(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: answers.projectName.trim(),
          summary: answers.summary.trim(),
        }),
      }).catch(() => undefined);
      setBuilt(true);
      if (onBuilt) onBuilt();
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Answer the questions again. Report the problem to the Cerulea operator when it repeats.',
      });
    } finally {
      setWorking(false);
    }
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

  const waiting = firstUnanswered(answers);
  const chosenCard = templates.find((card) => card.template.id === answers.templateId);

  return (
    <Box sx={{ p: 4, maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        A few plain questions
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Answer these and Cerulea builds the system. We show no structure here. Move up a level at
        any time to read every part we assembled.
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
      {built && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Cerulea built the system from these answers</AlertTitle>
          The checklist below states what remains before deployment.
        </Alert>
      )}

      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            What are we building
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Name"
              size="small"
              value={answers.projectName}
              onChange={(event) =>
                setAnswers((previous) => ({ ...previous, projectName: event.target.value }))
              }
              helperText="The name a colleague reads beside this work, and the name the finished system carries. Without a name nobody finds the work again."
            />
            <TextField
              label="What this system does"
              size="small"
              multiline
              minRows={2}
              value={answers.summary}
              onChange={(event) =>
                setAnswers((previous) => ({ ...previous, summary: event.target.value }))
              }
              helperText="One sentence. Cerulea checks the finished system against this statement before deployment, and names anything it looks to be missing."
            />
            <TextField
              select
              label="Which kind of system is this"
              size="small"
              value={answers.templateId}
              onChange={(event) =>
                setAnswers((previous) => ({ ...previous, templateId: event.target.value }))
              }
              helperText={
                chosenCard
                  ? chosenCard.difficultyReason
                  : 'Pick the closest kind. Cerulea starts from a working system rather than an empty one, so nothing here begins blank.'
              }
            >
              {templates.map((card) => (
                <MenuItem key={card.template.id} value={card.template.id}>
                  {card.template.title}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>

        {questions
          .filter((question) => (DECLARATION_IDS as readonly string[]).includes(question.id))
          .map((question) => (
            <Paper key={question.id} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <FormControl data-control-group={question.id}>
                <FormLabel sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {question.question}
                </FormLabel>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                  data-mirror={`policy.${question.id}`}
                >
                  {question.explanation}
                </Typography>
                <RadioGroup
                  value={answers.declarations[question.id] ?? ''}
                  onChange={(event) => answer(question.id, event.target.value)}
                >
                  {question.options.map((option) => (
                    <Box key={option.value}>
                      <FormControlLabel
                        value={option.value}
                        control={<Radio size="small" />}
                        label={option.label}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ ml: 4 }}
                      >
                        {option.meaning}
                      </Typography>
                    </Box>
                  ))}
                </RadioGroup>
              </FormControl>
            </Paper>
          ))}

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            What happens next
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {describePlan(plan, composed.collections.length)}
          </Typography>
          {waiting && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {waiting}
            </Alert>
          )}
          <Button
            variant="contained"
            size="large"
            onClick={() => void build()}
            disabled={working || handle.saving || waiting !== null}
          >
            {working || handle.saving ? 'Building' : 'Build this system'}
          </Button>
        </Paper>
      </Stack>
    </Box>
  );
}
