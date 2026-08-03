'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Stack, Paper, Chip,
  CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
  filterProjectType,
}: {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  filterProjectType?: 'dapp' | 'blockchain' | null;
}) {
  const theme = useTheme();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // In a division, only show that division's project type (dApp vs blockchain).
  const shown = filterProjectType ? projects.filter((p) => p.projectType === filterProjectType) : projects;

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
          <Box sx={{ mb: 1, position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Image
              src="/brand/logo-dark.png"
              alt="Cerulea Studio"
              width={280}
              height={77}
              style={{ objectFit: 'contain', width: 'auto', height: 60, display: 'block' }}
              priority
            />
            {isDark && (
              <Image
                src="/brand/logo-dark.png"
                alt=""
                aria-hidden
                width={280}
                height={77}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  objectFit: 'contain', width: 'auto', height: 60, display: 'block',
                  filter: 'brightness(0) invert(1)',
                  clipPath: 'inset(0 0 0 63%)',
                }}
                priority
              />
            )}
          </Box>

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
            {shown.length > 0 ? `Welcome back, ${firstName}` : `Let's build, ${firstName}`}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, lineHeight: 1.7 }}>
            {shown.length > 0
              ? 'Continue working on a project or start something new.'
              : 'Build your first blockchain app or dApp. No code required.'}
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={onNewProject}
            sx={{
              mt: 1, fontWeight: 800, px: 5, py: 1.5,
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)',
              boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
              '&:hover': { boxShadow: '0 6px 28px rgba(79,70,229,0.5)' },
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
        ) : shown.length === 0 ? (
          /* Empty state — two option cards */
          <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              {
                icon: <AutoAwesomeMosaicIcon sx={{ fontSize: 44 }} />,
                title: 'dApp',
                subtitle: 'Build smart-contract powered applications on Cerulea. NFTs, DeFi, DAO, Marketplace.',
                tags: ['Public dApp', 'Private dApp', 'NFT', 'DeFi'],
                color: '#4F46E5',
              },
              {
                icon: <LanIcon sx={{ fontSize: 44 }} />,
                title: 'Private Blockchain',
                subtitle: 'A sovereign network you control end to end. CBDC, Enterprise.',
                tags: ['Enterprise', 'CBDC', 'PoA / PoS'],
                color: '#7C3AED',
              },
            ].map((card) => (
              <Box key={card.title} sx={{ flex: '0 1 380px', minWidth: 260 }}>
                <Paper
                  onClick={onNewProject}
                  variant="outlined"
                  sx={{
                    p: 4, cursor: 'pointer', textAlign: 'center',
                    borderColor: alpha(card.color, isDark ? 0.15 : 0.18),
                    bgcolor: alpha(card.color, isDark ? 0.04 : 0.02),
                    backdropFilter: 'blur(12px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
                    transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
                    '&:hover': {
                      borderColor: alpha(card.color, 0.4),
                      bgcolor: alpha(card.color, isDark ? 0.07 : 0.04),
                      boxShadow: `0 0 28px ${alpha(card.color, isDark ? 0.28 : 0.14)}, 0 4px 20px ${alpha(card.color, isDark ? 0.14 : 0.07)}`,
                    },
                  }}
                >
                  <Box sx={{
                    width: 64, height: 64, mx: 'auto', mb: 2.5,
                    bgcolor: alpha(card.color, isDark ? 0.12 : 0.08),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: card.color, borderRadius: 1,
                  }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 0.75 }}>{card.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6, fontSize: '0.82rem' }}>
                    {card.subtitle}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="center" useFlexGap>
                    {card.tags.map(t => (
                      <Box key={t} sx={{
                        px: 1.25, py: 0.3, fontSize: '0.65rem', fontWeight: 700,
                        bgcolor: alpha(card.color, 0.08), color: card.color, borderRadius: 0.5,
                      }}>{t}</Box>
                    ))}
                  </Stack>
                </Paper>
              </Box>
            ))}
          </Box>
        ) : (
          /* Project card grid */
          <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="h6" fontWeight={800}>Your Projects</Typography>
                <Box sx={{
                  px: 1.25, py: 0.25, borderRadius: 0.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main', fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {shown.length}
                </Box>
              </Stack>
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
              {shown.map((p) => {
                const isChain = p.projectType === 'blockchain';
                const typeColor = isChain ? '#7C3AED' : '#4F46E5';
                const statusCfg = STATUS_CONFIG[p.status] ?? { color: '#6366f1', icon: undefined, label: p.status };
                return (
                  <Paper
                    key={p.id}
                    variant="outlined"
                    onClick={() => onOpenProject(p.id)}
                    sx={{
                      p: 0, cursor: 'pointer', overflow: 'hidden',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
                      borderLeft: `3px solid ${typeColor}`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: alpha(typeColor, 0.4),
                        bgcolor: isDark ? alpha(typeColor, 0.04) : alpha(typeColor, 0.02),
                        boxShadow: `0 0 24px ${alpha(typeColor, isDark ? 0.28 : 0.12)}, 0 4px 16px ${alpha(typeColor, isDark ? 0.16 : 0.08)}`,
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Box sx={{ p: 2.5 }}>
                      <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2 }}>
                        <Box sx={{
                          width: 36, height: 36, flexShrink: 0,
                          bgcolor: alpha(typeColor, isDark ? 0.12 : 0.08),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: typeColor, borderRadius: 1,
                        }}>
                          {isChain ? <LanIcon sx={{ fontSize: 18 }} /> : <AutoAwesomeMosaicIcon sx={{ fontSize: 18 }} />}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800} noWrap>{p.name}</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.62rem' }}>
                            /{p.slug}
                          </Typography>
                        </Box>
                        <Tooltip title="Open in Studio">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onOpenProject(p.id); }}
                            sx={{
                              width: 28, height: 28, borderRadius: 1,
                              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                              '&:hover': { bgcolor: alpha(typeColor, 0.12) },
                            }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box sx={{
                          px: 1.25, py: 0.3, borderRadius: 0.5,
                          bgcolor: alpha(typeColor, 0.08), color: typeColor,
                          fontSize: '0.63rem', fontWeight: 700,
                        }}>
                          {isChain ? 'Blockchain' : 'dApp'}
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusCfg.color }} />
                          <Typography variant="caption" fontWeight={700} sx={{ color: statusCfg.color, fontSize: '0.7rem' }}>
                            {statusCfg.label}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>

                    <Box sx={{
                      px: 2.5, py: 1,
                      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                        Updated {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}

              {/* New project tile */}
              <Paper
                variant="outlined"
                onClick={onNewProject}
                sx={{
                  p: 2.5, cursor: 'pointer', minHeight: 120,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 1, borderStyle: 'dashed', position: 'relative', zIndex: 0, overflow: 'visible',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(79,70,229,0.2)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  transition: 'border-color 0.2s, background-color 0.15s',
                  '@keyframes gradBorder': {
                    '0%,100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                  },
                  '&::before': {
                    content: '""', position: 'absolute', inset: -1.5,
                    borderRadius: '13px', zIndex: -1, opacity: 0,
                    transition: 'opacity 0.3s',
                    background: 'linear-gradient(120deg,#4f46e5,#7c3aed,#06b6d4,#22c55e,#f59e0b,#4f46e5)',
                    backgroundSize: '300% 300%',
                    animation: 'gradBorder 5s ease infinite',
                  },
                  '&:hover': {
                    borderColor: 'transparent',
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                  },
                  '&:hover::before': { opacity: 1 },
                }}
              >
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AddIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                </Box>
                <Typography variant="body2" fontWeight={700} color="primary.main">New Project</Typography>
              </Paper>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
