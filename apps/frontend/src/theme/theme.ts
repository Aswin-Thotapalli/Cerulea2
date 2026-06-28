'use client';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const RADIUS = 4;

const sharedComponents = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const paperBg = isDark ? '#0D1535' : '#ffffff';

  return {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 700,
          borderRadius: RADIUS,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: RADIUS,
          backgroundImage: 'none',
        },
        outlined: {
          borderColor,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: RADIUS, backgroundImage: 'none' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: RADIUS,
          backgroundColor: paperBg,
          backgroundImage: 'none',
          border: `1px solid ${borderColor}`,
          boxShadow: isDark
            ? '0 24px 72px rgba(0,0,0,0.6)'
            : '0 16px 48px rgba(15,22,41,0.18)',
        },
        backdrop: {
          backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(15,22,41,0.5)',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { backgroundColor: paperBg, backgroundImage: 'none', borderRadius: RADIUS },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: paperBg,
          backgroundImage: 'none',
          borderRadius: RADIUS,
          border: `1px solid ${borderColor}`,
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.5)'
            : '0 8px 24px rgba(15,22,41,0.12)',
        },
        list: { padding: '4px' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontSize: '0.82rem',
          minHeight: 36,
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(79,70,229,0.06)',
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(79,70,229,0.08)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS,
          '& fieldset': { borderColor },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(79,70,229,0.4)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4F46E5',
            borderWidth: 1,
          },
        },
        notchedOutline: { borderColor },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { borderRadius: RADIUS },
        input: { fontSize: '0.85rem' },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.38)' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: RADIUS, fontWeight: 600 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { height: 2, borderRadius: 0 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          fontSize: '0.82rem',
          minHeight: 40,
          padding: '0 16px',
          color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,22,41,0.45)',
          '&.Mui-selected': {
            fontWeight: 700,
            color: isDark ? '#E8ECFE' : '#0F1629',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 36, height: 20, padding: 0 },
        switchBase: {
          padding: 2,
          '&.Mui-checked': {
            transform: 'translateX(16px)',
            '& + .MuiSwitch-track': { opacity: 1 },
          },
        },
        thumb: { width: 16, height: 16, boxShadow: 'none' },
        track: { borderRadius: 10, opacity: isDark ? 0.3 : 0.2 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? 'rgba(8,14,36,0.97)' : 'rgba(15,22,41,0.92)',
          color: isDark ? '#E8ECFE' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(15,22,41,0.1)'}`,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(15,22,41,0.2)',
          borderRadius: 4,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 10px',
        },
        arrow: { color: isDark ? 'rgba(8,14,36,0.97)' : 'rgba(15,22,41,0.92)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          fontSize: '0.82rem',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.68rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.8px',
          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,22,41,0.4)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 2, height: 4 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none', boxShadow: 'none' },
      },
    },
  };
};

// --- Light Theme (default) ---
let lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4F46E5' },
    secondary: { main: '#7C3AED' },
    background: { default: '#F5F7FF', paper: '#ffffff' },
    text: { primary: '#0F1629', secondary: '#5B6B8D' },
    divider: 'rgba(0,0,0,0.08)',
    error: { main: '#DC2626' },
    warning: { main: '#D97706' },
    success: { main: '#059669' },
  },
  typography: { fontFamily: ['Inter', 'sans-serif'].join(',') },
  shape: { borderRadius: RADIUS },
  components: sharedComponents('light') as any,
});
lightTheme = responsiveFontSizes(lightTheme);

// --- Dark Theme (switchable) ---
let darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366F1' },
    secondary: { main: '#A78BFA' },
    background: { default: '#080E24', paper: '#0D1535' },
    text: { primary: '#E8ECFE', secondary: '#8FA3D2' },
    divider: 'rgba(99,102,241,0.12)',
    error: { main: '#F87171' },
    warning: { main: '#FCD34D' },
    success: { main: '#34D399' },
  },
  typography: { fontFamily: ['Inter', 'sans-serif'].join(',') },
  shape: { borderRadius: RADIUS },
  components: sharedComponents('dark') as any,
});
darkTheme = responsiveFontSizes(darkTheme);

export const finalLightTheme = lightTheme;
export const finalDarkTheme = darkTheme;
