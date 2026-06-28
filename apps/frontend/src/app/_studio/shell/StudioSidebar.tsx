'use client';

import React, { useState } from 'react';
import { Box, Typography, Avatar, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import Link from 'next/link';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CheckIcon from '@mui/icons-material/Check';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import { useSession } from 'next-auth/react';

/* ---- Step definitions ---- */
const MAIN_STEPS = [
  { label: 'Foundation', stepNum: 1, Icon: HomeOutlinedIcon },
  { label: 'Blueprint', stepNum: 2, Icon: AccountTreeOutlinedIcon },
  { label: 'Data schema', stepNum: 3, Icon: StorageOutlinedIcon },
  { label: 'Economics', stepNum: 4, Icon: AccountBalanceWalletOutlinedIcon },
  { label: 'Integrations', stepNum: 5, Icon: ExtensionOutlinedIcon },
  { label: 'Deploy & UI', stepNum: 6, Icon: CloudUploadOutlinedIcon },
];

function getSubSteps(projectType: string | null): string[] {
  if (projectType === 'blockchain') {
    return ['Choose type', 'Legacy check', 'Template', 'Configure'];
  }
  return ['Choose type', 'Template', 'Configure'];
}

/* Maps raw phase index (0-3) to display sub-step index based on project type */
function displaySubStep(phase: number, projectType: string | null): number {
  if (projectType === 'blockchain') return phase;
  if (phase === 0) return 0;
  if (phase === 2) return 1;
  if (phase === 3) return 2;
  return 0;
}

/* ---- Props ---- */
export interface StudioSidebarProps {
  stepIndex: number;
  subStepIndex: number;
  projectType: string | null;
  onStepChange?: (index: number) => void;
}

export default function StudioSidebar({ stepIndex, subStepIndex, projectType, onStepChange }: StudioSidebarProps) {
  const theme = useTheme();
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const subSteps = getSubSteps(projectType);
  const activeSubStep = displaySubStep(subStepIndex, projectType);
  const PRIMARY = theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AT';

  return (
    <Box sx={{
      width: 220,
      flexShrink: 0,
      bgcolor: 'background.paper',
      borderRight: '0.5px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: '14px 10px 8px' }}>

        {/* Section label */}
        <Typography sx={{
          px: '8px', mb: 1.5, display: 'block',
          fontSize: '0.62rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.8px',
          color: 'text.secondary',
        }}>
          Project steps
        </Typography>

        {/* ── Step 1: Foundation (always expanded) ── */}
        <Box sx={{
          border: '0.5px solid',
          borderColor: stepIndex === 0
            ? alpha(PRIMARY, isDark ? 0.3 : 0.2)
            : 'transparent',
          borderRadius: '10px',
          background: stepIndex === 0
            ? alpha(PRIMARY, isDark ? 0.06 : 0.03)
            : 'transparent',
          mb: 0.5,
          overflow: 'hidden',
          cursor: onStepChange ? 'pointer' : 'default',
          transition: 'background 0.15s',
          '&:hover': onStepChange ? {
            background: stepIndex === 0
              ? alpha(PRIMARY, isDark ? 0.09 : 0.05)
              : alpha(PRIMARY, isDark ? 0.03 : 0.015),
          } : {},
        }}>
          {/* Foundation header row */}
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              p: '9px 10px',
              borderBottom: stepIndex === 0 ? '0.5px solid' : '0.5px solid transparent',
              borderColor: alpha(PRIMARY, 0.12),
            }}
            onClick={() => onStepChange?.(0)}
          >
            <Avatar sx={{
              width: 24, height: 24, borderRadius: '7px',
              bgcolor: stepIndex === 0 ? PRIMARY : 'action.disabledBackground',
              color: '#fff',
            }}>
              <HomeOutlinedIcon sx={{ fontSize: 13 }} />
            </Avatar>
            <Box>
              <Typography sx={{
                fontSize: '0.58rem', textTransform: 'uppercase',
                fontWeight: 600, letterSpacing: '0.5px',
                color: stepIndex === 0 ? PRIMARY : 'text.secondary',
              }}>
                Step 1
              </Typography>
              <Typography sx={{
                fontSize: '0.72rem', fontWeight: 500, lineHeight: 1,
                color: stepIndex === 0 ? PRIMARY : 'text.secondary',
              }}>
                Foundation
              </Typography>
            </Box>
          </Box>

          {/* Sub-steps — shown when stepIndex === 0 */}
          {stepIndex === 0 && (
            <Box sx={{ p: '6px 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {subSteps.map((label, i) => {
                const isDone   = i < activeSubStep;
                const isActive = i === activeSubStep;
                const isLocked = i > activeSubStep;

                return (
                  <Box key={label} sx={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    p: '5px 8px', borderRadius: '6px',
                    bgcolor: isActive ? PRIMARY : 'transparent',
                    opacity: isLocked ? 0.45 : 1,
                    transition: 'all 0.15s',
                  }}>
                    {/* Badge */}
                    <Box sx={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: isDone ? 'success.main' : isActive ? alpha('#fff', 0.2) : 'transparent',
                      border: isLocked ? `1.5px solid ${alpha(PRIMARY, 0.4)}` : 'none',
                    }}>
                      {isDone
                        ? <CheckIcon sx={{ fontSize: 9, color: '#fff' }} />
                        : <Typography sx={{ fontSize: '0.58rem', color: isActive ? '#fff' : PRIMARY, fontWeight: 600, lineHeight: 1 }}>{i + 1}</Typography>
                      }
                    </Box>
                    <Typography sx={{
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? '#fff' : isDone ? 'success.dark' : PRIMARY,
                    }}>
                      {label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* ── Steps 2–6 ── */}
        {MAIN_STEPS.slice(1).map((step, i) => {
          const realIdx = i + 1;
          const isDone   = stepIndex > realIdx;
          const isActive = stepIndex === realIdx;
          const opacity  = isDone ? 1 : isActive ? 1 : Math.max(0.07, 0.30 - i * 0.06);

          return (
            <Box
              key={step.label}
              onClick={() => onStepChange?.(realIdx)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                p: '8px 10px', borderRadius: '9px', mb: 0.25,
                bgcolor: isActive ? alpha(PRIMARY, 0.04) : 'transparent',
                border: isActive ? `0.5px solid ${alpha(PRIMARY, 0.2)}` : '0.5px solid transparent',
                opacity,
                transition: 'all 0.2s',
                cursor: onStepChange ? 'pointer' : 'default',
                '&:hover': onStepChange ? {
                  bgcolor: isActive ? alpha(PRIMARY, 0.07) : alpha(PRIMARY, 0.035),
                  opacity: 1,
                } : {},
              }}
            >
              <Avatar sx={{
                width: 24, height: 24, borderRadius: '7px',
                bgcolor: isActive ? PRIMARY : isDone ? alpha(PRIMARY, 0.2) : 'action.disabledBackground',
                color: isActive ? '#fff' : isDone ? PRIMARY : 'text.secondary',
              }}>
                {isDone ? <CheckIcon sx={{ fontSize: 11 }} /> : <step.Icon sx={{ fontSize: 11 }} />}
              </Avatar>
              <Box>
                <Typography sx={{
                  fontSize: '0.58rem', textTransform: 'uppercase',
                  fontWeight: 600, letterSpacing: '0.4px',
                  color: 'text.secondary',
                }}>
                  Step {step.stepNum}
                </Typography>
                <Typography sx={{
                  fontSize: '0.72rem',
                  color: isActive ? PRIMARY : isDone ? 'text.primary' : 'text.secondary',
                  fontWeight: isActive ? 500 : isDone ? 500 : 400,
                }}>
                  {step.label}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ── User pill ── */}
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          borderTop: '0.5px solid', borderColor: 'divider',
          p: '10px 14px', display: 'flex', alignItems: 'center', gap: 1,
          cursor: 'pointer',
          transition: 'background 0.15s',
          '&:hover': { bgcolor: alpha(PRIMARY, 0.04) },
        }}
      >
        <Avatar sx={{
          width: 24, height: 24,
          bgcolor: alpha(PRIMARY, 0.12),
          color: PRIMARY,
          fontSize: '0.6rem', fontWeight: 600,
        }}>
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: '0.7rem', fontWeight: 500, color: 'text.primary',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {session?.user?.name || 'Studio'}
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
            Personal workspace
          </Typography>
        </Box>
      </Box>

      {/* ── User account menu ── */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{
          elevation: 4,
          sx: { minWidth: 200, borderRadius: 2, mb: 0.5, border: '1px solid', borderColor: 'divider' },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {session?.user?.name || 'Studio User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {session?.user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          component={Link}
          href="/settings/profile"
          onClick={() => setAnchorEl(null)}
          dense
        >
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          My Profile
        </MenuItem>
        <MenuItem
          component={Link}
          href="/dashboard"
          onClick={() => setAnchorEl(null)}
          dense
        >
          <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
          Dashboard
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            window.location.href = '/api/auth/force-signout?next=/auth/login';
          }}
          dense
        >
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>
    </Box>
  );
}
