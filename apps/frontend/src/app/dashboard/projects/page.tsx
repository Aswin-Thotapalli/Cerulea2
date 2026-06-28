'use client';

import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, Chip,
  TextField, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Alert, Avatar, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic';
import LanIcon from '@mui/icons-material/Lan';

type Project = {
  id: string;
  name: string;
  slug: string;
  status: string;
  projectType: string;
  createdAt: string;
  updatedAt?: string;
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: 'Active' },
  deploying: { color: '#f59e0b', label: 'Deploying' },
  draft: { color: '#6b7db3', label: 'Draft' },
  failed: { color: '#ef4444', label: 'Failed' },
};

function getStudioUrl(projectId: string) {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  const base = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
  return `${base}/?project=${projectId}`;
}

export default function ProjectsPage() {
  const theme = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) { setError('Failed to load projects'); return; }
      const j = await res.json();
      setProjects(j.projects || []);
    } catch { setError('Failed to connect to server'); } finally { setLoading(false); }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id)); setDeleteTarget(null); }
      else setError('Failed to delete project');
    } catch { setError('Failed to delete project'); } finally { setDeleting(false); }
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.projectType === typeFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <Box sx={{ p: 4, maxWidth: 1200 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>WORKSPACE</Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>Projects</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            All your blockchain networks and dApps — manage, open, and delete from here.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { window.location.href = getStudioUrl('new'); }}
          sx={{ borderRadius: 999, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)' }}>
          New Project
        </Button>
      </Stack>

      {/* Filter bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search projects" value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 220 }} />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="blockchain">Blockchain</MenuItem>
            <MenuItem value="dapp">dApp</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="deploying">Deploying</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontWeight: 600 }}>
          {filtered.length} of {projects.length}
        </Typography>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, py: 12, textAlign: 'center', borderStyle: 'dashed' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: alpha('#4F46E5', 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <FolderOpenIcon sx={{ fontSize: 36, color: '#4F46E5', opacity: 0.5 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
          </Typography>
          {projects.length === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 1.5, borderRadius: 999 }} onClick={() => { window.location.href = getStudioUrl('new'); }}>
              Create First Project
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((p) => {
            const isChain = p.projectType === 'blockchain';
            const typeColor = isChain ? '#8b5cf6' : '#4F46E5';
            const sm = STATUS_META[p.status] || { color: '#6b7db3', label: p.status };
            return (
              <Grid xs={12} sm={6} md={4} key={p.id}>
                <Paper variant="outlined" sx={{
                  p: 2.5, borderRadius: 3, height: '100%',
                  display: 'flex', flexDirection: 'column', gap: 1.5,
                  borderColor: alpha(typeColor, 0.15),
                  bgcolor: alpha(typeColor, 0.02),
                  transition: 'all 0.18s',
                  '&:hover': {
                    borderColor: alpha(typeColor, 0.4),
                    boxShadow: `0 6px 24px ${alpha(typeColor, 0.12)}`,
                    transform: 'translateY(-2px)',
                  },
                }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(typeColor, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeColor }}>
                        {isChain ? <LanIcon sx={{ fontSize: 22 }} /> : <AutoAwesomeMosaicIcon sx={{ fontSize: 22 }} />}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={800} noWrap>{p.name}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>/{p.slug}</Typography>
                      </Box>
                    </Stack>
                    <Tooltip title="Delete project">
                      <IconButton size="small" onClick={() => setDeleteTarget(p)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Stack direction="row" spacing={0.75}>
                    <Box sx={{ px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: alpha(typeColor, 0.1), color: typeColor, fontSize: '0.65rem', fontWeight: 700 }}>
                      {isChain ? 'Blockchain' : 'dApp'}
                    </Box>
                    <Box sx={{ px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: alpha(sm.color, 0.1), color: sm.color, fontSize: '0.65rem', fontWeight: 700 }}>
                      {sm.label}
                    </Box>
                  </Stack>

                  <Typography variant="caption" color="text.disabled" sx={{ mt: 'auto' }}>
                    Updated {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Typography>

                  <Button fullWidth variant="outlined" size="small" endIcon={<OpenInNewIcon fontSize="small" />}
                    onClick={() => { window.location.href = getStudioUrl(p.id); }}
                    sx={{ borderRadius: 999, fontWeight: 700, borderColor: alpha(typeColor, 0.3), color: typeColor, '&:hover': { borderColor: typeColor, bgcolor: alpha(typeColor, 0.05) } }}>
                    Open in Studio
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Delete dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} /> : <DeleteOutlineIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
