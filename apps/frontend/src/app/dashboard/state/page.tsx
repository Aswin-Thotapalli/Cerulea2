'use client';

import { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import SaveIcon from '@mui/icons-material/Save';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

type Snapshot = {
  id: string;
  network: string;
  blockHeight: number;
  timestamp: string;
  size: string;
  status: 'ready' | 'creating' | 'failed';
};

const STUB_SNAPSHOTS: Snapshot[] = [
  { id: 'snap-0041', network: 'CeruleaChain Mainnet', blockHeight: 4_182_034, timestamp: '2026-04-17T06:00:00Z', size: '2.4 GB', status: 'ready' },
  { id: 'snap-0040', network: 'CeruleaChain Mainnet', blockHeight: 4_170_000, timestamp: '2026-04-16T06:00:00Z', size: '2.3 GB', status: 'ready' },
  { id: 'snap-0039', network: 'CeruleaChain Mainnet', blockHeight: 4_158_100, timestamp: '2026-04-15T06:00:00Z', size: '2.3 GB', status: 'ready' },
  { id: 'snap-0012', network: 'VoteApp Devnet', blockHeight: 98_100, timestamp: '2026-04-17T06:00:00Z', size: '180 MB', status: 'ready' },
  { id: 'snap-0011', network: 'VoteApp Devnet', blockHeight: 95_200, timestamp: '2026-04-16T06:00:00Z', size: '174 MB', status: 'ready' },
  { id: 'snap-live', network: 'CeruleaChain Mainnet', blockHeight: 4_182_401, timestamp: 'N/A', size: 'N/A', status: 'creating' },
];

const STATUS_META = {
  ready: { color: '#10b981', label: 'Ready', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  creating: { color: '#f59e0b', label: 'Creating', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  failed: { color: '#ef4444', label: 'Failed', icon: null },
};

const NETWORKS = ['CeruleaChain Mainnet', 'VoteApp Devnet'];

export default function StatePage() {
  const theme = useTheme();
  const [snapshots, setSnapshots] = useState<Snapshot[]>(STUB_SNAPSHOTS);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [interval, setInterval] = useState('24h');
  const [retention, setRetention] = useState('7');
  const [selectedNetwork, setSelectedNetwork] = useState('CeruleaChain Mainnet');

  const handleCreate = () => {
    const latest = snapshots.filter((s) => s.network === selectedNetwork && s.status === 'ready');
    const latestHeight = latest.length > 0
      ? Math.max(...latest.map((s) => s.blockHeight)) + Math.floor(Math.random() * 1000 + 100)
      : 1000;
    setSnapshots((prev) => [{
      id: `snap-${Date.now()}`, network: selectedNetwork,
      blockHeight: latestHeight, timestamp: new Date().toISOString(), size: 'N/A', status: 'creating',
    }, ...prev]);
    setCreateDialogOpen(false);
  };

  const readyCount = snapshots.filter((s) => s.status === 'ready').length;
  const totalSize = '5.2 GB';

  return (
    <Box sx={{ p: 4, maxWidth: 1100 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>
            DISASTER RECOVERY
          </Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>
            State Snapshots
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Create, manage, and restore blockchain state snapshots for disaster recovery.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}
          sx={{ borderRadius: 999, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)' }}>
          Create Snapshot
        </Button>
      </Stack>

      {/* Stat strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Ready Snapshots', value: readyCount, color: '#10b981' },
          { label: 'Total Stored', value: totalSize, color: '#4F46E5' },
          { label: 'Networks', value: NETWORKS.length, color: '#8b5cf6' },
        ].map((s) => (
          <Paper key={s.label} variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18) }}>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>{s.label.toUpperCase()}</Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5 }}>{s.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Auto-snapshot schedule */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: alpha('#4F46E5', 0.03), borderColor: alpha('#4F46E5', 0.15) }}>
        <Stack direction="row" alignItems="center" gap={1.5} mb={2.5}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScheduleIcon sx={{ fontSize: 17, color: 'primary.main' }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={800}>Auto-Snapshot Schedule</Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 'auto' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981' }} />
            <Typography variant="caption" color="text.secondary">
              Next snapshot in <strong>4h 12m</strong>
            </Typography>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Snapshot Interval</InputLabel>
            <Select value={interval} label="Snapshot Interval" onChange={(e) => setInterval(e.target.value)}>
              <MenuItem value="6h">Every 6 hours</MenuItem>
              <MenuItem value="12h">Every 12 hours</MenuItem>
              <MenuItem value="24h">Every 24 hours</MenuItem>
              <MenuItem value="7d">Weekly</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Retention Count</InputLabel>
            <Select value={retention} label="Retention Count" onChange={(e) => setRetention(e.target.value)}>
              <MenuItem value="3">Keep last 3</MenuItem>
              <MenuItem value="7">Keep last 7</MenuItem>
              <MenuItem value="14">Keep last 14</MenuItem>
              <MenuItem value="30">Keep last 30</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<SaveIcon />} sx={{ borderRadius: 999, fontWeight: 700, borderColor: alpha('#4F46E5', 0.4) }}>
            Save Schedule
          </Button>
        </Stack>
      </Paper>

      {/* Snapshot list */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#06b6d4', 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <StorageIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: '#06b6d4' }}>SNAPSHOTS</Typography>
            <Chip label={readyCount} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: 'none' }} />
          </Stack>
        </Box>

        <Box>
          {snapshots.map((snap, idx) => {
            const sm = STATUS_META[snap.status];
            return (
              <Box key={snap.id} sx={{
                px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2,
                borderBottom: idx < snapshots.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                borderLeft: `3px solid ${alpha(sm.color, 0.4)}`,
                '&:hover': { bgcolor: alpha(sm.color, 0.03) },
                transition: 'all 0.12s',
              }}>
                {/* Icon */}
                <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: alpha(sm.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: sm.color }}>
                  <CameraAltIcon sx={{ fontSize: 18 }} />
                </Box>

                {/* ID + network */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{snap.id}</Typography>
                  <Typography variant="caption" color="text.secondary">{snap.network}</Typography>
                </Box>

                {/* Block height */}
                <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {snap.blockHeight > 0 ? `#${snap.blockHeight.toLocaleString()}` : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">block height</Typography>
                </Box>

                {/* Timestamp */}
                <Box sx={{ textAlign: 'right', minWidth: 140 }}>
                  <Typography variant="caption" color="text.secondary">
                    {snap.timestamp !== 'N/A'
                      ? new Date(snap.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </Typography>
                </Box>

                {/* Size */}
                <Box sx={{ textAlign: 'right', minWidth: 70 }}>
                  <Typography variant="body2" fontWeight={600}>{snap.size}</Typography>
                </Box>

                {/* Status */}
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: sm.color, minWidth: 90 }}>
                  {sm.icon}
                  <Typography variant="caption" fontWeight={700} sx={{ color: sm.color }}>{sm.label}</Typography>
                </Stack>

                {/* Action */}
                <Button size="small" variant="outlined" startIcon={<RestoreIcon sx={{ fontSize: 13 }} />}
                  disabled={snap.status !== 'ready'} onClick={() => setRestoreId(snap.id)}
                  sx={{ borderRadius: 999, fontSize: '0.7rem', flexShrink: 0 }}>
                  Restore
                </Button>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Create Snapshot Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Snapshot</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} pt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Network</InputLabel>
              <Select value={selectedNetwork} label="Network" onChange={(e) => setSelectedNetwork(e.target.value)}>
                {NETWORKS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              A snapshot will be taken at the current block height. This may take a few minutes to complete.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ borderRadius: 999 }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ borderRadius: 999, fontWeight: 700 }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirm Dialog */}
      <Dialog open={!!restoreId} onClose={() => setRestoreId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Restore Snapshot?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
            Restoring will replace the current chain state. This action cannot be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to restore snapshot <strong>{restoreId}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRestoreId(null)} sx={{ borderRadius: 999 }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => setRestoreId(null)} sx={{ borderRadius: 999, fontWeight: 700 }}>Restore</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
