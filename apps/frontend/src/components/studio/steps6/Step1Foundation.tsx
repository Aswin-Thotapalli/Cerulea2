'use client';

// apps/frontend/src/components/studio/steps6/Step1Foundation.tsx
// Step 1 Foundation.
// The name, the workspace, the network, the starting point and the network
// properties all arrive filled, so the step opens on a working project rather
// than a blank form. Every technical control carries a plain sentence stating
// what it does and what breaks without it.
// Without this step a project would have no identity and no network.

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import WorkspaceApplication from '@/components/studio/variants/WorkspaceApplication';
import { partsFor, templatesForVariant } from '@/lib/variants/application';
import { api } from '@/lib/apiClient';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import { describeTemplates } from '@/lib/templates/gallery';
import {
  APPLICATION_LABEL,
  TRACK_LABEL,
  TRACK_MEANING,
  applyTrackOverride,
  deriveTrack,
  type Application,
} from '@/lib/track/derive';
import {
  BLOCK_SECONDS,
  HISTORY_RETENTION_DAYS,
  boundFix,
  describeBlockSeconds,
  describeRetention,
  withinBound,
} from '@/lib/studio/foundation-controls';
import { useProjectState, type BuildState } from '@/lib/studio/project-state';
import type { ProjectTrack } from '@/lib/catalogue/types';

type WorkspaceRow = { workspaceId: string; name: string; application: string };

