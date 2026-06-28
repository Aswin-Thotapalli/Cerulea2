'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogActions, Button, Typography, Box, Stack, Chip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

export interface GuidanceStep {
  first: string;
  next: string;
}

interface StepGuidanceProps {
  stepKey: string;
  title: string;
  subtitle: string;
  description: string;
  steps: GuidanceStep[];
  tip?: string;
}

export default function StepGuidance({ stepKey, title, subtitle, description, steps, tip }: StepGuidanceProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`guidance:dismissed:${stepKey}`);
      if (!dismissed) setOpen(true);
    } catch {}
  }, [stepKey]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(`guidance:dismissed:${stepKey}`, '1');
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  const PRIMARY = theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          bgcolor: 'background.paper',
          backdropFilter: 'blur(24px)',
          border: `0.5px solid ${alpha(PRIMARY, isDark ? 0.25 : 0.15)}`,
          boxShadow: isDark
            ? `0 24px 64px rgba(0,0,20,0.55), 0 0 0 1px ${alpha(PRIMARY, 0.08)}`
            : `0 24px 64px rgba(79,70,229,0.12), 0 0 0 1px ${alpha(PRIMARY, 0.06)}`,
          overflow: 'hidden',
        },
      }}
      BackdropProps={{
        sx: {
          bgcolor: isDark ? 'rgba(8,14,36,0.7)' : 'rgba(15,22,41,0.3)',
          backdropFilter: 'blur(6px)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        px: 3, pt: 3, pb: 2.5,
        background: `linear-gradient(135deg, ${alpha(PRIMARY, isDark ? 0.1 : 0.05)} 0%, ${alpha(theme.palette.secondary.main, isDark ? 0.06 : 0.03)} 100%)`,
        borderBottom: `0.5px solid ${theme.palette.divider}`,
      }}>
        <Chip
          label={subtitle}
          size="small"
          sx={{
            mb: 1.5,
            height: 20,
            bgcolor: alpha(PRIMARY, 0.1),
            color: 'primary.main',
            fontWeight: 600,
            fontSize: '0.62rem',
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
          }}
        />
        <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.25, letterSpacing: '-0.2px' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>
          {description}
        </Typography>
      </Box>

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        <Typography sx={{
          fontSize: '0.6rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '1px',
          color: 'text.secondary', mb: 1.5, display: 'block',
        }}>
          How to use this step
        </Typography>

        <Stack spacing={1}>
          {steps.map((s, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                gap: 1.5,
                p: '10px 14px',
                borderRadius: '10px',
                bgcolor: alpha(PRIMARY, isDark ? 0.06 : 0.04),
                border: `0.5px solid ${alpha(PRIMARY, isDark ? 0.15 : 0.1)}`,
              }}
            >
              <Box sx={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, mt: 0.15,
                bgcolor: alpha(PRIMARY, 0.12),
                color: 'primary.main', fontWeight: 700, fontSize: '0.65rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i + 1}
              </Box>
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{s.first}</Typography>
                  <ArrowForwardIcon sx={{ fontSize: 11, color: 'text.disabled', flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{s.next}</Typography>
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>

        {tip && (
          <Box sx={{
            mt: 2, p: '10px 14px', borderRadius: '10px',
            bgcolor: alpha(PRIMARY, isDark ? 0.05 : 0.04),
            border: `0.5px solid ${alpha(PRIMARY, 0.15)}`,
            display: 'flex', gap: 1.25, alignItems: 'flex-start',
          }}>
            <LightbulbOutlinedIcon sx={{ fontSize: 15, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              <strong style={{ color: theme.palette.text.primary }}>Tip:</strong> {tip}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Button
          variant="contained"
          onClick={handleDismiss}
          endIcon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
          sx={{ borderRadius: 999, fontWeight: 500, px: 3, boxShadow: 'none' }}
        >
          Got it, let's go
        </Button>
      </DialogActions>
    </Dialog>
  );
}
