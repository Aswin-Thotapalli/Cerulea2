'use client';

// apps/frontend/src/components/studio/ExecutionSubstrate.tsx
// Choosing where a system runs.
// Cerulea offers three execution substrates. Native interpretation of the
// Blueprint is the default. WebAssembly serves unbounded computation. Ethereum
// Virtual Machine bytecode serves ecosystem interoperation.
// The choice persists against the project through Cerulea APIs.
// Without a choice the system runs on native interpretation.

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
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';

export type SubstrateName = 'Native' | 'WebAssembly' | 'EthereumVirtualMachine';

type SubstrateDescription = {
  substrate: SubstrateName;
  name: string;
  summary: string;
  suits: string;
  cost: string;
};

type BuildStateView = {
  projectId: string;
  buildState: {
    execution: { substrate: SubstrateName; reason: string };
  } & Record<string, unknown>;
  rowVersion: number;
  substrates: SubstrateDescription[];
};

export default function ExecutionSubstrate({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose?: () => void;
}) {
  const [view, setView] = useState<BuildStateView | null>(null);
  const [chosen, setChosen] = useState<SubstrateName>('Native');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      const held = await api<BuildStateView>(
        `/api/projects/${encodeURIComponent(projectId)}/build-state`,
      );
      setView(held);
      setChosen(held.buildState.execution.substrate);
      setReason(held.buildState.execution.reason);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Open this screen again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  const save = async () => {
    if (!view) return;
    setSaving(true);
    setSaved(false);
    setFailure(null);
    try {
      const next = {
        ...view.buildState,
        execution: { substrate: chosen, reason },
      };
      await api(`/api/projects/${encodeURIComponent(projectId)}/build-state`, {
        method: 'PUT',
        body: JSON.stringify({ buildState: next }),
      });
      setSaved(true);
      await read();
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: cause instanceof StudioRouteError ? cause.fix : 'Save the choice again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={28} />
          <Typography variant="body2">Cerulea is reading where this system runs.</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Where this system runs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Cerulea reads the Blueprint directly by default. Two further substrates sit beside it
            for the work the typed document cannot express.
          </Typography>
        </Box>
        {onClose && <Button onClick={onClose}>Close</Button>}
      </Stack>

      {failure && (
        <Alert severity="error" sx={{ my: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ my: 2 }} onClose={() => setSaved(false)}>
          Cerulea saved the choice against this project.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ my: 3 }}>
        {(view?.substrates ?? []).map((entry) => {
          const selected = entry.substrate === chosen;
          return (
            <Card
              key={entry.substrate}
              variant="outlined"
              sx={{
                flex: 1,
                borderRadius: 3,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? 'primary.main' : 'divider',
              }}
            >
              <CardActionArea onClick={() => setChosen(entry.substrate)} sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {entry.name}
                    </Typography>
                    {selected && <Chip size="small" color="primary" label="Chosen" />}
                    {entry.substrate === 'Native' && <Chip size="small" label="Default" />}
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 1.5 }}>
                    {entry.summary}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Suits: {entry.suits}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    What it costs: {entry.cost}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>

      <TextField
        label="Why this substrate"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        fullWidth
        multiline
        minRows={2}
        size="small"
        helperText="A reviewer reads this sentence beside the choice in the Deployment Manifest."
        sx={{ mb: 3 }}
      />

      <Button variant="contained" onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving' : 'Save the choice'}
      </Button>
    </Box>
  );
}
