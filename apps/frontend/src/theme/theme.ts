'use client';
import { createTheme, responsiveFontSizes, alpha } from '@mui/material/styles';

const commonSettings = {
  typography: { fontFamily: ['Inter', 'sans-serif'].join(',') },
  shape: { borderRadius: 16 },
};

// --- Light Glass Theme ---
let lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3d5afe' },
    secondary: { main: '#9c27b0' },
    background: { default: '#ffffff', paper: 'rgba(255, 255, 255, 0.4)' },
    text: { primary: '#172b4d', secondary: '#5e6c84' },
  },
  ...commonSettings,
});

lightTheme = createTheme(lightTheme, {
  components: {
    // NOTE: The faulty MuiPaper override has been REMOVED.
    MuiAppBar: { styleOverrides: { root: { color: lightTheme.palette.text.primary }}},
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: '999px', boxShadow: 'none' }}},
  },
});

// --- Dark Glass Theme ---
let darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#448aff' },
    secondary: { main: '#ce93d8' },
    background: { default: '#0d1117', paper: 'rgba(29, 39, 58, 0.5)' },
    text: { primary: '#e6edf3', secondary: '#8b949e' },
  },
  ...commonSettings,
});

darkTheme = createTheme(darkTheme, {
  components: {
    // NOTE: The faulty MuiPaper override has been REMOVED.
    MuiButton: { ...lightTheme.components?.MuiButton },
  },
});

export const finalLightTheme = responsiveFontSizes(lightTheme);
export const finalDarkTheme = responsiveFontSizes(darkTheme);