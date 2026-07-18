'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Alert, CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import CheckIcon from '@mui/icons-material/Check';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApiKey = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow>
      <IconButton size="small" onClick={handle}>
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
  const theme = useTheme();

  // ── API key list ──────────────────────────────────────────────────────────
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/mcp/keys');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load keys');
      setKeys(data.keys ?? []);
    } catch (e: any) {
      setLoadError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  // ── Generate dialog ────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!newKeyName.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/mcp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate key');
      setGeneratedKey(data.key.fullKey);
      setKeys((prev) => [{ id: data.key.id, name: data.key.name, lastUsedAt: null, createdAt: new Date().toISOString() }, ...prev]);
    } catch (e: any) {
      setGenerateError(e.message ?? 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setGeneratedKey(null);
    setGenerateError(null);
    setNewKeyName('');
  };

  // ── Revoke dialog ─────────────────────────────────────────────────────────
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/mcp/keys/${revokeTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke key');
      setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
      setRevokeTarget(null);
    } catch {
      // keep dialog open so user can retry
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
            API keys for the Cerulea MCP server and validator signing keys.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Generate API Key
        </Button>
      </Stack>

      {/* API Keys */}
      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyIcon sx={{ fontSize: 16, color: '#4F46E5' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>API Keys</Typography>
            <Chip
              label={keys.length}
              size="small"
              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', border: 'none' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, maxWidth: 520 }}>
              Use these keys to authenticate the Cerulea MCP server in Claude, Cursor, and other AI tools.
            </Typography>
          </Stack>
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Error */}
        {!loading && loadError && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button size="small" onClick={fetchKeys}>Retry</Button>}>
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
              Generate one to connect Claude, Cursor, or any MCP-compatible AI tool.
            </Typography>
          </Box>
        )}

        {/* Key rows */}
        {!loading && !loadError && keys.map((key, idx) => (
          <Box
            key={key.id}
            sx={{
              px: 3, py: 2,
              borderBottom: idx < keys.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 2,
              borderLeft: '3px solid transparent',
              transition: 'all 0.12s',
              '&:hover': { bgcolor: alpha('#4F46E5', 0.02), borderLeftColor: alpha('#4F46E5', 0.3) },
            }}
          >
            <Box sx={{ width: 38, height: 38, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <KeyIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700}>{key.name}</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: '0.72rem', letterSpacing: 2 }}>
                ck_live_••••••••••••••••••••••••••••••••
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 140 }}>
              <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">{relativeTime(key.lastUsedAt)}</Typography>
              </Stack>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                Created {shortDate(key.createdAt)}
              </Typography>
            </Box>

            <Tooltip title="Revoke key" arrow>
              <IconButton size="small" color="error" onClick={() => setRevokeTarget(key)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Paper>

      {/* Validator Keys — placeholder */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>Validator Keys</Typography>
            <Chip label="Coming soon" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', border: 'none' }} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, maxWidth: 480 }}>
              Cryptographic signing keys for consensus participation. Available once your chain is provisioned.
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">Validator keys are issued during chain provisioning.</Typography>
          <Typography variant="caption" color="text.disabled">They will appear here once your private chain is live.</Typography>
        </Box>
      </Paper>

      {/* Generate Key Dialog */}
      <Dialog open={dialogOpen} onClose={generatedKey ? handleDialogClose : undefined} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Generate New API Key</DialogTitle>
        <DialogContent>
          {!generatedKey ? (
            <Stack spacing={2.5} pt={1}>
              <TextField
                label="Key Name"
                placeholder="e.g. Claude Desktop, My Agent"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newKeyName.trim()) handleGenerate(); }}
                fullWidth
                size="small"
                autoFocus
              />
              {generateError && <Alert severity="error">{generateError}</Alert>}
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                The full key is shown only once after generation. Copy and store it securely — it cannot be recovered.
              </Alert>
            </Stack>
          ) : (
            <Stack spacing={2} pt={1}>
              <Alert severity="warning">Copy this key now — it will not be shown again.</Alert>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#10b981', 0.05), borderColor: alpha('#10b981', 0.3) }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem', flex: 1 }}>
                    {generatedKey}
                  </Typography>
                  <CopyButton value={generatedKey} />
                </Stack>
              </Paper>
              <Typography variant="caption" color="text.secondary">
                Add this to your MCP client config under{' '}
                <code>studio.cerulea.io/mcp/mcp</code>.
                Pass it as the <code>apiKey</code> argument in any Cerulea tool call.
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
              onClick={handleGenerate}
              disabled={!newKeyName.trim() || generating}
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!revokeTarget} onClose={() => !revoking && setRevokeTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Revoke API Key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{revokeTarget?.name}</strong> will be permanently deleted. Any MCP client using this key will lose access immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} disabled={revoking} sx={{ borderRadius: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRevoke}
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
