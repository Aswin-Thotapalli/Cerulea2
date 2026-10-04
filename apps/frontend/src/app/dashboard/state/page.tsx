'use client';

// apps/frontend/src/app/dashboard/state/page.tsx
// The State Snapshots screen.
// Every save that changes the content address produces a Blueprint version.
// A snapshot is a checkpoint that names one of those versions, so a person
// returns to it later. Restoring writes that Blueprint as a new version and
// takes a new snapshot of the result, so nothing is lost.
// Without this screen nobody can see what changed and when, or return to it.

import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, IconButton, Tooltip,
  MenuItem, Select, FormControl, InputLabel, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';

import { api } from '@/lib/apiClient';
import { describeCounts, shortHash } from '@/components/dashboard/wording';

type Checkpoint = {
  checkpointId: string;
  projectId: string;
  blueprintId: string;
  blueprintHash: string;
  version: number;
  label: string;
  note: string;
  restoredFromCheckpointId?: string;
  createdAt: string;
};

type BlueprintVersion = {
  blueprintId: string;
  version: number;
  blueprintHash: string;
  note: string;
  createdAt: string;
};

type Project = {
  projectId: string;
  projectName: string;
  workspaceName: string;
  state: string;
  headVersion: number;
  blueprintHash: string;
  counts: Record<string, number>;
  versions: BlueprintVersion[];
  checkpoints: Checkpoint[];
};

type StateView = { projects: Project[] };

type RestoreOutcome = {
  checkpoint: Checkpoint;
  blueprint: { version: number };
  alreadyAtHead: boolean;
};

