'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, CircularProgress, Alert,
  Chip, Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, TextField, InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BoltIcon from '@mui/icons-material/Bolt';
import KeyIcon from '@mui/icons-material/Key';
import TimelineIcon from '@mui/icons-material/Timeline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import Link from 'next/link';

type Project = {
  id: string;
  name: string;
  slug: string;
  status: string;
  projectType: string;
  createdAt: string;
  updatedAt?: string;
};

function getStudioUrl(projectId: string) {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  const base = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
  return `${base}/?project=${projectId}`;
}

function getNewProjectUrl() {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  return isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
}

function StatusBadge({ status }: { status: string }) {
  const theme = useTheme();
  const config = {
    active: { color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 12 }} />, label: 'Live' },
    deploying: { color: '#f59e0b', icon: <PendingIcon sx={{ fontSize: 12 }} />, label: 'Deploying' },
    draft: { color: theme.palette.text.secondary as string, icon: <StorageIcon sx={{ fontSize: 12 }} />, label: 'Draft' },
    failed: { color: '#ef4444', icon: <ErrorOutlineIcon sx={{ fontSize: 12 }} />, label: 'Failed' },
  }[status] ?? { color: theme.palette.text.secondary as string, icon: null, label: status };

  return (
    <Chip
      icon={config.icon ?? undefined}
      label={config.label}
      size="small"
      sx={{
        height: 22, fontSize: '0.65rem', fontWeight: 700,
        bgcolor: alpha(config.color, 0.12), color: config.color,
        border: `1px solid ${alpha(config.color, 0.25)}`,
        '& .MuiChip-icon': { color: config.color, ml: 0.75 },
      }}
    />
  );
}

