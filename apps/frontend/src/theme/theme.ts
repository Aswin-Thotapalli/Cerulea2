'use client';
import { createTheme, responsiveFontSizes, alpha } from '@mui/material/styles';

const commonSettings = {
  typography: { fontFamily: ['Inter', 'sans-serif'].join(',') },
  shape: { borderRadius: 16 },
};

// --- Light Theme ---
let lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4F46E5' },
    secondary: { main: '#7C3AED' },
    background: { default: '#F5F7FF', paper: '#ffffff' },
    text: { primary: '#0F1629', secondary: '#3D4F7C' },
    divider: 'rgba(79,70,229,0.1)',
  },
  ...commonSettings,
});

lightTheme = createTheme(lightTheme, {
  components: {
    MuiAppBar: { styleOverrides: { root: { color: lightTheme.palette.text.primary }}},
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: '999px', boxShadow: 'none' }}},
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.98)',
          color: '#0F1629',
          border: '1px solid rgba(79,70,229,0.12)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(15,22,41,0.12)',
          borderRadius: 8,
          fontSize: '0.78rem',
          padding: '8px 12px',
        },
        arrow: { color: 'rgba(255,255,255,0.98)' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
        },
      },
    },
  },
});

// --- Dark Theme (navy, no near-black) ---
let darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366F1' },
    secondary: { main: '#A78BFA' },
    background: { default: '#080E24', paper: '#0D1535' },
    text: { primary: '#E8ECFE', secondary: '#8FA3D2' },
    divider: 'rgba(99,102,241,0.15)',
  },
  ...commonSettings,
});

darkTheme = createTheme(darkTheme, {
  components: {
    MuiButton: { ...lightTheme.components?.MuiButton },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(8,14,36,0.98)',
          color: '#E8ECFE',
          border: '1px solid rgba(99,102,241,0.2)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,20,0.5)',
          borderRadius: 8,
          fontSize: '0.78rem',
          padding: '8px 12px',
        },
        arrow: { color: 'rgba(8,14,36,0.98)' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D1535',
          backgroundImage: 'none',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D1535',
          backgroundImage: 'none',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D1535',
          backgroundImage: 'none',
        },
      },
    },
  },
});

export const finalLightTheme = responsiveFontSizes(lightTheme);
export const finalDarkTheme = responsiveFontSizes(darkTheme);