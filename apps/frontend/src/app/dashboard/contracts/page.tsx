'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Alert, Divider, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

const CONTRACT_TYPE_COLOR: Record<string, string> = {
  ERC20: '#3b82f6',
  ERC721: '#8b5cf6',
  ERC1155: '#6366f1',
  Governance: '#10b981',
  Staking: '#f59e0b',
  Vault: '#06b6d4',
  Bridge: '#ec4899',
  Oracle: '#f97316',
  AccessControl: '#14b8a6',
  MultiSig: '#84cc16',
  Marketplace: '#ef4444',
  Custom: '#7C6EC0',
};

interface Project {
  id: string;
  name: string;
  projectType: string;
  status: string;
}

interface Contract {
  id: string;
  projectId: string;
  name: string;
  contractType: string;
  enabled: boolean;
  description: string | null;
  whyItExists: string | null;
  source: string | null;
  createdAt: string;
}

export default function ContractsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => {
        const list: Project[] = d.projects ?? [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setContractsLoading(true);
    setError(null);
    fetch(`/api/projects/${selectedProjectId}/contracts`)
      .then(r => r.json())
      .then(d => setContracts(d.contracts ?? []))
      .catch(() => setError('Failed to load contracts'))
      .finally(() => setContractsLoading(false));
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <Box sx={{ p: 4, maxWidth: 960, mx: 'auto' }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>STUDIO</Typography>
        <Typography variant="h4" fontWeight={900} sx={{
          background: `linear-gradient(135deg, ${isDark ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
        }}>Smart Contracts</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Smart contracts generated and saved for your projects.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* Project picker */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <FolderOpenIcon sx={{ color: 'primary.main', fontSize: 20, flexShrink: 0 }} />
          <Typography variant="subtitle2" fontWeight={700} flexShrink={0}>Select Project</Typography>
          {projectsLoading ? (
            <CircularProgress size={18} />
          ) : projects.length === 0 ? (
            <Typography variant="caption" color="text.secondary">No projects found. Create one in the Studio.</Typography>
          ) : (
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Project</InputLabel>
              <Select
                value={selectedProjectId}
                label="Project"
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <span>{p.name}</span>
                      <Chip label={p.status} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {selectedProject && (
            <Chip label={selectedProject.projectType} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5' }} />
          )}
        </Stack>
      </Paper>

      {/* Contracts list */}
      {contractsLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : contracts.length === 0 && selectedProjectId ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 6, textAlign: 'center' }}>
          <CodeIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color="text.secondary">No contracts saved</Typography>
          <Typography variant="body2" color="text.disabled" mt={0.5}>
            Contracts are saved when you complete Step 5 of the Studio wizard.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {contracts.map((c) => {
            const color = CONTRACT_TYPE_COLOR[c.contractType] ?? '#7C6EC0';
            return (
              <Paper key={c.id} variant="outlined" sx={{
                borderRadius: 3, overflow: 'hidden',
                borderColor: alpha(color, 0.25),
                bgcolor: alpha(color, 0.02),
                transition: 'box-shadow 0.15s',
                '&:hover': { boxShadow: `0 0 0 1px ${alpha(color, 0.4)}` },
              }}>
                <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CodeIcon sx={{ fontSize: 16, color }} />
                    </Box>
                    <Tooltip title={c.enabled ? 'Enabled' : 'Disabled'}>
                      {c.enabled
                        ? <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} />
                        : <CancelIcon sx={{ fontSize: 18, color: '#6b7280' }} />
                      }
                    </Tooltip>
                  </Stack>
                  <Typography variant="subtitle2" fontWeight={800} mt={1} noWrap>{c.name}</Typography>
                  <Chip label={c.contractType} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, mt: 0.75, bgcolor: alpha(color, 0.1), color }} />
                  {c.description && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.description}
                      </Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ px: 2.5, pb: 2, pt: 0 }}>
                  <Typography variant="caption" color="text.disabled">
                    {new Date(c.createdAt).toLocaleDateString()}
                    {c.source ? ` · ${c.source}` : ''}
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