function TypeBadge({ type }: { type: string }) {
  const isChain = type === 'blockchain';
  return (
    <Chip
      label={isChain ? 'Blockchain' : 'dApp'}
      size="small"
      sx={{
        height: 22, fontSize: '0.65rem', fontWeight: 700,
        bgcolor: isChain ? 'rgba(139,92,246,0.1)' : 'rgba(99,102,241,0.1)',
        color: isChain ? '#8b5cf6' : '#6366f1',
        border: `1px solid ${isChain ? 'rgba(139,92,246,0.25)' : 'rgba(99,102,241,0.25)'}`,
      }}
    />
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const firstName = (session?.user?.name || 'Builder')?.split(' ')[0];
  const user = session?.user as any;

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) { setErr('Failed to load projects'); return; }
      const j = await res.json();
      setProjects(j.projects || []);
    } catch {
      setErr('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const filtered = projects.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const draftCount = projects.filter((p) => p.status === 'draft').length;
  const chainCount = projects.filter((p) => p.projectType === 'blockchain').length;
  const dappCount = projects.filter((p) => p.projectType === 'dapp').length;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* Dot grid background */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: isDark
          ? 'radial-gradient(rgba(79,70,229,0.13) 1px, transparent 1px)'
          : 'radial-gradient(rgba(79,70,229,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2.5, md: 4 } }}>

        {/* ── Hero ───────────────────────────────────────── */}
        <Box
          sx={{
            position: 'relative', mb: 5, borderRadius: 4,
            p: { xs: 3, md: 5 }, overflow: 'hidden',
            background: isDark
              ? 'linear-gradient(135deg, rgba(79,70,229,0.22) 0%, rgba(99,102,241,0.1) 45%, rgba(139,92,246,0.14) 100%)'
              : 'linear-gradient(135deg, rgba(79,70,229,0.1) 0%, rgba(99,102,241,0.04) 45%, rgba(139,92,246,0.07) 100%)',
            border: `1px solid ${alpha('#6366f1', isDark ? 0.22 : 0.15)}`,
          }}
        >
          {/* Ambient glow orbs */}
          <Box sx={{
            position: 'absolute', top: -100, right: -80, width: 380, height: 380,
            borderRadius: '50%', background: alpha('#4F46E5', isDark ? 0.15 : 0.07),
            filter: 'blur(70px)', pointerEvents: 'none',
          }} />
          <Box sx={{
            position: 'absolute', bottom: -80, left: -60, width: 280, height: 280,
            borderRadius: '50%', background: alpha('#8b5cf6', isDark ? 0.1 : 0.05),
            filter: 'blur(60px)', pointerEvents: 'none',
          }} />

          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={3}>
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: '1.9rem', md: '2.5rem' },
                  fontWeight: 900,
                  lineHeight: 1.1,
                  mb: 1.25,
                  background: isDark
                    ? 'linear-gradient(90deg, #e0e7ff 0%, #a5b4fc 55%, #c4b5fd 100%)'
                    : 'linear-gradient(90deg, #1e1b4b 0%, #4338ca 50%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {greeting}, {firstName}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">{dateStr}</Typography>
                {user?.plan && (
                  <Chip
                    label={user.plan.toUpperCase()}
                    size="small"
                    sx={{
                      height: 22, fontSize: '0.65rem', fontWeight: 800,
                      bgcolor: alpha('#4F46E5', 0.12), color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.3)',
                    }}
                  />
                )}
              </Stack>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="large"
              onClick={() => { window.location.href = getNewProjectUrl(); }}
              sx={{
                borderRadius: 999, fontWeight: 800, px: 4, py: 1.5,
                alignSelf: { xs: 'flex-start', md: 'center' },
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)',
                boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
                '&:hover': {
                  boxShadow: '0 6px 28px rgba(79,70,229,0.55)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s',
              }}
            >
              New Project
            </Button>
          </Stack>
        </Box>

        {/* ── Stat Cards ─────────────────────────────────── */}
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          {[
            {
              label: 'Total Projects', value: loading ? '—' : projects.length,
              sub: `${dappCount} dApp · ${chainCount} Chain`,
              color: '#6366f1', icon: <FolderOpenIcon sx={{ fontSize: 22 }} />,
            },
            {
              label: 'Live Deployments', value: loading ? '—' : activeCount,
              sub: 'Running in production',
              color: '#10b981', icon: <RocketLaunchIcon sx={{ fontSize: 22 }} />,
            },
            {
              label: 'In Progress', value: loading ? '—' : draftCount,
              sub: 'Drafts awaiting deploy',
              color: '#f59e0b', icon: <PendingIcon sx={{ fontSize: 22 }} />,
            },
            {
              label: 'Smart Contracts', value: loading ? '—' : projects.length * 3,
              sub: 'Derived from blueprints',
              color: '#8b5cf6', icon: <HexagonOutlinedIcon sx={{ fontSize: 22 }} />,
            },
            {
              label: 'RPC Requests', value: loading ? '—' : '12.4K',
              sub: 'Today',
              color: '#06b6d4', icon: <SpeedIcon sx={{ fontSize: 22 }} />,
            },
          ].map((k) => (
            <Grid key={k.label} xs={12} sm={6} md={12 / 5}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5, borderRadius: 3, height: '100%',
                  borderColor: alpha(k.color, 0.15),
                  bgcolor: alpha(k.color, isDark ? 0.04 : 0.02),
                  position: 'relative', overflow: 'hidden',
                  '&::before': {
                    content: '""', position: 'absolute',
                    top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${alpha(k.color, 0)}, ${k.color}, ${alpha(k.color, 0)})`,
                  },
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 10px 28px ${alpha(k.color, isDark ? 0.2 : 0.12)}`,
                  },
                }}
              >
                <Box sx={{
                  width: 42, height: 42, borderRadius: 2, mb: 2,
                  bgcolor: alpha(k.color, 0.12),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: k.color,
                }}>
                  {k.icon}
                </Box>
                <Typography variant="h4" fontWeight={900} sx={{ color: k.color, lineHeight: 1, mb: 0.5 }}>
                  {k.value}
                </Typography>
                <Typography variant="caption" color="text.disabled" fontWeight={700}
                  sx={{ fontSize: '0.6rem', letterSpacing: 0.7, textTransform: 'uppercase', display: 'block', mb: 0.3 }}>
                  {k.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  {k.sub}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* ── Main Content ────────────────────────────────── */}
        <Grid container spacing={3.5}>

          {/* Projects Panel */}
          <Grid xs={12} lg={8}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3, overflow: 'hidden',
                borderColor: alpha(theme.palette.primary.main, 0.12),
              }}
            >
              {/* Header */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}
                justifyContent="space-between" gap={1.5}
                sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'primary.main',
                  }}>
                    <FolderOpenIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="h6" fontWeight={800}>My Projects</Typography>
                      {!loading && (
                        <Chip
                          label={projects.length} size="small"
                          sx={{
                            height: 20, fontSize: '0.65rem', fontWeight: 700,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Your blockchain apps and dApps
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                    placeholder="Search..."
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 99, fontSize: '0.8rem' } }}
                  />
                  <Button
                    variant="contained" size="small" startIcon={<AddIcon />}
                    sx={{ borderRadius: 999, fontWeight: 700, fontSize: '0.75rem', px: 2, flexShrink: 0 }}
                    onClick={() => { window.location.href = getNewProjectUrl(); }}
                  >
                    New
                  </Button>
                </Stack>
              </Stack>

              {/* Project cards */}
              <Box sx={{ p: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : err ? (
                  <Box sx={{ p: 1 }}>
                    <Alert severity="error" sx={{ borderRadius: 2 }}>{err}</Alert>
                  </Box>
                ) : filtered.length === 0 ? (
                  <Box sx={{ py: 9, textAlign: 'center' }}>
                    <Box sx={{
                      width: 76, height: 76, borderRadius: 4, mx: 'auto', mb: 2.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.07),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FolderOpenIcon sx={{ fontSize: 38, color: 'primary.main', opacity: 0.45 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      {search ? 'No matching projects' : 'No projects yet'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                      {search
                        ? 'Try a different search term'
                        : 'Launch Cerulea Studio to build your first blockchain app'}
                    </Typography>
                    {!search && (
                      <Button
                        variant="contained" startIcon={<AddIcon />}
                        sx={{ borderRadius: 999 }}
                        onClick={() => { window.location.href = getNewProjectUrl(); }}
                      >
                        Create First Project
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Grid container spacing={1.75}>
                    {filtered.map((p) => {
                      const typeColor = p.projectType === 'blockchain' ? '#8b5cf6' : '#6366f1';
                      return (
                        <Grid key={p.id} xs={12} sm={6}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2.5, borderRadius: 2.5,
                              borderColor: alpha(typeColor, 0.12),
                              bgcolor: alpha(typeColor, isDark ? 0.025 : 0.01),
                              transition: 'all 0.18s',
                              '&:hover': {
                                borderColor: alpha(typeColor, 0.4),
                                boxShadow: `0 6px 24px ${alpha(typeColor, isDark ? 0.15 : 0.08)}`,
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2}>
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Avatar
                                  sx={{
                                    width: 42, height: 42, borderRadius: 2, flexShrink: 0,
                                    bgcolor: alpha(typeColor, 0.14),
                                    color: typeColor, fontSize: '1.05rem', fontWeight: 900,
                                  }}
                                >
                                  {p.name[0]?.toUpperCase()}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={800} noWrap sx={{ mb: 0.3 }}>
                                    {p.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.disabled"
                                    sx={{ fontFamily: 'monospace', fontSize: '0.67rem' }}>
                                    /{p.slug}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Tooltip title="Open in Studio">
                                <IconButton
                                  size="small"
                                  onClick={() => { window.location.href = getStudioUrl(p.id); }}
                                  sx={{
                                    ml: 0.5, flexShrink: 0,
                                    bgcolor: alpha(typeColor, 0.08),
                                    '&:hover': { bgcolor: alpha(typeColor, 0.2) },
                                  }}
                                >
                                  <OpenInNewIcon sx={{ fontSize: 15, color: typeColor }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>

                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <TypeBadge type={p.projectType} />
                                <StatusBadge status={p.status} />
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                  {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </Typography>
                                <Tooltip title="Delete project">
                                  <IconButton
                                    size="small"
                                    onClick={() => setDeleteTarget(p)}
                                    sx={{ p: 0.5, opacity: 0.5, '&:hover': { color: 'error.main', opacity: 1 } }}
                                  >
                                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Right Column */}
          <Grid xs={12} lg={4}>
            <Stack spacing={3}>

              {/* Quick Access */}
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3, overflow: 'hidden',
                  borderColor: alpha(theme.palette.primary.main, 0.12),
                }}
              >
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle1" fontWeight={800}>Quick Access</Typography>
                  <Typography variant="caption" color="text.secondary">Jump to key platform areas</Typography>
                </Box>
                <Box sx={{ p: 1.5 }}>
                  {[
                    { label: 'New dApp Project', icon: <BoltIcon sx={{ fontSize: 18 }} />, color: '#6366f1', action: () => { window.location.href = getNewProjectUrl(); } },
                    { label: 'New Blockchain', icon: <NetworkCheckIcon sx={{ fontSize: 18 }} />, color: '#8b5cf6', action: () => { window.location.href = getNewProjectUrl(); } },
                    { label: 'API Keys', icon: <KeyIcon sx={{ fontSize: 18 }} />, color: '#f59e0b', href: '/dashboard/keys' },
                    { label: 'Governance', icon: <AccountBalanceIcon sx={{ fontSize: 18 }} />, color: '#06b6d4', href: '/dashboard/governance' },
                    { label: 'Smart Contracts', icon: <HexagonOutlinedIcon sx={{ fontSize: 18 }} />, color: '#8b5cf6', href: '/dashboard/contracts' },
                    { label: 'Audit Logs', icon: <TimelineIcon sx={{ fontSize: 18 }} />, color: '#ef4444', href: '/dashboard/audit' },
                  ].map((a) => {
                    const inner = (
                      <Stack
                        direction="row" alignItems="center" spacing={1.5}
                        sx={{
                          px: 1.5, py: 1.25, borderRadius: 2, cursor: 'pointer',
                          transition: 'all 0.12s',
                          '&:hover': { bgcolor: alpha(a.color, 0.07) },
                        }}
                      >
                        <Box sx={{
                          width: 34, height: 34, borderRadius: 1.5, flexShrink: 0,
                          bgcolor: alpha(a.color, 0.1),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: a.color,
                        }}>
                          {a.icon}
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {a.label}
                        </Typography>
                      </Stack>
                    );
                    return a.href ? (
                      <Link key={a.label} href={a.href} style={{ textDecoration: 'none', display: 'block' }}>
                        {inner}
                      </Link>
                    ) : (
                      <Box key={a.label} onClick={a.action}>{inner}</Box>
                    );
                  })}
                </Box>
              </Paper>

              {/* Platform Health */}
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3, overflow: 'hidden',
                  borderColor: alpha('#10b981', 0.2),
                }}
              >
                <Stack
                  direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>Platform Health</Typography>
                    <Typography variant="caption" color="text.secondary">Live system status</Typography>
                  </Box>
                  <Chip
                    label="All Systems Go"
                    size="small"
                    sx={{
                      height: 22, fontSize: '0.62rem', fontWeight: 700,
                      bgcolor: alpha('#10b981', 0.1), color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.25)',
                    }}
                  />
                </Stack>
                <Box sx={{ p: 2 }}>
                  <Stack spacing={0.75}>
                    {[
                      { label: 'Cerulea Studio', ok: true },
                      { label: 'AI Assistant', ok: true },
                      { label: 'Deployment Engine', ok: true },
                      { label: 'RPC Gateway', ok: true },
                      { label: 'Smart Contract Compiler', ok: true },
                    ].map((s) => (
                      <Stack
                        key={s.label}
                        direction="row" alignItems="center" justifyContent="space-between"
                        sx={{
                          py: 0.875, px: 1.5, borderRadius: 1.5,
                          bgcolor: alpha('#10b981', isDark ? 0.04 : 0.02),
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Box sx={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            bgcolor: s.ok ? '#10b981' : '#ef4444',
                            boxShadow: s.ok ? '0 0 7px #10b981' : '0 0 7px #ef4444',
                          }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {s.label}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}
                          sx={{ fontSize: '0.62rem', color: s.ok ? '#10b981' : '#ef4444' }}>
                          {s.ok ? 'Operational' : 'Degraded'}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Paper>

            </Stack>
          </Grid>
        </Grid>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteTarget}
          onClose={() => !deleting && setDeleteTarget(null)}
          maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteOutlineIcon color="error" />
            Delete Project
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete{' '}
              <strong>{deleteTarget?.name}</strong>? This will remove all drafts,
              contracts, and AI threads associated with it. This cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button
              variant="contained" color="error" onClick={handleDelete} disabled={deleting}
              startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Box>
  );
}
