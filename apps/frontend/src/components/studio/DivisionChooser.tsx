'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Typography, Stack, Paper } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DIVISIONS, DIVISION_LABELS, pathSegmentForDivision } from '@/config/divisions';

const ACCENT: Record<string, string> = {
  dapp: '#3d5afe',
  enterprise: '#7c3aed',
  govt: '#0891b2',
};

export default function DivisionChooser() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 8,
        bgcolor: 'background.default',
      }}
    >
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, letterSpacing: 1.5, color: 'primary.main', mb: 1 }}
      >
        Cerulea Studio
      </Typography>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1, textAlign: 'center', letterSpacing: '-0.5px' }}>
        Where do you want to build?
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 5, textAlign: 'center', maxWidth: 560 }}>
        Choose your track. Each opens the studio tuned for that audience.
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        sx={{ width: '100%', maxWidth: 1000, alignItems: 'stretch' }}
      >
        {DIVISIONS.map((division) => {
          const label = DIVISION_LABELS[division];
          const accent = ACCENT[division];
          const href = `/${pathSegmentForDivision(division)}`;
          return (
            <Paper
              key={division}
              component={Link}
              href={href}
              elevation={0}
              sx={{
                flex: 1,
                p: 3.5,
                borderRadius: 3,
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: isDark ? alpha(accent, 0.06) : '#fff',
                transition: 'all 0.18s ease',
                '&:hover': {
                  borderColor: accent,
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 32px ${alpha(accent, 0.22)}`,
                },
              }}
            >
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: '12px', mb: 2,
                  bgcolor: alpha(accent, 0.14),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Box sx={{ width: 18, height: 18, borderRadius: '5px', bgcolor: accent }} />
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.75, color: 'text.primary' }}>
                {label.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1, lineHeight: 1.6, mb: 2 }}>
                {label.blurb}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: accent, fontWeight: 700 }}>
                <Typography variant="body2" fontWeight={700}>Open</Typography>
                <ArrowForwardIcon sx={{ fontSize: 16 }} />
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