export default function Step1Foundation({
  projectId,
  onContinue,
}: {
  projectId: string;
  onContinue?: () => void;
}) {
  const handle = useProjectState(projectId);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [track, setTrack] = useState<ProjectTrack>('dapp');
  const [templateId, setTemplateId] = useState('');
  const [blockSeconds, setBlockSeconds] = useState(BLOCK_SECONDS.bound.fallback);
  const [retentionDays, setRetentionDays] = useState(HISTORY_RETENTION_DAYS.bound.fallback);
  const [publishSelected, setPublishSelected] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api<{ workspaces: WorkspaceRow[] }>('/api/workspaces')
      .then((reply) => setWorkspaces(reply.workspaces))
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    const state = handle.state;
    if (!state) return;
    const held = state.buildState.foundation;
    setName(held.projectName || state.project.name);
    setSummary(held.summary || state.project.summary);
    setTrack(held.track);
    setTemplateId(held.templateId);
    setBlockSeconds(held.blockSeconds);
    setRetentionDays(held.historyRetentionDays);
    setPublishSelected(held.publishSelectedRecords);
  }, [handle.state]);

  const application = (handle.state?.buildState.foundation.application ?? 'dapps') as Application;

  const templates = useMemo(
    () =>
      describeTemplates(
        templatesForVariant(application, SEED_TEMPLATES),
        partsFor(application, SEED_MODULES),
      ).filter((card) => card.template.projectType === track),
    [application, track],
  );

  const derivation = useMemo(() => {
    const base = deriveTrack(application, {
      templateTrack: templates.find((card) => card.template.id === templateId)?.template
        .projectType,
    });
    return handle.state?.buildState.foundation.trackOverridden
      ? applyTrackOverride(base, track)
      : base;
  }, [application, templateId, templates, track, handle.state]);

  const blockFix = boundFix(blockSeconds, BLOCK_SECONDS);
  const retentionFix = boundFix(retentionDays, HISTORY_RETENTION_DAYS);
  const nameFix = name.trim().length < 2 ? 'Type a name of at least two characters.' : null;

  const save = async () => {
    const state = handle.state;
    if (!state || nameFix || blockFix || retentionFix) return;
    setSaved(false);
    const next: BuildState = {
      ...state.buildState,
      foundation: {
        projectName: name.trim(),
        summary: summary.trim(),
        application,
        track: derivation.track,
        trackOverridden: derivation.overridden,
        templateId,
        publishSelectedRecords: publishSelected,
        blockSeconds: withinBound(blockSeconds, BLOCK_SECONDS.bound),
        historyRetentionDays: withinBound(retentionDays, HISTORY_RETENTION_DAYS.bound),
      },
      steps: { ...state.buildState.steps, foundation: true },
    };
    const wroteState = await handle.saveBuildState(next);
    if (!wroteState) return;
    const wroteBlueprint = await handle.saveBlueprint(
      { ...state.blueprint, name: name.trim(), summary: summary.trim() },
      'Set the name and the summary in Step 1',
    );
    if (!wroteBlueprint) return;
    await api(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: name.trim(), summary: summary.trim() }),
    }).catch(() => undefined);
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

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="overline" color="text.secondary">
        Step 1 of 6
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Foundation
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Everything below arrives filled. Change what matters and continue.
      </Typography>

      {handle.failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{handle.failure.message}</AlertTitle>
          {handle.failure.fix}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Cerulea saved the foundation against this project.
        </Alert>
      )}

      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            What we are building
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              size="small"
              error={nameFix !== null}
              helperText={
                nameFix ??
                'The name a colleague reads beside this work, and the name the deployed system carries.'
              }
            />
            <TextField
              label="What this system does"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              size="small"
              multiline
              minRows={2}
              helperText="One or two sentences. Cerulea checks the finished system against this statement before deployment."
            />
            <TextField
              label="Workspace"
              value={workspaces[0]?.name ?? 'Opening a workspace'}
              size="small"
              InputProps={{ readOnly: true }}
              helperText="A project stays in the workspace it opened in. Colleagues reach it through that workspace."
            />
          </Stack>
        </Paper>

        <WorkspaceApplication application={application} />

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            Where the records live
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {APPLICATION_LABEL[application]}. {derivation.reason}
          </Typography>
          {derivation.questionShown ? (
            <TextField
              select
              label="Network"
              value={derivation.track}
              onChange={(event) => setTrack(event.target.value as ProjectTrack)}
              size="small"
              sx={{ minWidth: 320 }}
              helperText={TRACK_MEANING[derivation.track]}
            >
              {derivation.options.map((option) => (
                <MenuItem key={option.track} value={option.track}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Chip label={TRACK_LABEL[derivation.track]} />
          )}
          {derivation.publishNote && (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                variant={publishSelected ? 'contained' : 'outlined'}
                onClick={() => setPublishSelected((previous) => !previous)}
              >
                {publishSelected ? 'Publishing chosen records' : 'Publish chosen records later'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {derivation.publishNote}
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            The starting point
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cerulea begins every project from a working template, so the canvas is populated and
            valid from the first moment.
          </Typography>
          <TextField
            select
            label="Template"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            size="small"
            fullWidth
            helperText={
              templates.find((card) => card.template.id === templateId)
                ? `${templates.find((card) => card.template.id === templateId)?.difficultyReason} Cerulea installs ${templates.find((card) => card.template.id === templateId)?.partCount} parts for it.`
                : 'Choose the closest starting point. Every part it installs stays changeable afterwards.'
            }
          >
            {templates.map((card) => (
              <MenuItem key={card.template.id} value={card.template.id}>
                {card.template.title}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Network properties
          </Typography>
          <Stack spacing={3}>
            <Box>
              <TextField
                label={BLOCK_SECONDS.label}
                value={blockSeconds}
                onChange={(event) => setBlockSeconds(Number(event.target.value))}
                size="small"
                inputProps={{ inputMode: 'numeric' }}
                error={blockFix !== null}
                helperText={blockFix ?? describeBlockSeconds(blockSeconds)}
                sx={{ width: 260 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {BLOCK_SECONDS.does}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {BLOCK_SECONDS.breaks}
              </Typography>
            </Box>
            <Divider />
            <Box>
              <TextField
                label={HISTORY_RETENTION_DAYS.label}
                value={retentionDays}
                onChange={(event) => setRetentionDays(Number(event.target.value))}
                size="small"
                inputProps={{ inputMode: 'numeric' }}
                error={retentionFix !== null}
                helperText={retentionFix ?? describeRetention(retentionDays)}
                sx={{ width: 260 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {HISTORY_RETENTION_DAYS.does}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {HISTORY_RETENTION_DAYS.breaks}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => void save()}
            disabled={handle.saving || nameFix !== null || blockFix !== null || retentionFix !== null}
          >
            {handle.saving ? 'Saving' : 'Save and continue'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
