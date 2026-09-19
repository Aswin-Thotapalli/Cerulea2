'use client';

// apps/frontend/src/app/dashboard/keys/page.tsx
// The Keys panel.
// A key lets a caller outside Cerulea reach a deployed system. Each key carries
// the scopes it may use, a request limit and an expiry. Cerulea stores a hash
// of the key and shows the key once.
// Without a key nothing outside Cerulea reaches a deployed system.

import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import {
  PanelBody,
  PanelEmpty,
  describeFailure,
  usePanelData,
  type PanelFailure,
} from '@/components/dashboard/PanelState';
import { api } from '@/lib/apiClient';
import { SCOPE_MEANING } from '@/components/dashboard/wording';

type KeysView = {
  workspace: { workspaceId: string; name: string };
  keys: {
    keyId: string;
    name: string;
    prefix: string;
    scopes: string[];
    requestsPerMinute: number;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
  }[];
  scopes: string[];
};

export default function KeysPanel() {
  const reading = usePanelData<KeysView>('/api/dashboard/keys');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [limit, setLimit] = useState('600');
  const [issued, setIssued] = useState<{ secret: string; guidance: string } | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [working, setWorking] = useState(false);

  const issue = async () => {
    setWorking(true);
    setFailure(null);
    try {
      const outcome = await api<{ secret: string; guidance: string }>('/api/dashboard/keys', {
        method: 'POST',
        body: JSON.stringify({
          name,
          scopes: chosen,
          requestsPerMinute: Number(limit) || 600,
        }),
      });
      setIssued(outcome);
      setOpen(false);
      setName('');
      setChosen([]);
      reading.readAgain();
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setWorking(false);
    }
  };

  const act = async (keyId: string, method: 'PATCH' | 'DELETE') => {
    setFailure(null);
    try {
      const outcome = await api<{ secret?: string; guidance: string }>(
        `/api/dashboard/keys?keyId=${encodeURIComponent(keyId)}`,
        { method },
      );
      if (outcome.secret) setIssued({ secret: outcome.secret, guidance: outcome.guidance });
      reading.readAgain();
    } catch (cause) {
      setFailure(describeFailure(cause));
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Keys and access
        </Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Issue a key
        </Button>
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        A key lets a program outside Cerulea reach a deployed system. Each key carries the scopes
        it may use and a request limit. Revoking a key closes it at once.
      </Typography>

      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      {issued && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setIssued(null)}>
          <AlertTitle>{issued.guidance}</AlertTitle>
          <Typography component="code" sx={{ wordBreak: 'break-all', fontWeight: 700 }}>
            {issued.secret}
          </Typography>
        </Alert>
      )}

      <PanelBody reading={reading} subject="the keys of this workspace">
        {(view) => (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            {view.keys.length === 0 ? (
              <PanelEmpty
                heading="No key yet"
                explanation="Issue a key when a program outside Cerulea needs to read records or run an action."
                action={
                  <Button variant="contained" onClick={() => setOpen(true)}>
                    Issue the first key
                  </Button>
                }
              />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Opening</TableCell>
                    <TableCell>Scopes</TableCell>
                    <TableCell align="right">Requests each minute</TableCell>
                    <TableCell>Last used</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell align="right">Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.keys.map((key) => (
                    <TableRow key={key.keyId}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>
                        <Typography component="code" variant="body2">
                          {key.prefix}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {key.scopes.map((scope) => (
                            <Chip key={scope} size="small" label={scope} variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{key.requestsPerMinute}</TableCell>
                      <TableCell>
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleString()
                          : 'Not used yet'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={key.revokedAt ? 'default' : 'success'}
                          label={key.revokedAt ? 'Closed' : 'Open'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {key.revokedAt === null && (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={() => void act(key.keyId, 'PATCH')}>
                              Rotate
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => void act(key.keyId, 'DELETE')}
                            >
                              Revoke
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}
      </PanelBody>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Issue a key</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              size="small"
              helperText="The name tells a reader which program holds this key."
            />
            <TextField
              label="Requests each minute"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              size="small"
              inputProps={{ inputMode: 'numeric' }}
              helperText="Cerulea refuses calls above this rate and names the wait."
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Scopes
              </Typography>
              {(reading.data?.scopes ?? []).map((scope) => (
                <Box key={scope}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={chosen.includes(scope)}
                        onChange={(event) =>
                          setChosen((previous) =>
                            event.target.checked
                              ? [...previous, scope]
                              : previous.filter((entry) => entry !== scope),
                          )
                        }
                      />
                    }
                    label={scope}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                    {SCOPE_MEANING[scope] ?? 'Reaches part of the generated surface.'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Leave it</Button>
          <Button
            variant="contained"
            onClick={() => void issue()}
            disabled={working || name.trim().length < 2 || chosen.length === 0}
          >
            Issue the key
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
