'use client';

// apps/frontend/src/app/dashboard/page.tsx
// The Overview screen.
// Every tile, every row and every bar reads /api/dashboard/overview, which
// joins the Cerulea APIs overview, the projects of every workspace and the
// request observatory. Nothing on this screen is typed in by hand.
// Without this screen the account has no first view of its work.

import { useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, CircularProgress, Alert,
  Chip, Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, TextField, InputAdornment, Divider,
  LinearProgress, AlertTitle,
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
import StorageIcon from '@mui/icons-material/Storage';
import BlockIcon from '@mui/icons-material/Block';
import Link from 'next/link';

import { usePanelData } from '@/components/dashboard/PanelState';
import { describeAction } from '@/components/dashboard/wording';
import { planLabel } from '@/components/dashboard/plan';
import {
  divisionStartUrl,
  newProjectUrl,
  openInNewTab,
  openProjectUrl,
} from '@/components/dashboard/studio-links';
import { longDate, relativeTime, shortDate } from '@/components/dashboard/time';
import { api } from '@/lib/apiClient';

type Project = {
  id: string;
  name: string;
  slug: string;
  status: string;
  state: string;
  projectType: 'dapp' | 'blockchain';
  division: string;
  workspaceName: string;
  createdAt: string;
  updatedAt: string;
};

/** The answer of /api/dashboard/overview, exactly as the route writes it. */
type OverviewView = {
  chain: {
    chainName: string;
    kind: 'local' | 'live';
    head: number;
    finalizedBlock: number;
    activeValidators: number;
    totalValidators: number;
    consensusHealth: string;
    healthy: boolean;
  };
  integrations: { integration: string; kind: string; ready: boolean; detail: string }[];
  attention: { subject: string; fix: string }[];
  recentEvents: {
    eventId: string;
    action: string;
    subjectType: string;
    outcome: string;
    occurredAt: string;
  }[];
  projects: Project[];
  tiles: {
    projects: number;
    live: number;
    inBuild: number;
    drafts: number;
    chains: number;
    dapps: number;
    deployments: number;
    deploymentsRunning: number;
    requests: number;
    servingDeployments: number;
    requestsSince: string | null;
  };
};

const STATUS_MAP: Record<string, { color: string; icon: JSX.Element; label: string }> = {
  active:    { color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 12 }} />, label: 'Live' },
  deploying: { color: '#f59e0b', icon: <PendingIcon sx={{ fontSize: 12 }} />, label: 'Deploying' },
  draft:     { color: '#6366f1', icon: <StorageIcon sx={{ fontSize: 12 }} />, label: 'Draft' },
  failed:    { color: '#ef4444', icon: <ErrorOutlineIcon sx={{ fontSize: 12 }} />, label: 'Failed' },
};

/** The words beside the subject of an audit event. */
function subjectWords(subjectType: string): string {
  return subjectType.split('_').join(' ');
}

