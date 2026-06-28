'use client';

import { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Alert, Checkbox, FormGroup, FormControlLabel,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import CheckIcon from '@mui/icons-material/Check';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

type ApiKey = {
  id: string;
  name: string;
  scopes: string[];
  created: string;
  lastUsed: string;
  maskedKey: string;
  fullKey: string;
};

type ValidatorKey = {
  id: string;
  address: string;
  fullAddress: string;
  type: string;
  network: string;
  added: string;
};

function generateFullKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `ck_live_${result}`;
}

function maskKey(full: string): string {
  if (full.length < 12) return full;
  return full.slice(0, 12) + '••••••••••••' + full.slice(-4);
}

function generateFullAddress(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return '0x' + Array.from({ length: 40 }, hex).join('');
}

function maskAddress(full: string): string {
  return full.slice(0, 6) + '••••••••••••••••••••••••••••••••' + full.slice(-4);
}

const INITIAL_KEYS: ApiKey[] = (() => {
  const keys = [
    { name: 'Production Backend', scopes: ['read', 'write'], created: '2025-11-01', lastUsed: '2 hours ago' },
    { name: 'Analytics Service', scopes: ['read'], created: '2025-12-15', lastUsed: 'Yesterday' },
    { name: 'CI/CD Pipeline', scopes: ['deploy', 'read'], created: '2026-01-08', lastUsed: '3 days ago' },
  ];
  return keys.map((k, i) => {
    const full = generateFullKey();
    return { id: `ak-${i + 1}`, ...k, fullKey: full, maskedKey: maskKey(full) };
  });
})();

const INITIAL_VALIDATOR_KEYS: ValidatorKey[] = (() => {
  const vks = [
    { type: 'BLS-12381', network: 'CeruleaChain Mainnet', added: '2025-11-01' },
    { type: 'BLS-12381', network: 'CeruleaChain Mainnet', added: '2025-11-01' },
    { type: 'Ed25519', network: 'VoteApp Devnet', added: '2025-12-20' },
  ];
  return vks.map((v, i) => {
    const full = generateFullAddress();
    return { id: `vk-${i + 1}`, ...v, fullAddress: full, address: maskAddress(full) };
  });
})();

const SCOPE_META: Record<string, { color: string; label: string }> = {
  read: { color: '#4F46E5', label: 'Read' },
  write: { color: '#f59e0b', label: 'Write' },
  deploy: { color: '#10b981', label: 'Deploy' },
  admin: { color: '#ef4444', label: 'Admin' },
};

const ALL_SCOPES = ['read', 'write', 'deploy', 'admin'];

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
        {copied ? <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
      </IconButton>
    </Tooltip>
  );
}

