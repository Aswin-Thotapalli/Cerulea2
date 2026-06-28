'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, IconButton, Tooltip,
  MenuItem, Select, FormControl, InputLabel, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SaveIcon from '@mui/icons-material/Save';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RefreshIcon from '@mui/icons-material/Refresh';

type Snapshot = {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description: string | null;
  stateData: string | null;
  status: 'ready' | 'creating' | 'failed';
  createdAt: string;
  updatedAt: string;
};

type Project = { id: string; name: string; slug: string };

const STATUS_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  ready:    { color: '#10b981', label: 'Ready',    icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  creating: { color: '#f59e0b', label: 'Creating', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  failed:   { color: '#ef4444', label: 'Failed',   icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
};

export default function StatePage() {
  const theme = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  const [snapshotInterval, setSnapshotInterval] = useState('24h');
  const [retention, setRetention] = useState('7');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastSev, setToastSev] = useState<'success' | 'info' | 'error'>('success');

  const toast = (msg: string, sev: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg(msg); setToastSev(sev);
  };

  // Load projects
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((j) => {
        const list: Project[] = j.projects || [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Load snapshots whenever project changes
  const loadSnapshots = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/snapshots?projectId=${encodeURIComponent(projectId)}`);
      const j = await r.json();
      setSnapshots(j.snapshots || []);
    } catch {
      toast('Failed to load snapshots', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) loadSnapshots(selectedProjectId);
  }, [selectedProjectId, loadSnapshots]);

  const handleCreate = async () => {
    if (!newName.trim() || !selectedProjectId) return;
    setCreating(true);
    try {
      const r = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          name: newName.trim(),
          description: newDesc.trim() || null,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        setSnapshots((prev) => [j.snapshot, ...prev]);
        toast('Snapshot created successfully');
        setCreateDialogOpen(false);
        setNewName(''); setNewDesc('');
      } else {
        toast(j.error || 'Failed to create snapshot', 'error');
      }
    } catch {
      toast('Network error', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    setRestoredId(restoreId);
    setRestoreId(null);
    toast(`Snapshot restored — project state loaded`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const r = await fetch(`/api/snapshots/${encodeURIComponent(deleteId)}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.ok) {
        setSnapshots((prev) => prev.filter((s) => s.id !== deleteId));
        if (restoredId === deleteId) setRestoredId(null);
        toast('Snapshot deleted');
      } else {
        toast(j.error || 'Delete failed', 'error');
      }
    } catch {
      toast('Network error', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const readyCount = snapshots.filter((s) => s.status === 'ready').length;

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
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
            Save and restore named snapshots of your project configuration.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Reload">
            <IconButton size="small" onClick={() => loadSnapshots(selectedProjectId)} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}
            disabled={!selectedProjectId} sx={{ fontWeight: 700 }}>
            Create Snapshot
          </Button>
        </Stack>
      </Stack>

      {/* Project selector */}
      {projects.length > 1 && (
        <FormControl size="small" sx={{ mb: 3, minWidth: 260 }}>
          <InputLabel>Project</InputLabel>
          <Select value={selectedProjectId} label="Project" onChange={(e) => setSelectedProjectId(e.target.value)}>
            {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
      )}

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Ready Snapshots', value: readyCount, color: '#10b981' },
          { label: 'Total Snapshots', value: snapshots.length, color: '#4F46E5' },
          { label: 'Project', value: selectedProject?.name || '—', color: '#8b5cf6' },
        ].map((s) => (
          <Paper key={s.label} variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18) }}>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>{s.label.toUpperCase()}</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</Typography>
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
          <Chip label="Coming soon" size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b', border: 'none' }} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Snapshot Interval</InputLabel>
            <Select value={snapshotInterval} label="Snapshot Interval" onChange={(e) => setSnapshotInterval(e.target.value)}>
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
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => toast('Schedule saved (scheduler not yet active)', 'info')}
            sx={{ borderRadius: 1, fontWeight: 700, borderColor: alpha('#4F46E5', 0.4) }}>
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

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : snapshots.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CameraAltIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No snapshots yet.</Typography>
            <Typography variant="caption" color="text.disabled">Click "Create Snapshot" to save your first one.</Typography>
          </Box>
        ) : (
          <Box>
            {snapshots.map((snap, idx) => {
              const sm = STATUS_META[snap.status] ?? STATUS_META.ready;
              const wasRestored = restoredId === snap.id;
              return (
                <Box key={snap.id} sx={{
                  px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2,
                  borderBottom: idx < snapshots.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                  borderLeft: `3px solid ${alpha(wasRestored ? '#10b981' : sm.color, wasRestored ? 0.8 : 0.4)}`,
                  bgcolor: wasRestored ? alpha('#10b981', 0.04) : undefined,
                  '&:hover': { bgcolor: alpha(sm.color, 0.03) },
                  transition: 'all 0.12s',
                }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: alpha(sm.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: sm.color }}>
                    <CameraAltIcon sx={{ fontSize: 18 }} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{snap.name}</Typography>
                      {wasRestored && <Chip label="Active" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha('#10b981', 0.12), color: '#10b981', border: 'none' }} />}
                    </Stack>
                    {snap.description && (
                      <Typography variant="caption" color="text.secondary" noWrap>{snap.description}</Typography>
                    )}
                  </Box>

                  <Box sx={{ textAlign: 'right', minWidth: 160, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(snap.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>

                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: sm.color, minWidth: 80, flexShrink: 0 }}>
                    {sm.icon}
                    <Typography variant="caption" fontWeight={700} sx={{ color: sm.color }}>{sm.label}</Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Button size="small" variant="outlined" startIcon={<RestoreIcon sx={{ fontSize: 13 }} />}
                      disabled={snap.status !== 'ready'} onClick={() => setRestoreId(snap.id)}
                      sx={{ borderRadius: 1, fontSize: '0.7rem' }}>
                      Restore
                    </Button>
                    <Tooltip title="Delete snapshot">
                      <span>
                        <IconButton size="small" onClick={() => setDeleteId(snap.id)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.08) } }}>
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); setNewName(''); setNewDesc(''); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Snapshot</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} pt={1}>
            {projects.length > 1 && (
              <FormControl fullWidth size="small">
                <InputLabel>Project</InputLabel>
                <Select value={selectedProjectId} label="Project" onChange={(e) => setSelectedProjectId(e.target.value)}>
                  {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <TextField label="Snapshot name" size="small" fullWidth required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Before economics change" />
            <TextField label="Description (optional)" size="small" fullWidth multiline rows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setCreateDialogOpen(false); setNewName(''); setNewDesc(''); }} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim() || creating}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 1, fontWeight: 700 }}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirm */}
      <Dialog open={!!restoreId} onClose={() => setRestoreId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Restore Snapshot?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
            This will mark the selected snapshot as the active state. The project configuration at that point will be loaded.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Restore snapshot: <strong>{snapshots.find((s) => s.id === restoreId)?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRestoreId(null)} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRestore} sx={{ borderRadius: 1, fontWeight: 700 }}>Restore</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Snapshot?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>This will permanently delete the snapshot. This cannot be undone.</Alert>
          <Typography variant="body2" color="text.secondary">
            Delete: <strong>{snapshots.find((s) => s.id === deleteId)?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ borderRadius: 1, fontWeight: 700 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar open={!!toastMsg} autoHideDuration={3500} onClose={() => setToastMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toastSev} onClose={() => setToastMsg(null)} sx={{ borderRadius: 2 }}>{toastMsg}</Alert>
      </Snackbar>
    </Box>
  );
}