/** The first letter in upper case. */
function capitalised(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export default function DashboardPage() {
  const theme = useTheme();
  const { data: session } = useSession();
  const reading = usePanelData<OverviewView>('/api/dashboard/overview', 15000);
  const [search, setSearch] = useState('');
  const [closeTarget, setCloseTarget] = useState<Project | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeFailure, setCloseFailure] = useState<string | null>(null);
  // Projects closed on this screen leave the table before the next read.
  const [closedIds, setClosedIds] = useState<string[]>([]);

  const firstName = (session?.user?.name || 'Builder')?.split(' ')[0];
  const user = session?.user as { plan?: string } | undefined;
  const isDark = theme.palette.mode === 'dark';

  const view = reading.data;
  const loading = reading.loading && view === null;
  const failure = reading.failure;
  const projects = (view?.projects ?? []).filter((p) => !closedIds.includes(p.id));

  const handleClose = async () => {
    if (!closeTarget) return;
    setClosing(true);
    setCloseFailure(null);
    try {
      // The trunk route closes the project. Every saved version stays readable.
      await api(`/api/projects/${encodeURIComponent(closeTarget.id)}`, { method: 'DELETE' });
      setClosedIds((prev) => [...prev, closeTarget.id]);
      setCloseTarget(null);
      reading.readAgain();
    } catch (cause) {
      setCloseFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setClosing(false);
    }
  };

  const filtered = projects.filter((p) =>
    !search
      || p.name.toLowerCase().includes(search.toLowerCase())
      || p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const tiles = view?.tiles;
  const STATS = [
    {
      label: 'Projects',
      value: tiles ? tiles.projects : '—',
      delta: tiles ? `${tiles.live} live, ${tiles.inBuild} in build` : 'Reading',
      color: '#6366f1',
    },
    {
      label: 'Live',
      value: tiles ? tiles.live : '—',
      delta: tiles ? `${tiles.deployments} deployments, ${tiles.deploymentsRunning} in progress` : 'Reading',
      color: '#10b981',
    },
    { label: 'Drafts', value: tiles ? tiles.drafts : '—', delta: 'Pending deploy', color: '#f59e0b' },
    {
      label: 'Chains',
      value: tiles ? tiles.chains : '—',
      delta: tiles ? `${tiles.dapps} dApps` : 'Reading',
      color: '#8b5cf6',
    },
    {
      label: 'RPC requests',
      value: tiles ? tiles.requests.toLocaleString('en-GB') : '—',
      delta: tiles
        ? tiles.requestsSince
          ? `Served since ${shortDate(tiles.requestsSince)}`
          : 'No deployment serves requests yet'
        : 'Reading',
      color: '#06b6d4',
    },
  ];

  const driversReady = view ? view.integrations.every((d) => d.ready) : false;
  const healthy = Boolean(view?.chain.healthy) && driversReady;

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
                  {longDate(now)}
                </Typography>
                <Chip
                  label={planLabel(user?.plan).toUpperCase()}
                  size="small"
                  sx={{
                    height: 20, fontSize: '0.6rem', fontWeight: 800,
                    bgcolor: alpha('#4F46E5', 0.12), color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}
                />
              </Stack>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { window.location.href = newProjectUrl(); }}
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

        {/* Open items, each with the fix beside it */}
        {view && view.attention.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2.5 }}>
            {view.attention.map((item) => (
              <Alert key={item.subject} severity="warning" sx={{ borderRadius: 2 }}>
                <AlertTitle sx={{ fontWeight: 700 }}>{item.subject}</AlertTitle>
                {item.fix}
              </Alert>
            ))}
          </Stack>
        )}

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
                    {view && <Chip label={projects.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }} />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">The Blockchain apps and networks of this account</Typography>
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
            {view && filtered.length > 0 && (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 110px 100px 90px 60px',
                px: 3, py: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: isDark ? alpha('#4F46E5', 0.04) : alpha('#f5f5f5', 0.6),
              }}>
                {['', 'Name', 'Type', 'Status', 'Updated', ''].map((h, i) => (
                  <Typography key={`${h}-${i}`} variant="caption" color="text.disabled"
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
              ) : failure && view === null ? (
                <Box sx={{ p: 3 }}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}
                    action={<Button size="small" onClick={reading.readAgain}>Read again</Button>}>
                    <AlertTitle>{failure.message}</AlertTitle>
                    {failure.fix}
                  </Alert>
                </Box>
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
                    {search ? 'Try a different search term' : 'Open Cerulea Studio to start the first project'}
                  </Typography>
                  {!search && (
                    <Button variant="contained" startIcon={<RocketLaunchIcon />}
                      sx={{ borderRadius: 2 }}
                      onClick={() => { window.location.href = newProjectUrl(); }}>
                      Open Studio
                    </Button>
                  )}
                </Box>
              ) : (
                filtered.map((p, idx) => {
                  const isChain = p.projectType === 'blockchain';
                  const typeColor = isChain ? '#8b5cf6' : '#6366f1';
                  const statusCfg = STATUS_MAP[p.status] ?? { color: '#6366f1', icon: null, label: capitalised(p.status) };
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
                          {shortDate(p.updatedAt || p.createdAt)}
                        </Typography>

                        {/* Actions */}
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <Tooltip title="Open in Studio">
                            <IconButton size="small" aria-label={`Open ${p.name} in Studio`}
                              onClick={() => { openInNewTab(openProjectUrl(p.id, p.division)); }}
                              sx={{ bgcolor: alpha(typeColor, 0.07), '&:hover': { bgcolor: alpha(typeColor, 0.18) } }}>
                              <OpenInNewIcon sx={{ fontSize: 14, color: typeColor }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Close project">
                            <IconButton size="small" aria-label={`Close ${p.name}`}
                              onClick={() => { setCloseFailure(null); setCloseTarget(p); }}
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
                  { label: 'New dApp',       icon: <BoltIcon sx={{ fontSize: 16 }} />,              color: '#6366f1', action: () => { window.location.href = divisionStartUrl('dapp'); } },
                  { label: 'New Blockchain', icon: <NetworkCheckIcon sx={{ fontSize: 16 }} />,      color: '#8b5cf6', action: () => { window.location.href = divisionStartUrl('enterprise'); } },
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
                    <Box key={a.label} role="button" aria-label={a.label} onClick={a.action}>{inner}</Box>
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
                {!view ? (
                  <Typography variant="caption" color="text.secondary">Reading the audit record.</Typography>
                ) : view.recentEvents.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    The audit record holds no event for this account yet.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {view.recentEvents.slice(0, 5).map((event) => {
                      const refused = event.outcome !== 'allowed';
                      const color = refused ? '#ef4444' : '#10b981';
                      return (
                        <Stack key={event.eventId} direction="row" spacing={1.5} alignItems="flex-start">
                          <Box sx={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            bgcolor: alpha(color, 0.12),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color, mt: 0.1,
                          }}>
                            {refused ? <BlockIcon sx={{ fontSize: 14 }} /> : <CheckCircleIcon sx={{ fontSize: 14 }} />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                              {describeAction(event.action)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
                              {capitalised(subjectWords(event.subjectType))}, {event.outcome}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', flexShrink: 0 }}>
                            {relativeTime(event.occurredAt, now)}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Paper>

            {/* Platform health */}
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(healthy ? '#10b981' : '#f59e0b', 0.18) }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between"
                sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" fontWeight={800}>Platform Health</Typography>
                <Box aria-label={healthy ? 'Every service answers' : 'A service needs attention'}
                  sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: healthy ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${healthy ? '#10b981' : '#f59e0b'}` }} />
              </Stack>
              <Box sx={{ p: 2 }}>
                {!view ? (
                  <Typography variant="caption" color="text.secondary">Reading the node and the drivers.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {[
                      {
                        label: view.chain.chainName,
                        ok: view.chain.healthy,
                        right: `Agreement ${view.chain.consensusHealth}`,
                        detail: `Block ${view.chain.head}, irreversible to ${view.chain.finalizedBlock}, ${view.chain.activeValidators} of ${view.chain.totalValidators} validators serving.`,
                      },
                      ...view.integrations.map((driver) => ({
                        label: capitalised(driver.integration),
                        ok: driver.ready,
                        right: driver.ready ? 'Ready' : 'Holding back',
                        detail: driver.detail,
                      })),
                    ].map((s) => (
                      <Tooltip key={s.label} title={s.detail} placement="left">
                        <Box>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>{s.label}</Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.72rem', color: s.ok ? '#10b981' : '#f59e0b' }}>
                              {s.right}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={s.ok ? 100 : 0}
                            aria-label={`${s.label}: ${s.detail}`}
                            sx={{
                              height: 3, borderRadius: 2,
                              bgcolor: alpha(s.ok ? '#10b981' : '#f59e0b', 0.12),
                              '& .MuiLinearProgress-bar': { bgcolor: s.ok ? '#10b981' : '#f59e0b', borderRadius: 2 },
                            }}
                          />
                          <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', fontSize: '0.62rem', mt: 0.25 }}>
                            {s.detail}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>

          </Stack>
        </Box>

      </Box>

      {/* Close Dialog */}
      <Dialog
        open={!!closeTarget}
        onClose={() => !closing && setCloseTarget(null)}
        maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteOutlineIcon color="error" /> Close Project
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Close <strong>{closeTarget?.name}</strong>? The project leaves this list and stops accepting changes. Every saved Blueprint version stays readable.
          </DialogContentText>
          {closeFailure && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{closeFailure}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCloseTarget(null)} disabled={closing}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleClose} disabled={closing}
            startIcon={closing ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
            {closing ? 'Closing...' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
