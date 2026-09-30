'use client';
import { alpha, createTheme, darken, lighten, type Theme } from '@mui/material/styles';

/**
 * The Cerulea Studio theme.
 *
 * Studio shares the palette, the type scale and the spacing unit with Cerulea
 * Explorer and Cerulea Dashboard, so the three surfaces read as one product.
 * The light theme leads. Dark mode follows the same roles.
 */

/** The Cerulea palette, fixed by the brand. */
export const ceruleaPalette = {
  sharedBlue: '#004AAD',
  gold: '#EEC000',
  green: '#30B700',
  lightPanel: '#9BB7D4',
  white: '#FFFFFF',
} as const;

interface Roles {
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  positive: string;
  panel: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  warning: string;
  critical: string;
  focusRing: string;
}

const lightRoles: Roles = {
  primary: ceruleaPalette.sharedBlue,
  onPrimary: ceruleaPalette.white,
  accent: ceruleaPalette.gold,
  onAccent: '#1A1400',
  positive: ceruleaPalette.green,
  panel: ceruleaPalette.lightPanel,
  surface: '#F5F8FC',
  surfaceRaised: ceruleaPalette.white,
  textPrimary: '#0F1E36',
  textSecondary: '#475C7A',
  border: '#D2DDEA',
  warning: '#8A5D00',
  critical: '#A3161B',
  focusRing: ceruleaPalette.sharedBlue,
};

const darkRoles: Roles = {
  primary: '#7FB0F5',
  onPrimary: '#04142B',
  accent: ceruleaPalette.gold,
  onAccent: '#1A1400',
  positive: '#5FD43A',
  panel: '#16293F',
  surface: '#07111F',
  surfaceRaised: '#0C1B2E',
  textPrimary: '#EAF1FA',
  textSecondary: '#A6BBD6',
  border: '#22405F',
  warning: '#F0BC4C',
  critical: '#FF8A8A',
  focusRing: ceruleaPalette.gold,
};

/** The type scale every Cerulea surface shares. */
const typeScale = {
  family: '"Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
  display: '2rem',
  title: '1.5rem',
  heading: '1.25rem',
  subheading: '1.0625rem',
  body: '1rem',
  supporting: '0.9375rem',
  label: '0.8125rem',
};

function buildTheme(mode: 'light' | 'dark'): Theme {
  const roles = mode === 'light' ? lightRoles : darkRoles;
  const focusOutline = { outline: `3px solid ${roles.focusRing}`, outlineOffset: '2px' };
  const base = createTheme({
    palette: {
      mode,
      primary: { main: roles.primary, contrastText: roles.onPrimary },
      secondary: { main: roles.accent, contrastText: roles.onAccent },
      success: { main: roles.positive },
      warning: { main: roles.warning },
      error: { main: roles.critical },
      background: { default: roles.surface, paper: roles.surfaceRaised },
      text: { primary: roles.textPrimary, secondary: roles.textSecondary },
      divider: roles.border,
    },
    spacing: 8,
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: typeScale.family,
      h1: { fontSize: typeScale.display, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.015em' },
      h2: { fontSize: typeScale.title, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' },
      h3: { fontSize: typeScale.heading, fontWeight: 700, lineHeight: 1.3 },
      h4: { fontSize: typeScale.subheading, fontWeight: 700, lineHeight: 1.4 },
      h5: { fontSize: typeScale.body, fontWeight: 700, lineHeight: 1.4 },
      h6: { fontSize: typeScale.supporting, fontWeight: 700, lineHeight: 1.4 },
      subtitle1: { fontSize: typeScale.body, fontWeight: 500, lineHeight: 1.5 },
      subtitle2: { fontSize: typeScale.supporting, fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: typeScale.body, lineHeight: 1.5 },
      body2: { fontSize: typeScale.supporting, lineHeight: 1.5 },
      caption: { fontSize: typeScale.label, lineHeight: 1.5 },
      overline: { fontSize: typeScale.label, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' },
      button: { fontSize: typeScale.supporting, fontWeight: 600, textTransform: 'none' },
    },
  });

  return createTheme(base, {
    typography: {
      // A phone reads the page title one step smaller.
      h1: { [base.breakpoints.down('sm')]: { fontSize: typeScale.title } },
      h2: { [base.breakpoints.down('sm')]: { fontSize: typeScale.heading } },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: mode, backgroundColor: roles.surface },
          a: { color: roles.primary, textUnderlineOffset: '0.2em' },
          '::selection': { backgroundColor: alpha(roles.primary, 0.25) },
          'a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, [tabindex]:focus-visible':
            focusOutline,
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiButtonBase: {
        styleOverrides: { root: { '&.Mui-focusVisible': focusOutline } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: 'none',
            minHeight: 40,
            paddingInline: base.spacing(2),
          },
          sizeSmall: { minHeight: 32, paddingInline: base.spacing(1.5) },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { color: roles.textPrimary } },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: roles.border },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderRadius: 12, borderColor: roles.border } },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500, borderRadius: 6 } },
        variants: [
          {
            props: { variant: 'filled', color: 'success' },
            style: {
              backgroundColor: alpha(roles.positive, mode === 'light' ? 0.16 : 0.22),
              color: mode === 'light' ? darken(roles.positive, 0.5) : lighten(roles.positive, 0.45),
            },
          },
        ],
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: roles.border },
          head: {
            fontSize: typeScale.label,
            fontWeight: 700,
            color: roles.textSecondary,
            backgroundColor: alpha(roles.panel, mode === 'light' ? 0.22 : 0.45),
            whiteSpace: 'nowrap',
          },
          body: { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'light' ? roles.textPrimary : roles.surfaceRaised,
            color: mode === 'light' ? ceruleaPalette.white : roles.textPrimary,
            border: `1px solid ${roles.border}`,
            borderRadius: 8,
            fontSize: typeScale.label,
            padding: '8px 12px',
          },
          arrow: { color: mode === 'light' ? roles.textPrimary : roles.surfaceRaised },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { backgroundColor: roles.surfaceRaised, backgroundImage: 'none' } },
      },
      MuiPopover: {
        styleOverrides: { paper: { backgroundColor: roles.surfaceRaised, backgroundImage: 'none' } },
      },
      MuiMenu: {
        styleOverrides: { paper: { backgroundColor: roles.surfaceRaised, backgroundImage: 'none' } },
      },
    },
  });
}

export const finalLightTheme = buildTheme('light');
export const finalDarkTheme = buildTheme('dark');
