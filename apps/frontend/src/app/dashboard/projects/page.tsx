'use client';

import { useEffect, useState } from 'react';
import { studioProjectUrl } from '@/config/divisions';
import {
  Box, Typography, Paper, Button, Stack,
  TextField, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Alert, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material';
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
  division?: string;
  createdAt: string;
  updatedAt?: string;
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: 'Active' },
  deploying: { color: '#f59e0b', label: 'Deploying' },
  draft: { color: '#6b7db3', label: 'Draft' },
  failed: { color: '#ef4444', label: 'Failed' },
};

function studioBase() {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  return isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
}
// Opens a saved project inside its division (studio.cerulea.io/<division>?project=<id>).
function getStudioUrl(p: { id: string; division?: string }) {
  return studioProjectUrl(studioBase(), p.id, p.division);
}
function getNewProjectUrl() {
  return studioBase();
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
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { window.location.href = getNewProjectUrl(); }}
          sx={{ borderRadius: 1, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)' }}>
          New Project
        </Button>
      </Stack>

      {/* Filter bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 12, textAlign: 'center', borderStyle: 'dashed' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: alpha('#4F46E5', 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <FolderOpenIcon sx={{ fontSize: 32, color: '#4F46E5', opacity: 0.5 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
          </Typography>
          {projects.length === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 1.5, borderRadius: 1 }} onClick={() => { window.location.href = getNewProjectUrl(); }}>
              Create First Project
            </Button>
          )}
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: alpha('#4F46E5', 0.12) }}>
          {/* Table header */}
          <Box sx={{
            px: 3, py: 1.25,
            display: 'grid', gridTemplateColumns: '1fr 130px 110px 150px 80px 40px',
            gap: 2, alignItems: 'center',
            bgcolor: alpha('#4F46E5', 0.04),
            borderBottom: `1px solid ${alpha('#4F46E5', 0.1)}`,
          }}>
            {['Project', 'Type', 'Status', 'Updated', '', ''].map((h, i) => (
              <Typography key={i} variant="caption" fontWeight={800} sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.disabled' }}>{h}</Typography>
            ))}
          </Box>

          {filtered.map((p, idx) => {
            const isChain = p.projectType === 'blockchain';
            const typeColor = isChain ? '#8b5cf6' : '#4F46E5';
            const sm = STATUS_META[p.status] || { color: '#6b7db3', label: p.status };
            return (
              <Box key={p.id} sx={{
                px: 3, py: 1.75,
                display: 'grid', gridTemplateColumns: '1fr 130px 110px 150px 80px 40px',
                gap: 2, alignItems: 'center',
                borderBottom: idx < filtered.length - 1 ? `1px solid ${alpha(typeColor, 0.07)}` : 'none',
                borderLeft: `3px solid ${typeColor}`,
                transition: 'all 0.12s',
                '&:hover': { bgcolor: alpha(typeColor, 0.03) },
              }}>
                {/* Name + slug */}
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(typeColor, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeColor, flexShrink: 0 }}>
                    {isChain ? <LanIcon sx={{ fontSize: 18 }} /> : <AutoAwesomeMosaicIcon sx={{ fontSize: 18 }} />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>{p.name}</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.62rem' }}>/{p.slug}</Typography>
                  </Box>
                </Stack>

                {/* Type */}
                <Box sx={{ px: 1.25, py: 0.35, borderRadius: 1, bgcolor: alpha(typeColor, 0.1), color: typeColor, fontSize: '0.65rem', fontWeight: 700, display: 'inline-block', width: 'fit-content' }}>
                  {isChain ? 'Blockchain' : 'dApp'}
                </Box>

                {/* Status */}
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sm.color, flexShrink: 0 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ color: sm.color }}>{sm.label}</Typography>
                </Stack>

                {/* Updated */}
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                  {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Typography>

                {/* Open button */}
                <Button size="small" variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                  onClick={() => { window.open(getStudioUrl(p), '_blank', 'noopener,noreferrer'); }}
                  sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.7rem', borderColor: alpha(typeColor, 0.3), color: typeColor, '&:hover': { borderColor: typeColor, bgcolor: alpha(typeColor, 0.05) }, whiteSpace: 'nowrap' }}>
                  Open
                </Button>

                {/* Delete */}
                <Tooltip title="Delete project">
                  <IconButton size="small" onClick={() => setDeleteTarget(p)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Paper>
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
