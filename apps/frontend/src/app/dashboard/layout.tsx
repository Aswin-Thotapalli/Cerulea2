'use client';

import React, { useState } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, Tooltip, Stack, Avatar, Chip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import DnsIcon from '@mui/icons-material/Dns';
import KeyIcon from '@mui/icons-material/Key';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import DescriptionIcon from '@mui/icons-material/Description';
import SaveIcon from '@mui/icons-material/Save';
import HubIcon from '@mui/icons-material/Hub';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const DRAWER_WIDTH = 248;
const DRAWER_COLLAPSED = 68;

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: <DashboardIcon fontSize="small" />, color: '#6366f1' },
  { label: 'Projects', href: '/dashboard/projects', icon: <FolderOpenIcon fontSize="small" />, color: '#6366f1' },
  { label: 'Networks', href: '/dashboard/networks', icon: <NetworkCheckIcon fontSize="small" />, color: '#8b5cf6' },
  { label: 'Nodes', href: '/dashboard/nodes', icon: <DnsIcon fontSize="small" />, color: '#8b5cf6' },
  { label: 'Keys & Access', href: '/dashboard/keys', icon: <KeyIcon fontSize="small" />, color: '#f59e0b' },
  { label: 'Governance', href: '/dashboard/governance', icon: <AccountBalanceIcon fontSize="small" />, color: '#06b6d4' },
  { label: 'Smart Contracts', href: '/dashboard/contracts', icon: <HexagonOutlinedIcon fontSize="small" />, color: '#8b5cf6' },
  { label: 'Audit Logs', href: '/dashboard/audit', icon: <DescriptionIcon fontSize="small" />, color: '#ef4444' },
  { label: 'State Snapshots', href: '/dashboard/state', icon: <SaveIcon fontSize="small" />, color: '#10b981' },
  { label: 'Integrations', href: '/dashboard/integrations', icon: <HubIcon fontSize="small" />, color: '#06b6d4' },
  { label: 'Billing', href: '/dashboard/billing', icon: <CreditCardIcon fontSize="small" />, color: '#f59e0b' },
  { label: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon fontSize="small" />, color: '#6366f1' },
];

const NAV_GROUPS = [
  { label: 'PLATFORM', items: NAV_ITEMS.slice(0, 2) },
  { label: 'INFRASTRUCTURE', items: NAV_ITEMS.slice(2, 4) },
  { label: 'DEVELOP', items: NAV_ITEMS.slice(4, 7) },
  { label: 'MANAGE', items: NAV_ITEMS.slice(7, 10) },
  { label: 'ACCOUNT', items: NAV_ITEMS.slice(10) },
];

