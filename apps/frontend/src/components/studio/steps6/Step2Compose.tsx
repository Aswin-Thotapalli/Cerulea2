'use client';

// apps/frontend/src/components/studio/steps6/Step2Compose.tsx
// Step 2 Compose.
// A person picks plain statements. Cerulea resolves the full dependency
// closure, reports every conflict in plain language and draws the map that
// explains what it assembled. Saving writes the selection to the build state
// and installs the records those parts keep into the Blueprint.
// Without this step a person would decompose the work into modules by hand.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import OutcomeCatalogue from '@/components/studio/outcomes/OutcomeCatalogue';
import ConflictReport from '@/components/studio/outcomes/ConflictReport';
import ModuleMap from '@/components/studio/map/ModuleMap';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { partsFor } from '@/lib/variants/application';
import { detectConflicts } from '@/lib/outcomes/conflicts';
import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import {
  modulesWithBridgeRuntime,
  outcomesWithBridges,
  resolveFromModulesWithBridges,
} from '@/lib/outcomes/bridges';
import { openingSelection } from '@/lib/outcomes/reflect';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { useProjectState, type BuildState } from '@/lib/studio/project-state';
import type { MapLink } from '@/lib/map/links';

export default function Step2Compose({
  projectId,
  onContinue,
}: {
  projectId: string;
  onContinue?: () => void;
}) {
  const handle = useProjectState(projectId);
  const [selected, setSelected] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const state = handle.state;
    if (!state) return;
    setSelected(openingSelection(state.buildState.compose, SEED_MODULES));
    setRemoved(state.buildState.compose.removedModuleIds);
  }, [handle.state]);

  const track = handle.state?.buildState.foundation.track ?? 'dapp';
  const application = handle.state?.buildState.foundation.application ?? 'dapps';

  /**
   * The parts this application offers.
   * Each application carries its own subset, so nobody meets a part their
   * audience holds no remit for.
   */
  const offered = useMemo(() => partsFor(application, SEED_MODULES), [application]);

  const resolution = useMemo(
    () => resolveFromModulesWithBridges(selected, offered),
    [offered, selected],
  );

  const installed = useMemo(
    () => resolution.installOrder.filter((moduleId) => removed.includes(moduleId) === false),
    [resolution.installOrder, removed],
  );

  const conflicts = useMemo(
    () =>
      detectConflicts(resolution, {
        track,
        outcomes: outcomesWithBridges(deriveOutcomes(offered)),
        modules: modulesWithBridgeRuntime(offered),
      }),
    [offered, resolution, track],
  );

  const composed = useMemo(
    () =>
      composeSections(installed, {
        retentionDays: handle.state?.buildState.foundation.historyRetentionDays,
      }),
    [installed, handle.state],
  );

  const userLinks: MapLink[] = useMemo(
    () =>
      (handle.state?.buildState.compose.chosenLinks ?? []).map((link) => ({
        linkId: `${link.kind}:${link.from}:${link.to}`,
        from: link.from,
        to: link.to,
        type: link.kind,
        origin: 'chosen' as const,
        reason: 'We drew this link by hand.',
        removable: true,
      })),
    [handle.state],
  );

  const removeModule = useCallback((moduleId: string) => {
    setRemoved((previous) => (previous.includes(moduleId) ? previous : [...previous, moduleId]));
  }, []);

  const save = async () => {
    const state = handle.state;
    if (!state) return;
    setSaved(false);
    const next: BuildState = {
      ...state.buildState,
      compose: {
        ...state.buildState.compose,
        outcomeIds: selected,
        moduleIds: installed,
        removedModuleIds: removed,
      },
      steps: { ...state.buildState.steps, compose: installed.length > 0 },
    };
    const wroteState = await handle.saveBuildState(next);
    if (!wroteState) return;
    const blueprint = applyComposition(
      state.blueprint,
      composed,
      state.blueprint.collections.map((entry) => entry.id),
    );
    const wroteBlueprint = await handle.saveBlueprint(
      blueprint,
      `Composed ${installed.length} parts from ${selected.length} outcomes`,
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

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="overline" color="text.secondary">
        Step 2 of 6
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Compose
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Pick the statements this system should deliver. Cerulea installs every part each statement
        needs, and explains why each part is there.
      </Typography>

      {handle.failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{handle.failure.message}</AlertTitle>
          {handle.failure.fix}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Cerulea saved the selection and installed {composed.collections.length} collections into
          the Blueprint.
        </Alert>
      )}

      <Stack spacing={4}>
        <OutcomeCatalogue
          selected={selected}
          onSelectedChange={setSelected}
          track={track}
          modules={offered}
        />

        <ConflictReport conflicts={conflicts} />

        <ModuleMap
          resolution={resolution}
          modules={offered}
          onRemoveModule={removeModule}
          userLinks={userLinks}
        />

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            What this installs into the model
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Every part that keeps records brings those records with it. Step 3 opens on this model
            rather than on an empty editor.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {composed.collections.map((collection) => (
              <Chip key={collection.id} size="small" label={collection.description} />
            ))}
          </Stack>
          {composed.collections.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No records yet. Pick a statement above and Cerulea installs the records it keeps.
            </Typography>
          )}
          {composed.withoutRecords.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                {composed.withoutRecords.length} parts keep no records of their own. They act on the
                records other parts keep.
              </Typography>
            </>
          )}
        </Paper>

        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => void save()}
            disabled={handle.saving}
          >
            {handle.saving ? 'Saving' : 'Save and continue'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
