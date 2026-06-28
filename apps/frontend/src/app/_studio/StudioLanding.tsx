'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Stack, Paper, Chip, Avatar,
  CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HexagonIcon from '@mui/icons-material/Hexagon';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorageIcon from '@mui/icons-material/Storage';
import PendingIcon from '@mui/icons-material/Pending';
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic';
import LanIcon from '@mui/icons-material/Lan';

type Project = {
  id: string;
  name: string;
  slug: string;
  status: string;
  projectType: string;
  createdAt: string;
  updatedAt?: string;
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactElement | undefined; label: string }> = {
  active: { color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 11 }} />, label: 'Live' },
  deploying: { color: '#f59e0b', icon: <PendingIcon sx={{ fontSize: 11 }} />, label: 'Deploying' },
  draft: { color: '#6366f1', icon: <StorageIcon sx={{ fontSize: 11 }} />, label: 'Draft' },
  failed: { color: '#ef4444', icon: undefined, label: 'Failed' },
};

export default function StudioLanding({
  onNewProject,
  onOpenProject,
}: {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
}) {
  const theme = useTheme();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = (session?.user?.name || 'Builder')?.split(' ')[0];
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const j = await res.json();
          setProjects(j.projects || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>

      {/* Dot grid */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: isDark
          ? 'radial-gradient(rgba(79,70,229,0.14) 1px, transparent 1px)'
          : 'radial-gradient(rgba(79,70,229,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Ambient glow */}
      <Box sx={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: alpha('#4F46E5', isDark ? 0.1 : 0.05),
        filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1100, mx: 'auto', px: { xs: 3, md: 5 }, pt: { xs: 5, md: 8 }, pb: 10 }}>

        {/* Header */}
        <Stack alignItems="center" spacing={2} sx={{ mb: 8, textAlign: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <HexagonIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: -0.5 }}>
              Cerulea Studio
            </Typography>
          </Stack>

          <Typography
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              background: isDark
                ? 'linear-gradient(90deg, #e0e7ff 0%, #a5b4fc 50%, #c4b5fd 100%)'
                : 'linear-gradient(90deg, #1e1b4b 0%, #4338ca 50%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {projects.length > 0 ? `Welcome back, ${firstName}` : `Let's build, ${firstName}`}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, lineHeight: 1.7 }}>
            {projects.length > 0
              ? 'Continue working on a project or start something new.'
              : 'Build your first blockchain app or dApp — no code required.'}
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={onNewProject}
            sx={{
              mt: 1, borderRadius: 999, fontWeight: 800, px: 5, py: 1.5,
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)',
              boxShadow: '0 4px 24px rgba(79,70,229,0.45)',
              '&:hover': { boxShadow: '0 6px 32px rgba(79,70,229,0.6)', transform: 'translateY(-1px)' },
              transition: 'all 0.2s',
            }}
          >
            New Project
          </Button>
        </Stack>

        {/* Projects */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        ) : projects.length === 0 ? (
          /* Empty state — two option cards */
          <Grid container spacing={3} justifyContent="center">
            {[
              {
                icon: <AutoAwesomeMosaicIcon sx={{ fontSize: 52 }} />,
                title: 'dApp',
                subtitle: 'Deploy on Cerulea\'s public chain. NFTs, DeFi, DAO, Marketplace.',
                tags: ['Public dApp', 'Private dApp', 'NFT', 'DeFi'],
                color: '#6366f1',
              },
              {
                icon: <LanIcon sx={{ fontSize: 52 }} />,
                title: 'Private Blockchain',
                subtitle: 'A sovereign network you control end to end. CBDC, Enterprise.',
                tags: ['Enterprise', 'CBDC', 'PoA / PoS'],
                color: '#8b5cf6',
              },
            ].map((card) => (
              <Grid key={card.title} xs={12} sm={6} md={5}>
                <Paper
                  onClick={onNewProject}
                  variant="outlined"
                  sx={{
                    p: 4, borderRadius: 4, cursor: 'pointer', textAlign: 'center',
                    borderColor: alpha(card.color, 0.18),
                    bgcolor: alpha(card.color, isDark ? 0.04 : 0.02),
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: alpha(card.color, 0.45),
                      boxShadow: `0 8px 32px ${alpha(card.color, 0.15)}`,
                      transform: 'translateY(-3px)',
                    },
                  }}
                >
                  <Box sx={{
                    width: 80, height: 80, borderRadius: 3, mx: 'auto', mb: 3,
                    bgcolor: alpha(card.color, 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: card.color,
                  }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{card.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
                    {card.subtitle}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="center" useFlexGap>
                    {card.tags.map(t => (
                      <Chip key={t} label={t} size="small" sx={{
                        height: 22, fontSize: '0.67rem', fontWeight: 600,
                        bgcolor: alpha(card.color, 0.1), color: card.color, border: 'none',
                      }} />
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          /* Project grid */
          <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="h6" fontWeight={800}>Your Projects</Typography>
                <Chip label={projects.length} size="small" sx={{
                  height: 22, fontSize: '0.65rem', fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
                }} />
              </Stack>
            </Stack>

            <Grid container spacing={3}>
              {projects.map((p) => {
                const isChain = p.projectType === 'blockchain';
                const typeColor = isChain ? '#8b5cf6' : '#6366f1';
                const statusCfg = STATUS_CONFIG[p.status] ?? { color: '#6366f1', icon: null, label: p.status };
                return (
                  <Grid key={p.id} xs={12} sm={6} md={4}>
                    <Paper
                      variant="outlined"
                      onClick={() => onOpenProject(p.id)}
                      sx={{
                        p: 3, borderRadius: 3, cursor: 'pointer',
                        borderColor: alpha(typeColor, 0.12),
                        bgcolor: alpha(typeColor, isDark ? 0.03 : 0.01),
                        transition: 'all 0.18s',
                        '&:hover': {
                          borderColor: alpha(typeColor, 0.4),
                          boxShadow: `0 8px 28px ${alpha(typeColor, isDark ? 0.18 : 0.1)}`,
                          transform: 'translateY(-3px)',
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2.5}>
                        <Avatar sx={{
                          width: 48, height: 48, borderRadius: 2,
                          bgcolor: alpha(typeColor, 0.14), color: typeColor,
                          fontSize: '1.1rem', fontWeight: 900,
                        }}>
                          {p.name[0]?.toUpperCase()}
                        </Avatar>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Chip
                            icon={statusCfg.icon ?? undefined}
                            label={statusCfg.label}
                            size="small"
                            sx={{
                              height: 22, fontSize: '0.65rem', fontWeight: 700,
                              bgcolor: alpha(statusCfg.color, 0.12), color: statusCfg.color,
                              border: `1px solid ${alpha(statusCfg.color, 0.25)}`,
                              '& .MuiChip-icon': { color: statusCfg.color },
                            }}
                          />
                          <Tooltip title="Open in Studio">
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); onOpenProject(p.id); }}
                              sx={{
                                bgcolor: alpha(typeColor, 0.08),
                                '&:hover': { bgcolor: alpha(typeColor, 0.2) },
                              }}
                            >
                              <OpenInNewIcon sx={{ fontSize: 14, color: typeColor }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ mb: 0.4 }}>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', display: 'block', mb: 2 }}>
                        /{p.slug}
                      </Typography>

                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Chip
                          label={isChain ? 'Blockchain' : 'dApp'}
                          size="small"
                          sx={{
                            height: 22, fontSize: '0.65rem', fontWeight: 700,
                            bgcolor: alpha(typeColor, 0.1), color: typeColor,
                            border: `1px solid ${alpha(typeColor, 0.2)}`,
                          }}
                        />
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                          {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}

              {/* New project card */}
              <Grid xs={12} sm={6} md={4}>
                <Paper
                  variant="outlined"
                  onClick={onNewProject}
                  sx={{
                    p: 3, borderRadius: 3, cursor: 'pointer', minHeight: 180,
                    borderColor: alpha(theme.palette.primary.main, 0.15),
                    borderStyle: 'dashed',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    bgcolor: 'transparent',
                    transition: 'all 0.18s',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                    },
                  }}
                >
                  <Box sx={{
                    width: 44, height: 44, borderRadius: 2, mb: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'primary.main',
                  }}>
                    <AddIcon sx={{ fontSize: 24 }} />
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    New Project
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Box>
  );
}
