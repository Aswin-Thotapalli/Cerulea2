'use client';

import { Box, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * The ground behind every Studio screen.
 *
 * The ground carries the theme surface with one soft wash of the shared blue at
 * the top, so the page reads as Cerulea without competing with the canvas.
 */
export default function Background() {
  const theme = useTheme();
  const wash = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06);

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        backgroundColor: theme.palette.background.default,
        backgroundImage: `radial-gradient(ellipse at 20% 0%, ${wash} 0px, transparent 60%)`,
        transition: 'background-color 200ms ease-out',
      }}
    />
  );
}
