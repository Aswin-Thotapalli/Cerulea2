'use client';

// apps/frontend/src/components/studio/steps6/Step3Model.tsx
// Step 3 Model.
// Four surfaces over one Blueprint. The records a system keeps. The permission
// matrix. The rules and the actions. The workflows. Every change writes to the
// same Blueprint, so the four stay in step.
// Without this step a system would keep records nobody may read.

import { useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

import EntityEditor from './model/EntityEditor';
import PermissionMatrix from './model/PermissionMatrix';
import LogicEditor from './model/LogicEditor';
import WorkflowEditor from './model/WorkflowEditor';
import { useProjectState, type BuildState } from '@/lib/studio/project-state';
import type { Blueprint } from '@/lib/blueprint/types';

export const MODEL_SURFACES = [
  { id: 'entities', label: 'Records', note: 'What the system keeps.' },
  { id: 'permissions', label: 'Permissions', note: 'Who reaches what.' },
  { id: 'logic', label: 'Rules and actions', note: 'What the system does, and what it refuses.' },
  { id: 'workflows', label: 'Workflows', note: 'How a record moves through its states.' },
] as const;

export type ModelSurface = (typeof MODEL_SURFACES)[number]['id'];

export default function Step3Model({
  projectId,
  onContinue,
  surface = 'entities',
}: {
  projectId: string;
  onContinue?: () => void;
  surface?: ModelSurface;
}) {
  const handle = useProjectState(projectId);
  const [tab, setTab] = useState<ModelSurface>(surface);
  const [draft, setDraft] = useState<Blueprint | null>(null);
  const [chosenTriggers, setChosenTriggers] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!handle.state) return;
    setDraft(handle.state.blueprint);
    setChosenTriggers(
      handle.state.buildState.compose.chosenLinks
        .filter((link) => link.kind === 'triggers')
        .map((link) => `${link.from}->${link.to}`),
    );
  }, [handle.state]);

  const save = async () => {
    const state = handle.state;
    if (!state || !draft) return;
    setSaved(false);
    const wrote = await handle.saveBlueprint(draft, `Changed the model on the ${tab} surface`);
    if (!wrote) return;
    const next: BuildState = {
      ...state.buildState,
      compose: {
        ...state.buildState.compose,
        chosenLinks: [
          ...state.buildState.compose.chosenLinks.filter((link) => link.kind !== 'triggers'),
          ...chosenTriggers.map((entry) => {
            const [from, to] = entry.split('->');
            return { kind: 'triggers' as const, from: from ?? '', to: to ?? '' };
          }),
        ],
      },
      steps: {
        ...state.buildState.steps,
        model: draft.collections.length > 0 && draft.permissions.length > 0,
      },
    };
    await handle.saveBuildState(next);
    setSaved(true);
    if (onContinue) onContinue();
  };

  if (handle.loading || !draft) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={28} />
          <Typography variant="body2">Cerulea is opening the model.</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="overline" color="text.secondary">
        Step 3 of 6
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Model
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {MODEL_SURFACES.find((entry) => entry.id === tab)?.note}
      </Typography>

      {handle.failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{handle.failure.message}</AlertTitle>
          {handle.failure.fix}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Cerulea saved the model as version {handle.state?.blueprintVersion}.
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_event, next) => setTab(next as ModelSurface)}
        sx={{ mb: 3 }}
        variant="scrollable"
      >
        {MODEL_SURFACES.map((entry) => (
          <Tab key={entry.id} value={entry.id} label={entry.label} />
        ))}
      </Tabs>

      {tab === 'entities' && <EntityEditor blueprint={draft} onChange={setDraft} />}
      {tab === 'permissions' && <PermissionMatrix blueprint={draft} onChange={setDraft} />}
      {tab === 'logic' && (
        <LogicEditor
          blueprint={draft}
          onChange={setDraft}
          moduleIds={handle.state?.buildState.compose.moduleIds ?? []}
          chosenTriggers={chosenTriggers}
          onChosenTriggersChange={setChosenTriggers}
        />
      )}
      {tab === 'workflows' && <WorkflowEditor blueprint={draft} onChange={setDraft} />}

      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => void save()}
          disabled={handle.saving}
        >
          {handle.saving ? 'Saving' : 'Save the model'}
        </Button>
      </Box>
    </Box>
  );
}
