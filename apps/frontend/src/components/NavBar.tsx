'use client';

import {
  AppBar, Toolbar, Button, IconButton, Box, Tooltip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useThemeToggle } from '@/app/providers';

export default function NavBar() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toggleTheme } = useThemeToggle();
  const { data: session, status, update } = useSession();

  useEffect(() => { update(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: alpha(theme.palette.background.paper, 0.85),
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ gap: 0.5 }}>
        {/* Logo */}
        <Box component={Link} href="/" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Image
              src="/brand/logo-dark.png"
              alt="Cerulea Studio"
              width={200}
              height={55}
              style={{ objectFit: 'contain', width: 'auto', height: 44, display: 'block' }}
              priority
            />
            {isDark && (
              <Image
                src="/brand/logo-dark.png"
                alt=""
                aria-hidden
                width={200}
                height={55}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  objectFit: 'contain', width: 'auto', height: 44, display: 'block',
                  filter: 'brightness(0) invert(1)',
                  clipPath: 'inset(0 0 0 63%)',
                }}
                priority
              />
            )}
          </Box>
        </Box>

        {/* Theme toggle */}
        <Tooltip title={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton onClick={toggleTheme} color="inherit" size="small" sx={{ ml: 0.5 }}>
            {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Auth state */}
        {status === 'loading' ? null : session ? (
          <Button
            component={Link}
            href="/dashboard"
            size="small"
            startIcon={<DashboardIcon />}
            sx={{ ml: 0.5 }}
            color="inherit"
          >
            Dashboard
          </Button>
        ) : (
          <>
            <Button
              component={Link}
              href="/auth/login"
              size="small"
              startIcon={<LoginIcon />}
              color="inherit"
              sx={{ ml: 0.5 }}
            >
              Sign In
            </Button>
            <Button
              component={Link}
              href="/auth/register"
              size="small"
              startIcon={<PersonAddIcon />}
              variant="contained"
              color="primary"
              sx={{ ml: 0.5 }}
            >
              Sign Up
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
