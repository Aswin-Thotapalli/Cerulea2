'use client';

// apps/frontend/src/app/admin/layout.tsx
// The administration frame of the Cerulea operator.
// The frame keeps the production look: a forced dark theme, a full screen
// panel over the Studio bar, a 252 pixel sidebar that collapses, a top bar
// with search, the running mode, the open items and the operator avatar.
// Every figure in the frame comes from /api/admin/stats, /api/admin/users and
// /api/admin/projects, which read Cerulea APIs for the operator role alone.
// Without this frame the operator screens would sit under the Studio bar.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, Tooltip, Badge, Stack, Avatar, Chip,
  TextField, InputAdornment, Paper, Popper, ClickAwayListener, MenuList, MenuItem,
} from '@mui/material';
import { alpha, createTheme, ThemeProvider } from '@mui/material/styles';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HexagonIcon from '@mui/icons-material/Hexagon';
import LogoutIcon from '@mui/icons-material/Logout';

const DRAWER_WIDTH = 252;
const DRAWER_COLLAPSED = 64;

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** The name of the live count the entry shows as a badge. */
  badge?: 'refusals';
  section: string;
};

/**
 * The entries with a screen behind them. Production also linked Deployments,
 * AI Monitor, Billing, Support and a System entry, each without a screen.
 * Those links stay out until a screen exists.
 */
const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: <DashboardIcon fontSize="small" />, section: 'Platform' },
  { label: 'Users', href: '/admin/users', icon: <PeopleIcon fontSize="small" />, section: 'Platform' },
  { label: 'Projects', href: '/admin/projects', icon: <FolderIcon fontSize="small" />, section: 'Platform' },
  { label: 'Blockchain Ops', href: '/admin/blockchain', icon: <HexagonOutlinedIcon fontSize="small" />, section: 'Infrastructure' },
  { label: 'Security', href: '/admin/security', icon: <ShieldIcon fontSize="small" />, badge: 'refusals', section: 'Operations' },
  { label: 'Audit Logs', href: '/admin/audit', icon: <AssignmentIcon fontSize="small" />, section: 'Operations' },
];

/** The production section order. A section with no entry stays out. */
const SECTIONS = ['Platform', 'Infrastructure', 'Operations', 'System'].filter((section) =>
  NAV_ITEMS.some((item) => item.section === section),
);

/** The part of /api/admin/stats the frame reads. */
type FrameStats = {
  mode: 'local' | 'live';
  refusedActions: number;
  openItems: { id: string; source: string; message: string }[];
};

type SearchUser = { id: string; name: string | null; email: string };
type SearchProject = { id: string; name: string; workspaceName: string };

// Force dark theme for admin
const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#448aff' },
    secondary: { main: '#ce93d8' },
    error: { main: '#f44336' },
    warning: { main: '#ff9800' },
    success: { main: '#4caf50' },
    background: { default: '#080b12', paper: 'rgba(14,20,32,0.95)' },
    text: { primary: '#e6edf3', secondary: '#8b949e' },
    divider: 'rgba(255,255,255,0.07)',
  },
  typography: { fontFamily: ['Inter', 'sans-serif'].join(',') },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: '999px', boxShadow: 'none' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(255,255,255,0.06)' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});

