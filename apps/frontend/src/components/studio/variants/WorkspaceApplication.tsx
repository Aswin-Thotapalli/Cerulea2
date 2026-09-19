'use client';

// apps/frontend/src/components/studio/variants/WorkspaceApplication.tsx
// The application this workspace serves, and the gates it carries.
// One Cerulea codebase serves three audiences. The choice is made when a
// workspace opens, and every project inside carries it. A workspace already
// open keeps the application it opened with, so a new audience opens a new
// workspace.
// Without this surface a person could not see which parts and which tiers
// their work admits.

import { useCallback, useEffect, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';

import ApplicationChoice from './ApplicationChoice';
import ControlMirror from '@/components/studio/common/ControlMirror';
import { StudioRouteError, api } from '@/lib/apiClient';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { partsFor, variantFor } from '@/lib/variants/application';
import type { Application } from '@/lib/track/derive';

type WorkspaceRow = { workspaceId: string; name: string; application: string };

/** Reads a stored application name, falling back to Dapps. */
export function readApplication(value: unknown): Application {
  return value === 'government' || value === 'enterprise' || value === 'dapps' ? value : 'dapps';
}

export default function WorkspaceApplication({
  application,
  onOpened,
}: {
  /** The application the project already carries. */
  application: Application;
  onOpened?: (workspace: WorkspaceRow) => void;
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<Application>(application);
  const [opened, setOpened] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      const held = await api<{ workspaces: WorkspaceRow[] }>('/api/workspaces');
      setWorkspaces(held.workspaces ?? []);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Open the screen again. Report the problem to the Cerulea operator when it repeats.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

  const openWorkspace = async () => {
    if (name.trim().length < 2) return;
    setOpening(true);
    setOpened(null);
    try {
      const held = await api<{ workspace: WorkspaceRow }>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), application: chosen }),
      });
      setOpened(
        `Cerulea opened ${held.workspace.name}, serving ${variantFor(chosen).label}. Every project inside carries that application.`,
      );
      setName('');
      await read();
      if (onOpened) onOpened(held.workspace);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Type a different name, then open the workspace again.',
      });
    } finally {
      setOpening(false);
    }
  };

  const held = variantFor(application);

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="workspace-application">
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Which Cerulea this work serves
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {held.label}. {held.serves}
      </Typography>
      <ControlMirror controlId="workspace.application" />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
        <Chip size="small" label={`${partsFor(application, SEED_MODULES).length} parts offered`} />
        <Chip size="small" label={`${held.tiers.length} ${held.tiers.length === 1 ? 'tier' : 'tiers'}`} />
        <Chip size="small" label={`A piece of work is a ${held.words.project}`} />
        {held.tiers.some((tier) => tier.airGapped) && <Chip size="small" label="Air-gapped option" />}
        {held.tiers.some((tier) => tier.residencyLock) && <Chip size="small" label="Residency lock" />}
      </Stack>

      {failure && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}
      {opened && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setOpened(null)}>
          {opened}
        </Alert>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        Open a workspace for another audience
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A workspace keeps the application it opened with, so every project inside stays inside one
        audience. Open a second workspace to serve another.
      </Typography>

      {loading ? (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">Cerulea is reading the workspaces.</Typography>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {workspaces.map((workspace) => (
              <Chip
                key={workspace.workspaceId}
                label={`${workspace.name}, ${variantFor(readApplication(workspace.application)).label}`}
              />
            ))}
            {workspaces.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No workspace is open yet.
              </Typography>
            )}
          </Stack>

          <ApplicationChoice application={chosen} onApplicationChange={setChosen} />

          <Box>
            <TextField
              size="small"
              label="Name of the new workspace"
              value={name}
              onChange={(event) => setName(event.target.value)}
              helperText="Colleagues reach every project through the workspace that holds it. Without a workspace nobody beside you reaches the work."
              sx={{ minWidth: 320 }}
            />
          </Box>
          <Box>
            <Button
              variant="outlined"
              onClick={() => void openWorkspace()}
              disabled={opening || name.trim().length < 2}
            >
              {opening ? 'Opening' : `Open a ${variantFor(chosen).label} workspace`}
            </Button>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
