'use client';

// apps/frontend/src/app/dashboard/keys/page.tsx
// The Keys & Access screen.
// An access key lets a program outside Cerulea reach a deployed system through
// Cerulea APIs. Each key carries the scopes it may use, a request limit and an
// expiry. Cerulea stores a hash of the key and shows the key once.
// Without a key nothing outside Cerulea reaches a deployed system.

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Alert, CircularProgress,
  Checkbox, FormControlLabel, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import KeyIcon from '@mui/icons-material/Key';
import CheckIcon from '@mui/icons-material/Check';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import { api } from '@/lib/apiClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApiKey = {
  keyId: string;
  name: string;
  prefix: string;
  scopes: string[];
  requestsPerMinute: number;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type KeysView = {
  workspace: { workspaceId: string; name: string };
  workspaces: { workspaceId: string; name: string }[];
  keys: ApiKey[];
  scopes: string[];
  scopePurposes: { scope: string; purpose: string }[];
};

type IssuedKey = { secret: string; guidance: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turns a real timestamp into the relative phrase beside a key. */
function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Never';
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** The message and the fix of one failure, as one sentence the screen shows. */
function sentenceOf(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim().length > 0) return cause.message;
  return fallback;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow>
      <IconButton size="small" onClick={handle} aria-label="Copy the key">
        {copied
          ? <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} />
          : <ContentCopyIcon sx={{ fontSize: 14 }} />}
      </IconButton>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KeysPage() {
  // ── API key list ──────────────────────────────────────────────────────────
  const [view, setView] = useState<KeysView | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchKeys = useCallback(async (named?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const suffix = named ? `?workspaceId=${encodeURIComponent(named)}` : '';
      const data = await api<KeysView>(`/api/dashboard/keys${suffix}`);
      setView(data);
      setWorkspaceId(data.workspace.workspaceId);
    } catch (e: unknown) {
      setLoadError(sentenceOf(e, 'Cerulea could not read the keys. Open the screen again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchKeys(); }, [fetchKeys]);

  const keys = view?.keys ?? [];
  const openKeys = keys.filter((key) => key.revokedAt === null);
  const workspaceQuery = workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : '';

  // ── Generate dialog ────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [chosenScopes, setChosenScopes] = useState<string[]>([]);
  const [limit, setLimit] = useState('600');
  const [expiryDays, setExpiryDays] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<IssuedKey | null>(null);

  const canGenerate = newKeyName.trim().length >= 2 && chosenScopes.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const body: Record<string, unknown> = {
        name: newKeyName.trim(),
        scopes: chosenScopes,
        requestsPerMinute: Number(limit) || 600,
        workspaceId,
      };
      const days = Number(expiryDays);
      if (expiryDays.trim().length > 0 && Number.isInteger(days) && days > 0) body.expiresInDays = days;
      const data = await api<IssuedKey>('/api/dashboard/keys', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setGeneratedKey({ secret: data.secret, guidance: data.guidance });
      void fetchKeys(workspaceId);
    } catch (e: unknown) {
      setGenerateError(sentenceOf(e, 'Cerulea could not generate the key. Try again.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setGeneratedKey(null);
    setGenerateError(null);
    setNewKeyName('');
    setChosenScopes([]);
    setLimit('600');
    setExpiryDays('');
  };

  // ── Rotate dialog ─────────────────────────────────────────────────────────
  const [rotateTarget, setRotateTarget] = useState<ApiKey | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  const handleRotate = async () => {
    if (!rotateTarget) return;
    setRotating(true);
    setRotateError(null);
    try {
      const data = await api<IssuedKey>(
        `/api/dashboard/keys?keyId=${encodeURIComponent(rotateTarget.keyId)}${workspaceQuery}`,
        { method: 'PATCH' },
      );
      setRotateTarget(null);
      setGeneratedKey({ secret: data.secret, guidance: data.guidance });
      setDialogOpen(true);
      void fetchKeys(workspaceId);
    } catch (e: unknown) {
      setRotateError(sentenceOf(e, 'Cerulea could not rotate the key. Try again.'));
    } finally {
      setRotating(false);
    }
  };

  // ── Revoke dialog ─────────────────────────────────────────────────────────
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await api(
        `/api/dashboard/keys?keyId=${encodeURIComponent(revokeTarget.keyId)}${workspaceQuery}`,
        { method: 'DELETE' },
      );
      setRevokeTarget(null);
      void fetchKeys(workspaceId);
    } catch (e: unknown) {
      // The dialog stays open, so the person reads the reason and tries again.
      setRevokeError(sentenceOf(e, 'Cerulea could not revoke the key. Try again.'));
    } finally {
      setRevoking(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>
            ACCESS MANAGEMENT
          </Typography>
          <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: -0.5, mt: 0.5 }}>
            Keys & Access
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Access keys that let a program outside Cerulea reach a deployed system through Cerulea APIs.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={!view}
          sx={{ fontWeight: 700 }}
        >
          Generate API Key
        </Button>
      </Stack>

      {/* API Keys */}
      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyIcon sx={{ fontSize: 16, color: '#4F46E5' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>API Keys</Typography>
            <Chip
              label={openKeys.length}
              size="small"
              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', border: 'none' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, maxWidth: 520 }}>
              Each key carries the scopes it may use, a request limit and an expiry. Cerulea keeps a hash and shows the key once.
            </Typography>
            {view && view.workspaces.length > 1 && (
              <FormControl size="small" sx={{ ml: 'auto', minWidth: 220 }}>
                <InputLabel id="keys-workspace-label">Workspace</InputLabel>
                <Select
                  labelId="keys-workspace-label"
                  label="Workspace"
                  value={workspaceId}
                  onChange={(e) => void fetchKeys(String(e.target.value))}
                  sx={{ fontSize: '0.8rem' }}
                >
                  {view.workspaces.map((entry) => (
                    <MenuItem key={entry.workspaceId} value={entry.workspaceId} sx={{ fontSize: '0.8rem' }}>
                      {entry.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }} role="status" aria-label="Reading the keys">
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Error */}
        {!loading && loadError && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button size="small" onClick={() => void fetchKeys(workspaceId || undefined)}>Retry</Button>}>
              {loadError}
            </Alert>
          </Box>
        )}

        {/* Empty */}
        {!loading && !loadError && keys.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <KeyIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No API keys yet.</Typography>
            <Typography variant="caption" color="text.disabled">
              Generate one when a program outside Cerulea needs to read records or run an action.
            </Typography>
          </Box>
        )}

        {/* Key rows */}
        {!loading && !loadError && keys.map((key, idx) => {
          const revoked = key.revokedAt !== null;
          return (
            <Box
              key={key.keyId}
              data-testid={`key-row-${key.keyId}`}
              sx={{
                px: 3, py: 2,
                borderBottom: idx < keys.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                display: 'flex', alignItems: 'center', gap: 2,
                borderLeft: '3px solid transparent',
                opacity: revoked ? 0.6 : 1,
                transition: 'all 0.12s',
                '&:hover': { bgcolor: alpha('#4F46E5', 0.02), borderLeftColor: alpha('#4F46E5', 0.3) },
              }}
            >
              <Box sx={{ width: 38, height: 38, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>{key.name}</Typography>
                  {revoked && (
                    <Chip label="Revoked" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha('#6b7280', 0.12), color: '#6b7280', border: 'none' }} />
                  )}
                </Stack>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: '0.72rem', letterSpacing: 2 }}>
                  {key.prefix}••••••••••••••••••••••••
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {key.scopes.map((scope) => (
                    <Chip key={scope} label={scope} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                  ))}
                  <Chip
                    label={`${key.requestsPerMinute} requests a minute`}
                    size="small"
                    sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha('#4F46E5', 0.06), border: 'none' }}
                  />
                  <Chip
                    label={key.expiresAt ? `Expires ${shortDate(key.expiresAt)}` : 'No expiry'}
                    size="small"
                    sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha('#f59e0b', 0.08), color: '#b45309', border: 'none' }}
                  />
                </Stack>
              </Box>

              <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 140 }}>
                <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                  <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {key.lastUsedAt ? `Used ${relativeTime(key.lastUsedAt)}` : 'Never used'}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                  Created {shortDate(key.createdAt)}
                </Typography>
              </Box>

              {revoked ? null : (
                <>
                  <Tooltip title="Rotate key" arrow>
                    <IconButton size="small" color="primary" onClick={() => setRotateTarget(key)} aria-label={`Rotate ${key.name}`}>
                      <AutorenewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Revoke key" arrow>
                    <IconButton size="small" color="error" onClick={() => setRevokeTarget(key)} aria-label={`Revoke ${key.name}`}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          );
        })}
      </Paper>

      {/* Generate Key Dialog */}
      <Dialog open={dialogOpen} onClose={generatedKey ? handleDialogClose : undefined} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{generatedKey ? 'Your New API Key' : 'Generate New API Key'}</DialogTitle>
        <DialogContent>
          {!generatedKey ? (
            <Stack spacing={2.5} pt={1}>
              <TextField
                label="Key Name"
                placeholder="e.g. Partner bank, Reporting service"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canGenerate) void handleGenerate(); }}
                fullWidth
                size="small"
                autoFocus
                helperText="The name tells a reader which program holds this key."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Requests a minute"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  helperText="Cerulea refuses calls above this rate and names the wait."
                />
                <TextField
                  label="Expires in days"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  helperText="Leave empty for a key with no expiry."
                />
              </Stack>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Scopes</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  A scope names one part of the generated surface the key may reach.
                </Typography>
                {(view?.scopePurposes ?? []).map((entry) => (
                  <Box key={entry.scope}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={chosenScopes.includes(entry.scope)}
                          onChange={(e) =>
                            setChosenScopes((previous) =>
                              e.target.checked
                                ? [...previous, entry.scope]
                                : previous.filter((scope) => scope !== entry.scope),
                            )
                          }
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{entry.scope}</Typography>}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: -0.5, mb: 0.5 }}>
                      {entry.purpose}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {generateError && <Alert severity="error">{generateError}</Alert>}
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                The full key is shown once after generation. Copy it and store it securely. Cerulea keeps a hash only.
              </Alert>
            </Stack>
          ) : (
            <Stack spacing={2} pt={1}>
              <Alert severity="warning">Copy this key now. Cerulea shows it once.</Alert>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#10b981', 0.05), borderColor: alpha('#10b981', 0.3) }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2" data-testid="generated-key" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem', flex: 1 }}>
                    {generatedKey.secret}
                  </Typography>
                  <CopyButton value={generatedKey.secret} />
                </Stack>
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {generatedKey.guidance} Send the key in the <code>x-cerulea-key</code> header on every call to the generated surface of a deployment.
                Keep it secret. It grants access inside its scopes.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDialogClose} sx={{ borderRadius: 1 }}>
            {generatedKey ? 'Done' : 'Cancel'}
          </Button>
          {!generatedKey && (
            <Button
              variant="contained"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || generating}
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Rotate Dialog */}
      <Dialog open={!!rotateTarget} onClose={() => !rotating && setRotateTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Rotate API Key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Cerulea issues a new key with the same name, scopes and limit, and closes <strong>{rotateTarget?.name}</strong> at once.
            Any program using the current key must switch to the new one.
          </Typography>
          {rotateError && <Alert severity="error" sx={{ mt: 2 }}>{rotateError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRotateTarget(null)} disabled={rotating} sx={{ borderRadius: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleRotate()}
            disabled={rotating}
            startIcon={rotating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            {rotating ? 'Rotating…' : 'Rotate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!revokeTarget} onClose={() => !revoking && setRevokeTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Revoke API Key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{revokeTarget?.name}</strong> stops working at once. Any program using this key loses access immediately.
          </Typography>
          {revokeError && <Alert severity="error" sx={{ mt: 2 }}>{revokeError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} disabled={revoking} sx={{ borderRadius: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleRevoke()}
            disabled={revoking}
            startIcon={revoking ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            {revoking ? 'Revoking…' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
