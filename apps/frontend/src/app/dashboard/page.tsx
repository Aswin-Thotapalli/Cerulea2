'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, CircularProgress, Alert,
  Chip, Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, TextField, InputAdornment, Divider,
  LinearProgress,
} from '@mui/material';
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Link from 'next/link';
import { studioProjectUrl } from '@/config/divisions';

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

// Opens a saved project inside its division (studio.cerulea.io/<division>?project=<id>).
function getStudioUrl(p: { id: string; division?: string }) {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  const base = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
  return studioProjectUrl(base, p.id, p.division);
}

function getNewProjectUrl() {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  return isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
}

const STATUS_MAP: Record<string, { color: string; icon: JSX.Element; label: string }> = {
  active:    { color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 12 }} />, label: 'Live' },
  deploying: { color: '#f59e0b', icon: <PendingIcon sx={{ fontSize: 12 }} />, label: 'Deploying' },
  draft:     { color: '#6366f1', icon: <StorageIcon sx={{ fontSize: 12 }} />, label: 'Draft' },
  failed:    { color: '#ef4444', icon: <ErrorOutlineIcon sx={{ fontSize: 12 }} />, label: 'Failed' },
};

const ACTIVITY = [
  { time: '2h ago',  text: 'Deployment completed', sub: 'CeruleaDAO → Active', color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  { time: '5h ago',  text: 'Contract compiled',    sub: 'NFT Module v2',        color: '#6366f1', icon: <HexagonOutlinedIcon sx={{ fontSize: 14 }} /> },
  { time: '1d ago',  text: 'New project created',  sub: 'Private Blockchain',   color: '#8b5cf6', icon: <RocketLaunchIcon sx={{ fontSize: 14 }} /> },
  { time: '2d ago',  text: 'API key rotated',      sub: 'Production key',       color: '#f59e0b', icon: <KeyIcon sx={{ fontSize: 14 }} /> },
  { time: '3d ago',  text: 'Governance vote',      sub: 'Proposal #14 passed',  color: '#06b6d4', icon: <AccountBalanceIcon sx={{ fontSize: 14 }} /> },
];

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
  const isDark = theme.palette.mode === 'dark';

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

  const STATS = [
    { label: 'Projects', value: loading ? '—' : projects.length, delta: '+2 this month', color: '#6366f1' },
    { label: 'Live',     value: loading ? '—' : activeCount,     delta: `${Math.round((activeCount / Math.max(projects.length, 1)) * 100)}% uptime`, color: '#10b981' },
    { label: 'Drafts',   value: loading ? '—' : draftCount,      delta: 'Pending deploy', color: '#f59e0b' },
    { label: 'Chains',   value: loading ? '—' : chainCount,      delta: `${dappCount} dApps`, color: '#8b5cf6' },
    { label: 'RPC reqs', value: loading ? '—' : '12.4K',         delta: '↑ 8% vs yesterday', color: '#06b6d4' },
  ];

  return (
    <Box sx={{ minHeight: '100%', p: { xs: 2, md: 3 }, position: 'relative' }}>

      {/* Dot grid */}
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: isDark
          ? 'radial-gradient(rgba(79,70,229,0.12) 1px, transparent 1px)'
          : 'radial-gradient(rgba(79,70,229,0.055) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1400, mx: 'auto' }}>

        {/* ── Command Header ─────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.5px', mb: 0.3 }}>
                {greeting}, {firstName}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  {now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Typography>
                {user?.plan && (
                  <Chip
                    label={user.plan.replace(/_/g, ' ').toUpperCase()}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.6rem', fontWeight: 800,
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
              onClick={() => { window.location.href = getNewProjectUrl(); }}
              sx={{
                borderRadius: 2, fontWeight: 700, px: 2.5,
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)',
                boxShadow: '0 2px 12px rgba(79,70,229,0.35)',
                '&:hover': { boxShadow: '0 4px 20px rgba(79,70,229,0.5)', transform: 'translateY(-1px)' },
                transition: 'all 0.15s',
              }}
            >
              New Project
            </Button>
          </Stack>

          {/* Inline stat strip */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STATS.length}, 1fr)`,
            gap: 1.5,
          }}>
            {STATS.map((s) => (
              <Paper
                key={s.label}
                variant="outlined"
                sx={{
                  px: 2.5, py: 1.75, borderRadius: 2.5,
                  borderColor: alpha(s.color, 0.18),
                  bgcolor: alpha(s.color, isDark ? 0.05 : 0.025),
                  position: 'relative', overflow: 'hidden',
                  '&::after': {
                    content: '""', position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                    bgcolor: s.color, opacity: 0.45,
                  },
                }}
              >
                <Typography variant="h4" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mb: 0.4 }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.disabled', display: 'block' }}>
                  {s.label}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                  {s.delta}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* ── Main 3-column layout ──────────────────────────── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 280px' }, gap: 2.5 }}>

          {/* LEFT: Project table */}
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(theme.palette.primary.main, 0.1) }}>

            {/* Table header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" px={3} py={2}
              sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main',
                }}>
                  <FolderOpenIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography variant="subtitle1" fontWeight={800}>Projects</Typography>
                    {!loading && <Chip label={projects.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }} />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Your blockchain apps and networks</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  placeholder="Search..."
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment>,
                  }}
                  sx={{ width: 150, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.8rem' } }}
                />
              </Stack>
            </Stack>

            {/* Column headers */}
            {!loading && filtered.length > 0 && (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 110px 100px 90px 60px',
                px: 3, py: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: isDark ? alpha('#4F46E5', 0.04) : alpha('#f5f5f5', 0.6),
              }}>
                {['', 'Name', 'Type', 'Status', 'Updated', ''].map((h) => (
                  <Typography key={h} variant="caption" color="text.disabled"
                    sx={{ fontWeight: 800, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {h}
                  </Typography>
                ))}
              </Box>
            )}

            {/* Rows */}
            <Box>
              {loading ? (
                <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : err ? (
                <Box sx={{ p: 3 }}><Alert severity="error" sx={{ borderRadius: 2 }}>{err}</Alert></Box>
              ) : filtered.length === 0 ? (
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Box sx={{
                    width: 72, height: 72, borderRadius: 4, mx: 'auto', mb: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.07),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FolderOpenIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.4 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {search ? 'No matching projects' : 'No projects yet'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {search ? 'Try a different search term' : 'Launch Cerulea Studio to create your first project'}
                  </Typography>
                  {!search && (
                    <Button variant="contained" startIcon={<RocketLaunchIcon />}
                      sx={{ borderRadius: 2 }}
                      onClick={() => { window.location.href = getNewProjectUrl(); }}>
                      Open Studio
                    </Button>
                  )}
                </Box>
              ) : (
                filtered.map((p, idx) => {
                  const isChain = p.projectType === 'blockchain';
                  const typeColor = isChain ? '#8b5cf6' : '#6366f1';
                  const statusCfg = STATUS_MAP[p.status] ?? { color: '#6366f1', icon: null, label: p.status };
                  return (
                    <Box key={p.id}>
                      {idx > 0 && <Divider sx={{ mx: 3 }} />}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr 110px 100px 90px 60px',
                          alignItems: 'center',
                          px: 3, py: 1.75,
                          transition: 'bgcolor 0.12s',
                          '&:hover': { bgcolor: alpha(typeColor, isDark ? 0.04 : 0.02) },
                        }}
                      >
                        {/* Avatar */}
                        <Avatar sx={{
                          width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
                          bgcolor: alpha(typeColor, 0.15), color: typeColor,
                          fontSize: '0.75rem', fontWeight: 900,
                        }}>
                          {p.name[0]?.toUpperCase()}
                        </Avatar>

                        {/* Name + slug */}
                        <Box sx={{ minWidth: 0, pr: 2 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{p.name}</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                            /{p.slug}
                          </Typography>
                        </Box>

                        {/* Type */}
                        <Chip
                          label={isChain ? 'Blockchain' : 'dApp'}
                          size="small"
                          sx={{
                            height: 20, fontSize: '0.62rem', fontWeight: 700,
                            bgcolor: alpha(typeColor, 0.1), color: typeColor,
                            border: `1px solid ${alpha(typeColor, 0.2)}`,
                            width: 'fit-content',
                          }}
                        />

                        {/* Status */}
                        <Chip
                          icon={statusCfg.icon ?? undefined}
                          label={statusCfg.label}
                          size="small"
                          sx={{
                            height: 20, fontSize: '0.62rem', fontWeight: 700,
                            bgcolor: alpha(statusCfg.color, 0.1), color: statusCfg.color,
                            border: `1px solid ${alpha(statusCfg.color, 0.2)}`,
                            '& .MuiChip-icon': { color: statusCfg.color },
                            width: 'fit-content',
                          }}
                        />

                        {/* Date */}
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                          {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Typography>

                        {/* Actions */}
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <Tooltip title="Open in Studio">
                            <IconButton size="small"
                              onClick={() => { window.open(getStudioUrl(p), '_blank', 'noopener,noreferrer'); }}
                              sx={{ bgcolor: alpha(typeColor, 0.07), '&:hover': { bgcolor: alpha(typeColor, 0.18) } }}>
                              <OpenInNewIcon sx={{ fontSize: 14, color: typeColor }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small"
                              onClick={() => setDeleteTarget(p)}
                              sx={{ '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.08) } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>

          {/* RIGHT: Sidebar panels */}
          <Stack spacing={2.5}>

            {/* Quick links */}
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" fontWeight={800}>Quick Access</Typography>
              </Box>
              <Box sx={{ p: 1 }}>
                {[
                  { label: 'New dApp',       icon: <BoltIcon sx={{ fontSize: 16 }} />,              color: '#6366f1', action: () => { window.location.href = getNewProjectUrl(); } },
                  { label: 'New Blockchain', icon: <NetworkCheckIcon sx={{ fontSize: 16 }} />,      color: '#8b5cf6', action: () => { window.location.href = getNewProjectUrl(); } },
                  { label: 'API Keys',       icon: <KeyIcon sx={{ fontSize: 16 }} />,               color: '#f59e0b', href: '/dashboard/keys' },
                  { label: 'Governance',     icon: <AccountBalanceIcon sx={{ fontSize: 16 }} />,    color: '#06b6d4', href: '/dashboard/governance' },
                  { label: 'Smart Contracts',icon: <HexagonOutlinedIcon sx={{ fontSize: 16 }} />,  color: '#8b5cf6', href: '/dashboard/contracts' },
                  { label: 'Audit Logs',     icon: <TimelineIcon sx={{ fontSize: 16 }} />,          color: '#ef4444', href: '/dashboard/audit' },
                ].map((a) => {
                  const inner = (
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{
                      px: 1.5, py: 1.1, borderRadius: 2, cursor: 'pointer',
                      transition: 'all 0.12s',
                      '&:hover': { bgcolor: alpha(a.color, 0.08) },
                    }}>
                      <Box sx={{
                        width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
                        bgcolor: alpha(a.color, 0.1),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: a.color,
                      }}>
                        {a.icon}
                      </Box>
                      <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '0.8rem' }}>
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

            {/* Recent Activity */}
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" fontWeight={800}>Recent Activity</Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Stack spacing={2}>
                  {ACTIVITY.map((a, i) => (
                    <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        bgcolor: alpha(a.color, 0.12),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: a.color, mt: 0.1,
                      }}>
                        {a.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                          {a.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
                          {a.sub}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', flexShrink: 0 }}>
                        {a.time}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Paper>

            {/* Platform health */}
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha('#10b981', 0.18) }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between"
                sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" fontWeight={800}>Platform Health</Typography>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              </Stack>
              <Box sx={{ p: 2 }}>
                <Stack spacing={1}>
                  {[
                    { label: 'Studio', pct: 100 },
                    { label: 'Deploy Engine', pct: 100 },
                    { label: 'RPC Gateway', pct: 98 },
                    { label: 'AI Assistant', pct: 100 },
                    { label: 'Contract Compiler', pct: 100 },
                  ].map((s) => (
                    <Box key={s.label}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>{s.label}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.72rem', color: s.pct === 100 ? '#10b981' : '#f59e0b' }}>
                          {s.pct}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={s.pct}
                        sx={{
                          height: 3, borderRadius: 2,
                          bgcolor: alpha('#10b981', 0.08),
                          '& .MuiLinearProgress-bar': { bgcolor: s.pct === 100 ? '#10b981' : '#f59e0b', borderRadius: 2 },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Paper>

          </Stack>
        </Box>

      </Box>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteOutlineIcon color="error" /> Delete Project
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete <strong>{deleteTarget?.name}</strong>? All drafts, contracts, and threads will be removed. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