function getNewProjectUrl() {
  if (typeof window === 'undefined') return 'https://studio.cerulea.io';
  return window.location.hostname.includes('localhost') ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;
  const isDark = theme.palette.mode === 'dark';

  const user = session?.user as any;
  const firstName = (user?.name || 'Builder')?.split(' ')[0];
  const initials = (user?.name || 'B').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)', bgcolor: 'background.default', position: 'relative' }}>

      {/* Dot grid on main content */}
      <Box sx={{
        position: 'fixed', inset: 0, top: 64, left: drawerWidth, zIndex: 0, pointerEvents: 'none',
        backgroundImage: isDark
          ? 'radial-gradient(rgba(79,70,229,0.11) 1px, transparent 1px)'
          : 'radial-gradient(rgba(79,70,229,0.055) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        transition: 'left 0.2s ease',
      }} />

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          position: 'fixed',
          top: 64,
          left: 0,
          height: 'calc(100vh - 64px)',
          zIndex: 1200,
          bgcolor: isDark ? 'rgba(8,14,36,0.98)' : 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(20px)',
          borderRight: `1px solid ${isDark ? alpha('#6366f1', 0.12) : theme.palette.divider}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar top accent line */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #4F46E5, #8b5cf6, #06b6d4)',
        }} />

        {/* Logo bar */}
        {collapsed ? (
          <Box sx={{
            height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0, mt: '2px',
          }}>
            <IconButton size="small" onClick={() => setCollapsed(false)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: alpha('#4F46E5', 0.08) } }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{
            height: 60, display: 'flex', alignItems: 'center',
            px: 2.5, gap: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            flexShrink: 0, mt: '2px',
          }}>
            <Box component={Link} href="/" sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', minWidth: 0 }}>
              <Image
                src={isDark ? '/brand/logo-dark.png' : '/brand/logo-light.png'}
                alt="Cerulea Studio"
                width={150}
                height={42}
                style={{ objectFit: 'contain', width: 'auto', height: 36 }}
                priority
              />
              <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: -0.5, fontSize: '1rem', whiteSpace: 'nowrap' }}>
                Cerulea Studio
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setCollapsed(true)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* New Project CTA */}
        <Box sx={{ px: collapsed ? 1 : 2, py: 1.5, flexShrink: 0 }}>
          {collapsed ? (
            <Tooltip title="New Project" placement="right">
              <IconButton
                onClick={() => { window.location.href = getNewProjectUrl(); }}
                sx={{
                  width: '100%', borderRadius: 2,
                  bgcolor: alpha('#4F46E5', 0.1),
                  color: 'primary.main',
                  '&:hover': { bgcolor: alpha('#4F46E5', 0.18) },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Box
              onClick={() => { window.location.href = getNewProjectUrl(); }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2, py: 1.25, borderRadius: 2, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(99,102,241,0.08) 100%)',
                border: `1px solid ${alpha('#4F46E5', 0.25)}`,
                transition: 'all 0.15s',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.22) 0%, rgba(99,102,241,0.14) 100%)',
                  borderColor: alpha('#4F46E5', 0.45),
                },
              }}
            >
              <Box sx={{
                width: 22, height: 22, borderRadius: 1, flexShrink: 0,
                bgcolor: alpha('#4F46E5', 0.15),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'primary.main',
              }}>
                <AddIcon sx={{ fontSize: 14 }} />
              </Box>
              <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.8rem' }}>
                New Project
              </Typography>
              <Box sx={{ flex: 1 }} />
              <RocketLaunchIcon sx={{ fontSize: 13, color: 'primary.main', opacity: 0.6 }} />
            </Box>
          )}
        </Box>

        {/* Nav items */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha('#6366f1', 0.15), borderRadius: 2 } }}>
          {collapsed ? (
            // Collapsed: just icons
            <List disablePadding>
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href);
                return (
                  <Tooltip key={item.href} title={item.label} placement="right">
                    <ListItem disablePadding sx={{ display: 'block', px: 1, mb: 0.25 }}>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        selected={isActive}
                        sx={{
                          borderRadius: 2, minHeight: 40, justifyContent: 'center', px: 0,
                          color: isActive ? item.color : 'text.secondary',
                          bgcolor: isActive ? alpha(item.color, 0.1) : 'transparent',
                          '&.Mui-selected': { bgcolor: alpha(item.color, 0.1) },
                          '&:hover': { bgcolor: alpha(item.color, 0.07), color: item.color },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
                          {item.icon}
                        </ListItemIcon>
                      </ListItemButton>
                    </ListItem>
                  </Tooltip>
                );
              })}
            </List>
          ) : (
            // Expanded: grouped
            NAV_GROUPS.map((group) => (
              <Box key={group.label} sx={{ mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 3, py: 1, display: 'block',
                    fontSize: '0.6rem', fontWeight: 800, letterSpacing: 1.2,
                    color: isDark ? alpha('#a5b4fc', 0.5) : alpha('#4F46E5', 0.4),
                    textTransform: 'uppercase',
                  }}
                >
                  {group.label}
                </Typography>
                <List disablePadding>
                  {group.items.map((item) => {
                    const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href);
                    return (
                      <ListItem key={item.href} disablePadding sx={{ px: 1.5, mb: 0.25 }}>
                        <ListItemButton
                          component={Link}
                          href={item.href}
                          selected={isActive}
                          sx={{
                            borderRadius: 2, minHeight: 38, px: 1.5,
                            color: isActive ? item.color : 'text.secondary',
                            position: 'relative',
                            '&.Mui-selected': {
                              bgcolor: alpha(item.color, 0.08),
                              '&::before': {
                                content: '""',
                                position: 'absolute', left: 0, top: '20%', bottom: '20%',
                                width: 3, borderRadius: '0 2px 2px 0',
                                bgcolor: item.color,
                              },
                            },
                            '&:hover': {
                              bgcolor: alpha(item.color, 0.06),
                              color: item.color,
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                              fontSize: '0.825rem',
                              fontWeight: isActive ? 700 : 500,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            ))
          )}
        </Box>

        {/* User footer */}
        {!collapsed && user && (
          <Box sx={{
            p: 2, borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0,
          }}>
            <Stack direction="row" alignItems="center" spacing={1.25}
              component={Link} href="/settings/profile"
              sx={{
                textDecoration: 'none', color: 'inherit', borderRadius: 2, p: 1,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: alpha('#4F46E5', 0.06) },
              }}
            >
              <Avatar sx={{
                width: 32, height: 32, bgcolor: alpha('#4F46E5', 0.15),
                color: 'primary.main', fontSize: '0.8rem', fontWeight: 800,
              }}>
                {initials}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" fontWeight={700} noWrap display="block" sx={{ lineHeight: 1.2 }}>
                  {firstName}
                </Typography>
                {user?.plan && (
                  <Chip label={user.plan.toUpperCase()} size="small" sx={{
                    height: 16, fontSize: '0.55rem', fontWeight: 800, mt: 0.25,
                    bgcolor: alpha('#4F46E5', 0.1), color: 'primary.main', border: 'none',
                  }} />
                )}
              </Box>
              <SettingsIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
            </Stack>
          </Box>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: `${drawerWidth}px`,
          transition: 'margin-left 0.2s ease',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