/** The most matches the search dropdown lists for each kind. */
const SEARCH_LIMIT = 5;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [term, setTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [users, setUsers] = useState<SearchUser[] | null>(null);
  const [projects, setProjects] = useState<SearchProject[] | null>(null);
  const searchAnchor = useRef<HTMLDivElement | null>(null);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const isAdmin = session?.user?.isAdmin === true;

  // The frame figures: the running mode, the refusal count and the open items.
  useEffect(() => {
    if (status !== 'authenticated' || !isAdmin) return;
    let live = true;
    fetch('/api/admin/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) setStats({ mode: d.mode, refusedActions: d.refusedActions, openItems: d.openItems ?? [] });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [status, isAdmin]);

  // The search loads the users and the projects once, on the first keystroke.
  useEffect(() => {
    if (term.length === 0 || users !== null || projects !== null) return;
    let live = true;
    Promise.all([
      fetch('/api/admin/users').then((r) => (r.ok ? r.json() : { users: [] })),
      fetch('/api/admin/projects').then((r) => (r.ok ? r.json() : { projects: [] })),
    ])
      .then(([u, p]) => {
        if (!live) return;
        setUsers(u.users ?? []);
        setProjects(p.projects ?? []);
      })
      .catch(() => {
        if (!live) return;
        setUsers([]);
        setProjects([]);
      });
    return () => {
      live = false;
    };
  }, [term, users, projects]);

  const matches = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length === 0) return { users: [] as SearchUser[], projects: [] as SearchProject[] };
    return {
      users: (users ?? [])
        .filter((u) => u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q))
        .slice(0, SEARCH_LIMIT),
      projects: (projects ?? [])
        .filter((p) => p.name.toLowerCase().includes(q) || p.workspaceName.toLowerCase().includes(q))
        .slice(0, SEARCH_LIMIT),
    };
  }, [term, users, projects]);

  const openMatch = (href: string) => {
    setSearchOpen(false);
    setTerm('');
    router.push(href);
  };

  if (status === 'loading') {
    return (
      <ThemeProvider theme={adminTheme}>
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#080b12' }}>
          <Typography color="text.secondary">Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // The middleware gates both hosts. These two redirects stand behind it on the same site.
  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = `/auth/login?next=${encodeURIComponent(pathname ?? '/admin')}`;
    }
    return null;
  }

  if (status === 'authenticated' && !isAdmin) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return null;
  }

  const openCount = stats?.openItems.length ?? 0;
  const refusals = stats?.refusedActions ?? 0;
  const searching = term.trim().length > 0;
  const nothingFound = searching && users !== null && matches.users.length === 0 && matches.projects.length === 0;

  return (
    <ThemeProvider theme={adminTheme}>
      {/* position:fixed inset:0 covers the root layout's NavBar completely */}
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box
          component="nav"
          aria-label="Operator sections"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: 'width 0.2s ease',
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            zIndex: 1200,
            bgcolor: 'rgba(8,11,18,0.98)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Logo + operator chip */}
          <Box
            sx={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              px: collapsed ? 1.5 : 2.5,
              gap: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}
          >
            <HexagonIcon sx={{ color: '#448aff', fontSize: 26 }} />
            {!collapsed && (
              <Box>
                <Typography variant="subtitle2" fontWeight={900} sx={{ letterSpacing: -0.3, lineHeight: 1.1 }}>
                  Cerulea
                </Typography>
                <Chip
                  label="CERULEA OPERATOR"
                  size="small"
                  icon={<AdminPanelSettingsIcon sx={{ fontSize: '0.6rem !important' }} />}
                  sx={{
                    height: 16,
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    bgcolor: alpha('#f44336', 0.15),
                    color: '#f44336',
                    border: `1px solid ${alpha('#f44336', 0.25)}`,
                    letterSpacing: 0.5,
                    '& .MuiChip-icon': { color: '#f44336 !important', mr: '-2px' },
                  }}
                />
              </Box>
            )}
            <Box sx={{ flex: 1 }} />
            <IconButton size="small" aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'} onClick={() => setCollapsed((c) => !c)} sx={{ color: 'text.secondary' }}>
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Box>

          {/* Nav Items */}
          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            {SECTIONS.map((section) => {
              const items = NAV_ITEMS.filter((i) => i.section === section);
              return (
                <Box key={section}>
                  {!collapsed && (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 3,
                        pt: 2,
                        pb: 0.5,
                        display: 'block',
                        color: 'rgba(255,255,255,0.3)',
                        fontWeight: 700,
                        letterSpacing: 1,
                        fontSize: '0.62rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      {section}
                    </Typography>
                  )}
                  <List disablePadding>
                    {items.map((item) => {
                      const isActive =
                        item.href === '/admin'
                          ? pathname === '/admin'
                          : pathname?.startsWith(item.href);
                      const badge = item.badge === 'refusals' ? refusals : 0;
                      return (
                        <Tooltip key={item.href} title={collapsed ? item.label : ''} placement="right">
                          <ListItem disablePadding>
                            <ListItemButton
                              component={Link}
                              href={item.href}
                              selected={isActive}
                              sx={{
                                mx: 1,
                                borderRadius: 1.5,
                                minHeight: 38,
                                px: collapsed ? 1.5 : 1.75,
                                mb: 0.25,
                                color: isActive ? '#448aff' : 'rgba(255,255,255,0.55)',
                                '&.Mui-selected': {
                                  bgcolor: alpha('#448aff', 0.12),
                                  '&:hover': { bgcolor: alpha('#448aff', 0.16) },
                                },
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,0.05)',
                                  color: 'rgba(255,255,255,0.85)',
                                },
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  minWidth: collapsed ? 0 : 34,
                                  color: isActive ? '#448aff' : 'inherit',
                                }}
                              >
                                {badge > 0 ? (
                                  <Badge badgeContent={badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', height: 14, minWidth: 14 } }}>
                                    {item.icon}
                                  </Badge>
                                ) : item.icon}
                              </ListItemIcon>
                              {!collapsed && (
                                <ListItemText
                                  primary={item.label}
                                  primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: isActive ? 700 : 500 }}
                                />
                              )}
                              {!collapsed && badge > 0 && (
                                <Tooltip title={`${badge} refused actions in the platform record`}>
                                  <Chip
                                    label={badge}
                                    size="small"
                                    data-testid="refusal-badge"
                                    sx={{
                                      height: 18,
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      bgcolor: alpha('#f44336', 0.18),
                                      color: '#f44336',
                                      border: 'none',
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </ListItemButton>
                          </ListItem>
                        </Tooltip>
                      );
                    })}
                  </List>
                </Box>
              );
            })}
          </Box>

          {/* Footer */}
          {!collapsed && (
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: alpha('#448aff', 0.2), fontSize: '0.7rem', fontWeight: 900, color: '#448aff' }}>
                  {(session?.user?.name || session?.user?.email || 'O')[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={700} noWrap sx={{ display: 'block', color: 'text.primary' }}>
                    {session?.user?.name || 'Cerulea operator'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }} noWrap>
                    {session?.user?.email}
                  </Typography>
                </Box>
                <Tooltip title="Sign out">
                  <IconButton size="small" aria-label="Sign out" onClick={() => {
                    window.location.href = `/api/auth/force-signout?next=${encodeURIComponent('/')}`;
                  }} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#f44336' } }}>
                    <LogoutIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          )}
        </Box>

        {/* Main area */}
        <Box
          sx={{
            flex: 1,
            ml: `${drawerWidth}px`,
            transition: 'margin-left 0.2s ease',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
            overflow: 'hidden',
          }}
        >
          {/* Top bar */}
          <Box
            sx={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              px: 3,
              gap: 2,
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              bgcolor: 'rgba(8,11,18,0.96)',
              backdropFilter: 'blur(20px)',
              position: 'sticky',
              top: 0,
              zIndex: 1100,
              flexShrink: 0,
            }}
          >
            {/* Global search over the users and the projects */}
            <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
              <Box ref={searchAnchor} sx={{ width: 340 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search users and projects..."
                  value={term}
                  onChange={(e) => { setTerm(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  inputProps={{ 'aria-label': 'Search users and projects' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: '0.82rem',
                      bgcolor: 'rgba(255,255,255,0.04)',
                      borderRadius: 2,
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.08) !important' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15) !important' },
                    },
                  }}
                />
                <Popper open={searchOpen && searching} anchorEl={searchAnchor.current} placement="bottom-start" sx={{ zIndex: 1600, width: 340 }}>
                  <Paper variant="outlined" sx={{ mt: 0.5, borderRadius: 2, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <MenuList dense>
                      {users === null && (
                        <MenuItem disabled sx={{ fontSize: '0.78rem' }}>Reading users and projects...</MenuItem>
                      )}
                      {matches.users.length > 0 && (
                        <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: 0.7, fontSize: '0.62rem' }}>
                          USERS
                        </Typography>
                      )}
                      {matches.users.map((u) => (
                        <MenuItem key={u.id} onClick={() => openMatch(`/admin/users?search=${encodeURIComponent(u.email)}`)} sx={{ fontSize: '0.8rem' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.name ?? u.email}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{u.email}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                      {matches.projects.length > 0 && (
                        <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: 0.7, fontSize: '0.62rem' }}>
                          PROJECTS
                        </Typography>
                      )}
                      {matches.projects.map((p) => (
                        <MenuItem key={p.id} onClick={() => openMatch(`/admin/projects?search=${encodeURIComponent(p.name)}`)} sx={{ fontSize: '0.8rem' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{p.workspaceName}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                      {nothingFound && (
                        <MenuItem disabled sx={{ fontSize: '0.78rem' }}>No user or project matches.</MenuItem>
                      )}
                    </MenuList>
                  </Paper>
                </Popper>
              </Box>
            </ClickAwayListener>

            <Box sx={{ flex: 1 }} />

            {/* The running mode, read from Cerulea APIs */}
            {stats && (
              <Chip
                label={stats.mode.toUpperCase()}
                size="small"
                data-testid="mode-chip"
                sx={{
                  bgcolor: alpha(stats.mode === 'live' ? '#4caf50' : '#448aff', 0.12),
                  color: stats.mode === 'live' ? '#4caf50' : '#448aff',
                  border: `1px solid ${alpha(stats.mode === 'live' ? '#4caf50' : '#448aff', 0.25)}`,
                  fontWeight: 800,
                  fontSize: '0.62rem',
                  letterSpacing: 1,
                  height: 22,
                }}
              />
            )}

            {/* Open items bell */}
            <Tooltip title={openCount === 0 ? 'No open items' : `${openCount} open item${openCount === 1 ? '' : 's'}`}>
              <IconButton size="small" aria-label="Open items" onClick={() => router.push('/admin')} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                <Badge badgeContent={openCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', height: 14, minWidth: 14 } }}>
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Operator profile */}
            <Tooltip title={session?.user?.email || 'Cerulea operator'}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha('#448aff', 0.2),
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  color: '#448aff',
                  cursor: 'default',
                  border: '1px solid rgba(68,138,255,0.3)',
                }}
              >
                {(session?.user?.name || session?.user?.email || 'O')[0].toUpperCase()}
              </Avatar>
            </Tooltip>
          </Box>

          {/* Page content */}
          <Box component="main" sx={{ flex: 1, p: { xs: 3, md: 4 }, overflowY: 'auto' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