function RevealButton({ fullKey, maskedKey }: { fullKey: string; maskedKey: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.72rem', letterSpacing: revealed ? 0 : 2 }}>
        {revealed ? fullKey : maskedKey}
      </Typography>
      <Tooltip title={revealed ? 'Hide' : 'Reveal key'} arrow>
        <IconButton size="small" onClick={() => setRevealed(!revealed)}>
          {revealed ? <VisibilityOffIcon sx={{ fontSize: 14 }} /> : <VisibilityIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Tooltip>
      <CopyButton value={fullKey} />
    </Stack>
  );
}

export default function KeysPage() {
  const theme = useTheme();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [validatorKeys] = useState<ValidatorKey[]>(INITIAL_VALIDATOR_KEYS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read']);
  const [generatedKey, setGeneratedKey] = useState<{ full: string; masked: string } | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const handleGenerate = () => {
    const full = generateFullKey();
    const masked = maskKey(full);
    const newKey: ApiKey = {
      id: `ak-${Date.now()}`,
      name: newKeyName || 'New API Key',
      scopes: newKeyScopes.length ? newKeyScopes : ['read'],
      created: new Date().toISOString().slice(0, 10),
      lastUsed: 'Never',
      fullKey: full,
      maskedKey: masked,
    };
    setApiKeys((prev) => [...prev, newKey]);
    setGeneratedKey({ full, masked });
    setNewKeyName('');
    setNewKeyScopes(['read']);
  };

  const handleRevoke = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    setRevokeId(null);
  };

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
            API keys, validator signing keys, and access credentials — all in one place.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setGeneratedKey(null); setDialogOpen(true); }}
          sx={{ fontWeight: 700 }}>
          Generate API Key
        </Button>
      </Stack>

      {/* API Keys section */}
      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyIcon sx={{ fontSize: 16, color: '#4F46E5' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>API Keys</Typography>
            <Chip label={apiKeys.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', border: 'none' }} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, maxWidth: 520 }}>
              Authenticate backend services and CI/CD pipelines. Keys are shown masked — click the eye to reveal, or copy directly.
            </Typography>
          </Stack>
        </Box>

        <Box>
          {apiKeys.map((key, idx) => (
            <Box key={key.id} sx={{
              px: 3, py: 2,
              borderBottom: idx < apiKeys.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 2,
              borderLeft: '3px solid transparent',
              transition: 'all 0.12s',
              '&:hover': { bgcolor: alpha('#4F46E5', 0.02), borderLeftColor: alpha('#4F46E5', 0.3) },
            }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>{key.name}</Typography>
                <RevealButton fullKey={key.fullKey} maskedKey={key.maskedKey} />
              </Box>

              <Stack direction="row" spacing={0.5} flexShrink={0}>
                {key.scopes.map((s) => {
                  const meta = SCOPE_META[s] || { color: '#4F46E5', label: s };
                  return (
                    <Box key={s} sx={{ px: 1, py: 0.3, borderRadius: 0.5, bgcolor: alpha(meta.color, 0.1), color: meta.color, fontSize: '0.62rem', fontWeight: 700 }}>
                      {meta.label}
                    </Box>
                  );
                })}
              </Stack>

              <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 120 }}>
                <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                  <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">{key.lastUsed}</Typography>
                </Stack>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>Created {key.created}</Typography>
              </Box>

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
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>Validator Keys</Typography>
            <Chip label={validatorKeys.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', border: 'none' }} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, maxWidth: 480 }}>
              Cryptographic signing keys for consensus participation. Click eye to reveal or copy directly.
            </Typography>
          </Stack>
        </Box>

        <Box>
          {validatorKeys.map((vk, idx) => (
            <Box key={vk.id} sx={{
              px: 3, py: 2,
              borderBottom: idx < validatorKeys.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 2,
              borderLeft: '3px solid transparent',
              transition: 'all 0.12s',
              '&:hover': { bgcolor: alpha('#8b5cf6', 0.02), borderLeftColor: alpha('#8b5cf6', 0.3) },
            }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LockIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <RevealButton fullKey={vk.fullAddress} maskedKey={vk.address} />
                <Typography variant="caption" color="text.secondary">{vk.network}</Typography>
              </Box>

              <Box sx={{ px: 1.25, py: 0.4, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                {vk.type}
              </Box>

              <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>Added {vk.added}</Typography>

              <Button size="small" variant="outlined" sx={{ borderRadius: 1, fontSize: '0.7rem', borderColor: alpha('#8b5cf6', 0.3), color: '#8b5cf6', flexShrink: 0 }}
                onClick={() => { navigator.clipboard.writeText(vk.fullAddress); }}>
                Export
              </Button>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Generate Key Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setGeneratedKey(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Generate New API Key</DialogTitle>
        <DialogContent>
          {!generatedKey ? (
            <Stack spacing={2.5} pt={1}>
              <TextField
                label="Key Name" placeholder="e.g. Production Backend"
                value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} fullWidth size="small"
              />
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem' }}>
                  Scopes
                </Typography>
                <FormGroup row>
                  {ALL_SCOPES.map((s) => {
                    const meta = SCOPE_META[s];
                    return (
                      <FormControlLabel
                        key={s}
                        control={
                          <Checkbox
                            size="small"
                            checked={newKeyScopes.includes(s)}
                            onChange={(e) => setNewKeyScopes((prev) => e.target.checked ? [...prev, s] : prev.filter((x) => x !== s))}
                            sx={{ color: meta.color, '&.Mui-checked': { color: meta.color } }}
                          />
                        }
                        label={<Typography variant="caption" fontWeight={600}>{meta.label}</Typography>}
                      />
                    );
                  })}
                </FormGroup>
              </Box>
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                The full key is shown only once after generation. Copy and store it securely.
              </Alert>
            </Stack>
          ) : (
            <Stack spacing={2} pt={1}>
              <Alert severity="warning">Copy this key now — it will not be shown again.</Alert>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#10b981', 0.05), borderColor: alpha('#10b981', 0.3) }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem', flex: 1 }}>
                    {generatedKey.full}
                  </Typography>
                  <CopyButton value={generatedKey.full} />
                </Stack>
              </Paper>
              <Typography variant="caption" color="text.secondary">
                Masked version that will appear in your key list: <code>{generatedKey.masked}</code>
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDialogOpen(false); setGeneratedKey(null); }} sx={{ borderRadius: 1 }}>
            {generatedKey ? 'Done' : 'Cancel'}
          </Button>
          {!generatedKey && (
            <Button variant="contained" onClick={handleGenerate} disabled={!newKeyName.trim()} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Generate
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!revokeId} onClose={() => setRevokeId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Revoke API Key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action is irreversible. Any service using this key will lose access immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeId(null)} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => revokeId && handleRevoke(revokeId)} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
