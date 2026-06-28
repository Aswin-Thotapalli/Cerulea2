'use client';

import {
  AppBar, Toolbar, Box, IconButton, Tooltip, Typography,
  Drawer, List, ListItem, ListItemButton, ListItemText, Divider,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ViewListIcon from '@mui/icons-material/ViewList';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CodeIcon from '@mui/icons-material/Code';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SendIcon from '@mui/icons-material/Send';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import SearchBar from './SearchBar';
import ChainSwitcher from './ChainSwitcher';
import WsStatusBadge from './WsStatusBadge';
import { useChainContext } from '@/context/ChainContext';
import { useWs } from '@/context/WsContext';

const NAV_ITEMS = [
  { label: 'Overview', href: '', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Blocks', href: '/blocks', icon: <ViewListIcon fontSize="small" /> },
  { label: 'Transactions', href: '/txs', icon: <ReceiptLongIcon fontSize="small" /> },
  { label: 'Accounts', href: '/accounts', icon: <AccountBalanceWalletIcon fontSize="small" /> },
  { label: 'Contracts', href: '/contracts', icon: <CodeIcon fontSize="small" /> },
  { label: 'Validators', href: '/validators', icon: <PeopleAltIcon fontSize="small" /> },
  { label: 'Submit Tx', href: '/submit', icon: <SendIcon fontSize="small" /> },
];

export default function ExplorerNav() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pathname = usePathname();
  const { chain } = useChainContext();
  const { status } = useWs();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const base = `/explorer/${chain}`;

  const isActive = (href: string) => {
    const full = `${base}${href}`;
    if (href === '') return pathname === base || pathname === base + '/';
    return pathname.startsWith(full);
  };

  const navLinks = (
    <>
      {NAV_ITEMS.map(({ label, href, icon }) => (
        <ListItemButton
          key={label}
          component={Link}
          href={`${base}${href}`}
          onClick={() => setDrawerOpen(false)}
          sx={{
            borderRadius: 2,
            px: 1.5,
            py: 0.75,
            gap: 1,
            color: isActive(href) ? 'primary.main' : 'text.secondary',
            fontWeight: isActive(href) ? 700 : 400,
            bgcolor: isActive(href) ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06), color: 'primary.main' },
            transition: 'all 0.15s',
          }}
        >
          <Box sx={{ display: 'flex', color: 'inherit' }}>{icon}</Box>
          <Typography variant="body2" fontWeight="inherit" sx={{ color: 'inherit' }}>
            {label}
          </Typography>
        </ListItemButton>
      ))}
    </>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: { xs: 56, sm: 64 } }}>
          {/* Logo */}
          <Box
            component={Link}
            href={`/explorer/${chain}`}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', flexShrink: 0 }}
          >
            <Box sx={{
              display: 'inline-flex', alignItems: 'center',
              ...(isDark && { bgcolor: 'rgba(255,255,255,0.93)', borderRadius: '6px', p: 0.25 }),
            }}>
              <Image
                src="/brand/icon.png"
                alt="Cerulea"
                width={34}
                height={34}
                style={{ objectFit: 'contain', width: 34, height: 34 }}
                priority
              />
            </Box>
            <Typography fontWeight={800} fontSize="1rem" sx={{ color: 'text.primary', letterSpacing: '-0.02em' }}>
              Cerulea
              <Typography component="span" fontWeight={400} sx={{ color: 'text.secondary', ml: 0.5 }}>
                Explorer
              </Typography>
            </Typography>
          </Box>

          {/* Desktop nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
              {NAV_ITEMS.map(({ label, href }) => (
                <Box
                  key={label}
                  component={Link}
                  href={`${base}${href}`}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    fontSize: '0.82rem',
                    fontWeight: isActive(href) ? 700 : 500,
                    color: isActive(href) ? 'primary.main' : 'text.secondary',
                    bgcolor: isActive(href) ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.06) },
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {!isMobile && <SearchBar />}

          <ChainSwitcher currentChain={chain} />

          <WsStatusBadge status={status} />

          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)} size="small" edge="end">
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Navigation</Typography>
          <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
        </Box>
        <Divider />
        <Box sx={{ px: 1.5, py: 2 }}>
          <SearchBar fullWidth placeholder="Search..." />
        </Box>
        <List dense sx={{ px: 1 }}>
          {navLinks}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <ChainSwitcher currentChain={chain} />
        </Box>
      </Drawer>
    </>
  );
}
