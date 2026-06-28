'use client';

import { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Alert,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import CheckIcon from '@mui/icons-material/Check';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

type ApiKey = {
  id: string;
  name: string;
  scopes: string[];
  created: string;
  lastUsed: string;
  preview: string;
};

type ValidatorKey = {
  id: string;
  address: string;
  type: string;
  network: string;
  added: string;
};

const STUB_API_KEYS: ApiKey[] = [
  { id: 'ak-1', name: 'Production Backend', scopes: ['read', 'write'], created: '2025-11-01', lastUsed: '2 hours ago', preview: 'ck_live_****...****a3f2' },
  { id: 'ak-2', name: 'Analytics Service', scopes: ['read'], created: '2025-12-15', lastUsed: 'Yesterday', preview: 'ck_live_****...****9b1d' },
  { id: 'ak-3', name: 'CI/CD Pipeline', scopes: ['deploy', 'read'], created: '2026-01-08', lastUsed: '3 days ago', preview: 'ck_live_****...****c7e8' },
];

const STUB_VALIDATOR_KEYS: ValidatorKey[] = [
  { id: 'vk-1', address: '0x3d5a****...****fe29', type: 'BLS-12381', network: 'CeruleaChain Mainnet', added: '2025-11-01' },
  { id: 'vk-2', address: '0x8f2b****...****aa41', type: 'BLS-12381', network: 'CeruleaChain Mainnet', added: '2025-11-01' },
  { id: 'vk-3', address: '0x1c9e****...****3d80', type: 'Ed25519', network: 'VoteApp Devnet', added: '2025-12-20' },
];

const SCOPE_META: Record<string, { color: string; label: string }> = {
  read: { color: '#4F46E5', label: 'Read' },
  write: { color: '#f59e0b', label: 'Write' },
  deploy: { color: '#10b981', label: 'Deploy' },
  admin: { color: '#ef4444', label: 'Admin' },
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow>
      <IconButton size="small" onClick={handleCopy}>
        {copied ? <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
      </IconButton>
    </Tooltip>
  );
}

export default function KeysPage() {
  const theme = useTheme();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(STUB_API_KEYS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const handleGenerate = () => {
    const key = `ck_live_${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 6)}`;
    setApiKeys((prev) => [...prev, {
      id: `ak-${Date.now()}`, name: newKeyName || 'New API Key',
      scopes: ['read'], created: new Date().toISOString().slice(0, 10),
      lastUsed: 'Never', preview: `ck_live_****...****${Math.random().toString(36).slice(2, 6)}`,
    }]);
    setGeneratedKey(key);
    setNewKeyName('');
  };

  const handleRevoke = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    setRevokeId(null);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1100 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>
            ACCESS MANAGEMENT
          </Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>
            Keys & Access
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            API keys, validator signing keys, and access credentials — all in one place.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setGeneratedKey(null); setDialogOpen(true); }}
          sx={{ borderRadius: 999, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)' }}>
          Generate API Key
        </Button>
      </Stack>

      {/* API Keys section */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyIcon sx={{ fontSize: 16, color: '#4F46E5' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>API Keys</Typography>
            <Chip label={apiKeys.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', border: 'none' }} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, maxWidth: 520 }}>
              Authenticate backend services and CI/CD pipelines. Treat keys like passwords — store in env vars, never commit to source control.
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ divide: 'divider' }}>
          {apiKeys.map((key, idx) => (
            <Box key={key.id} sx={{
              px: 3, py: 2, borderBottom: idx < apiKeys.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 2,
              '&:hover': { bgcolor: alpha('#4F46E5', 0.02) },
              borderLeft: '3px solid transparent',
              '&:hover': { bgcolor: alpha('#4F46E5', 0.02), borderLeftColor: alpha('#4F46E5', 0.3) },
            }}>
              {/* Icon */}
              <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
              </Box>

              {/* Name + key */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>{key.name}</Typography>
                <Stack direction="row" alignItems="center" spacing={0.5} mt={0.25}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.72rem' }}>
                    {key.preview}
                  </Typography>
                  <CopyButton value={key.preview} />
                </Stack>
              </Box>

              {/* Scopes */}
              <Stack direction="row" spacing={0.5} flexShrink={0}>
                {key.scopes.map((s) => {
                  const meta = SCOPE_META[s] || { color: '#4F46E5', label: s };
                  return (
                    <Box key={s} sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: alpha(meta.color, 0.1), color: meta.color, fontSize: '0.62rem', fontWeight: 700 }}>
                      {meta.label}
                    </Box>
                  );
                })}
              </Stack>

              {/* Meta */}
              <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 120 }}>
                <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                  <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">{key.lastUsed}</Typography>
                </Stack>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>Created {key.created}</Typography>
              </Box>

              {/* Delete */}
              <Tooltip title="Revoke key" arrow>
                <IconButton size="small" color="error" onClick={() => setRevokeId(key.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Validator Keys section */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>Validator Keys</Typography>
            <Chip label={STUB_VALIDATOR_KEYS.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', border: 'none' }} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, maxWidth: 480 }}>
              Cryptographic signing keys for consensus participation. Never share private validator keys — compromise leads to slashing penalties.
            </Typography>
          </Stack>
        </Box>

        <Box>
          {STUB_VALIDATOR_KEYS.map((vk, idx) => (
            <Box key={vk.id} sx={{
              px: 3, py: 2, borderBottom: idx < STUB_VALIDATOR_KEYS.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 2,
              borderLeft: '3px solid transparent',
              transition: 'all 0.12s',
              '&:hover': { bgcolor: alpha('#8b5cf6', 0.02), borderLeftColor: alpha('#8b5cf6', 0.3) },
            }}>
              {/* Icon */}
              <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: alpha('#8b5cf6', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LockIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
              </Box>

              {/* Address */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem' }}>{vk.address}</Typography>
                  <CopyButton value={vk.address} />
                </Stack>
                <Typography variant="caption" color="text.secondary">{vk.network}</Typography>
              </Box>

              {/* Type */}
              <Box sx={{ px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                {vk.type}
              </Box>

              {/* Added */}
              <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>Added {vk.added}</Typography>

              <Button size="small" variant="outlined" sx={{ borderRadius: 999, fontSize: '0.7rem', borderColor: alpha('#8b5cf6', 0.3), color: '#8b5cf6', flexShrink: 0 }}>
                Export
              </Button>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Generate Key Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Generate New API Key</DialogTitle>
        <DialogContent>
          {!generatedKey ? (
            <Stack spacing={2.5} pt={1}>
              <TextField label="Key Name" placeholder="e.g. Production Backend" value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)} fullWidth size="small" />
              <Typography variant="caption" color="text.secondary">
                The key will be shown only once. Store it securely after generation.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} pt={1}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>Copy this key now; it will not be shown again.</Alert>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#10b981', 0.05), borderColor: alpha('#10b981', 0.3) }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{generatedKey}</Typography>
                  <CopyButton value={generatedKey} />
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 999 }}>{generatedKey ? 'Done' : 'Cancel'}</Button>
          {!generatedKey && (
            <Button variant="contained" onClick={handleGenerate} disabled={!newKeyName.trim()} sx={{ borderRadius: 999, fontWeight: 700 }}>
              Generate
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <Dialog open={!!revokeId} onClose={() => setRevokeId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Revoke API Key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action is irreversible. Any service using this key will lose access immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeId(null)} sx={{ borderRadius: 999 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => revokeId && handleRevoke(revokeId)} sx={{ borderRadius: 999, fontWeight: 700 }}>
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