function whenText(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StatePage() {
  const theme = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastSev, setToastSev] = useState<'success' | 'info' | 'error'>('success');

  const toast = (msg: string, sev: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg(msg); setToastSev(sev);
  };

  // Reads every project with its versions and its checkpoints.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api<StateView>('/api/dashboard/state');
      const list = data.projects ?? [];
      setProjects(list);
      setSelectedProjectId((held) =>
        held && list.some((p) => p.projectId === held) ? held : (list[0]?.projectId ?? ''),
      );
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Cerulea could not read the snapshots.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedProject = projects.find((p) => p.projectId === selectedProjectId);
  const snapshots = selectedProject?.checkpoints ?? [];
  const versions = selectedProject?.versions ?? [];

  const handleCreate = async () => {
    if (newName.trim().length < 2 || !selectedProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api('/api/dashboard/state', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProjectId,
          label: newName.trim(),
          note: newDesc.trim().length > 0 ? newDesc.trim() : undefined,
        }),
      });
      toast('Snapshot created');
      setCreateDialogOpen(false);
      setNewName(''); setNewDesc('');
      void load();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Cerulea could not create the snapshot.');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreId || !selectedProjectId) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      const outcome = await api<RestoreOutcome>(
        `/api/dashboard/state/${encodeURIComponent(restoreId)}/restore`,
        { method: 'POST', body: JSON.stringify({ projectId: selectedProjectId }) },
      );
      setRestoredId(restoreId);
      setRestoreId(null);
      toast(
        outcome.alreadyAtHead
          ? 'The Blueprint already matches this snapshot. Cerulea recorded a new snapshot of it.'
          : `Snapshot restored. The Blueprint is now version ${outcome.blueprint.version}.`,
      );
      void load();
    } catch (e: unknown) {
      setRestoreError(e instanceof Error ? e.message : 'Cerulea could not restore the snapshot.');
    } finally {
      setRestoring(false);
    }
  };

  const restoreTarget = snapshots.find((s) => s.checkpointId === restoreId);

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
            Save and restore named snapshots of the Blueprint of each project.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Reload">
            <IconButton size="small" aria-label="Reload" onClick={() => void load()} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}
            disabled={!selectedProjectId} sx={{ fontWeight: 700 }}>
            Create Snapshot
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} action={<Button size="small" onClick={() => void load()}>Retry</Button>}>
          {loadError}
        </Alert>
      )}

      {/* Project selector */}
      {projects.length > 1 && (
        <FormControl size="small" sx={{ mb: 3, minWidth: 260 }}>
          <InputLabel id="state-project-label">Project</InputLabel>
          <Select labelId="state-project-label" value={selectedProjectId} label="Project" onChange={(e) => setSelectedProjectId(String(e.target.value))}>
            {projects.map((p) => <MenuItem key={p.projectId} value={p.projectId}>{p.projectName}</MenuItem>)}
          </Select>
        </FormControl>
      )}

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Ready Snapshots', value: loading ? '…' : snapshots.length, color: '#10b981' },
          { label: 'Blueprint Versions', value: loading ? '…' : versions.length, color: '#4F46E5' },
          { label: 'Project', value: selectedProject?.projectName || (loading ? '…' : 'None yet'), color: '#8b5cf6' },
        ].map((s) => (
          <Paper key={s.label} variant="outlined" data-testid={`stat-${s.label}`} sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18) }}>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>{s.label.toUpperCase()}</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Snapshot list */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#06b6d4', 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <StorageIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: '#06b6d4' }}>SNAPSHOTS</Typography>
            <Chip label={snapshots.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: 'none' }} />
            {selectedProject && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                The Blueprint at version {selectedProject.headVersion} holds {describeCounts(selectedProject.counts)}.
              </Typography>
            )}
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }} role="status" aria-label="Reading the snapshots">
            <CircularProgress size={28} />
          </Box>
        ) : !selectedProject ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CameraAltIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No project yet.</Typography>
            <Typography variant="caption" color="text.disabled">Start a project in Studio. Its snapshots and versions appear here.</Typography>
          </Box>
        ) : snapshots.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CameraAltIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No snapshots yet.</Typography>
            <Typography variant="caption" color="text.disabled">Choose &quot;Create Snapshot&quot; to save the first one.</Typography>
          </Box>
        ) : (
          <Box>
            {snapshots.map((snap, idx) => {
              const wasRestored = restoredId === snap.checkpointId;
              const color = '#10b981';
              return (
                <Box key={snap.checkpointId} data-testid={`snapshot-${snap.checkpointId}`} sx={{
                  px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2,
                  borderBottom: idx < snapshots.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                  borderLeft: `3px solid ${alpha(color, wasRestored ? 0.8 : 0.4)}`,
                  bgcolor: wasRestored ? alpha(color, 0.04) : undefined,
                  '&:hover': { bgcolor: alpha(color, 0.03) },
                  transition: 'all 0.12s',
                }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
                    <CameraAltIcon sx={{ fontSize: 18 }} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{snap.label}</Typography>
                      {wasRestored && <Chip label="Restored" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha(color, 0.12), color, border: 'none' }} />}
                      {snap.restoredFromCheckpointId && <Chip label="From a restore" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
                    </Stack>
                    {snap.note && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{snap.note}</Typography>
                    )}
                    <Tooltip title={snap.blueprintHash} arrow>
                      <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>
                        Version {snap.version} · {shortHash(snap.blueprintHash)}
                      </Typography>
                    </Tooltip>
                  </Box>

                  <Box sx={{ textAlign: 'right', minWidth: 160, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">{whenText(snap.createdAt)}</Typography>
                  </Box>

                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color, minWidth: 80, flexShrink: 0 }}>
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" fontWeight={700} sx={{ color }}>Ready</Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Button size="small" variant="outlined" startIcon={<RestoreIcon sx={{ fontSize: 13 }} />}
                      onClick={() => setRestoreId(snap.checkpointId)}
                      aria-label={`Restore ${snap.label}`}
                      sx={{ borderRadius: 1, fontSize: '0.7rem' }}>
                      Restore
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Blueprint versions */}
      {!loading && selectedProject && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <HistoryIcon sx={{ fontSize: 16, color: '#4F46E5' }} />
              <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: '#4F46E5' }}>BLUEPRINT VERSIONS</Typography>
              <Chip label={versions.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', border: 'none' }} />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                Every save that changed the content address. A snapshot names one of these versions.
              </Typography>
            </Stack>
          </Box>
          {versions.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No version saved yet.</Typography>
            </Box>
          ) : versions.map((version, idx) => {
            const isHead = version.version === selectedProject.headVersion;
            return (
              <Box key={version.blueprintId} data-testid={`version-${version.version}`} sx={{
                px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
                borderBottom: idx < versions.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                '&:hover': { bgcolor: alpha('#4F46E5', 0.02) },
              }}>
                <Chip label={`v${version.version}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5', border: 'none', minWidth: 44 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" noWrap>{version.note || 'No note on this save'}</Typography>
                    {isHead && <Chip label="Current" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha('#10b981', 0.12), color: '#10b981', border: 'none' }} />}
                  </Stack>
                  <Tooltip title={version.blueprintHash} arrow>
                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>
                      {shortHash(version.blueprintHash)}
                    </Typography>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 160, textAlign: 'right' }}>{whenText(version.createdAt)}</Typography>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => { if (!creating) { setCreateDialogOpen(false); setNewName(''); setNewDesc(''); setCreateError(null); } }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Snapshot</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} pt={1}>
            {projects.length > 1 && (
              <FormControl fullWidth size="small">
                <InputLabel id="create-project-label">Project</InputLabel>
                <Select labelId="create-project-label" value={selectedProjectId} label="Project" onChange={(e) => setSelectedProjectId(String(e.target.value))}>
                  {projects.map((p) => <MenuItem key={p.projectId} value={p.projectId}>{p.projectName}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <TextField label="Snapshot name" size="small" fullWidth required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Before the economics change" helperText="Two characters or more. The name tells a reader what state this snapshot holds." />
            <TextField label="Description (optional)" size="small" fullWidth multiline rows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} inputProps={{ maxLength: 400 }} />
            {selectedProject && (
              <Typography variant="caption" color="text.secondary">
                The snapshot names Blueprint version {selectedProject.headVersion} of {selectedProject.projectName}.
              </Typography>
            )}
            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setCreateDialogOpen(false); setNewName(''); setNewDesc(''); setCreateError(null); }} disabled={creating} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={newName.trim().length < 2 || creating}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 1, fontWeight: 700 }}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirm */}
      <Dialog open={!!restoreId} onClose={() => !restoring && setRestoreId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Restore Snapshot?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
            Cerulea writes the Blueprint of this snapshot as a new version and takes a new snapshot of the result. The current work stays in the version history.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Restore snapshot: <strong>{restoreTarget?.label}</strong>{restoreTarget ? ` (version ${restoreTarget.version})` : ''}?
          </Typography>
          {restoreError && <Alert severity="error" sx={{ mt: 2 }}>{restoreError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRestoreId(null)} disabled={restoring} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => void handleRestore()} disabled={restoring}
            startIcon={restoring ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 1, fontWeight: 700 }}>
            {restoring ? 'Restoring…' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar open={!!toastMsg} autoHideDuration={3500} onClose={() => setToastMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toastSev} onClose={() => setToastMsg(null)} sx={{ borderRadius: 2 }}>{toastMsg}</Alert>
      </Snackbar>
    </Box>
  );
}
