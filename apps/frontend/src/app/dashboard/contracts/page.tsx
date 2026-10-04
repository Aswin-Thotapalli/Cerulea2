'use client';

// apps/frontend/src/app/dashboard/contracts/page.tsx
// The Smart Contracts screen.
// Cerulea runs a Blueprint on one of three execution substrates. Native
// interpretation is the default. WebAssembly serves unbounded computation.
// Ethereum Virtual Machine bytecode serves ecosystem interoperation. The
// choice and its reason live in the build state of each project.
// Without this screen nobody can see how a deployed system executes.

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Alert, Divider, Tooltip, Button,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

import { api } from '@/lib/apiClient';

const SUBSTRATE_COLOR: Record<string, string> = {
  Native: '#10b981',
  WebAssembly: '#8b5cf6',
  EthereumVirtualMachine: '#3b82f6',
};

type Substrate = {
  substrate: string;
  name: string;
  summary: string;
  suits: string;
  cost: string;
};

type Project = {
  projectId: string;
  projectName: string;
  workspaceName: string;
  state: string;
  substrate: string;
  substrateName: string;
  reason: string;
};

type ExecutionView = { projects: Project[]; substrates: Substrate[] };

export default function ContractsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [view, setView] = useState<ExecutionView | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<ExecutionView>('/api/dashboard/execution');
      setView(data);
      setSelectedProjectId((held) =>
        held && data.projects.some((p) => p.projectId === held) ? held : (data.projects[0]?.projectId ?? ''),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cerulea could not read where each project runs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void read(); }, [read]);

  const projects = view?.projects ?? [];
  const substrates = view?.substrates ?? [];
  const selectedProject = projects.find((p) => p.projectId === selectedProjectId);

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
          The execution substrate each project runs on, and the reason Cerulea chose it.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} action={<Button size="small" onClick={() => void read()}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Project picker */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <FolderOpenIcon sx={{ color: 'primary.main', fontSize: 20, flexShrink: 0 }} />
          <Typography variant="subtitle2" fontWeight={700} flexShrink={0}>Select Project</Typography>
          {loading ? (
            <CircularProgress size={18} role="status" aria-label="Reading the projects" />
          ) : projects.length === 0 ? (
            <Typography variant="caption" color="text.secondary">No projects found. Create one in the Studio.</Typography>
          ) : (
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel id="contracts-project-label">Project</InputLabel>
              <Select
                labelId="contracts-project-label"
                value={selectedProjectId}
                label="Project"
                onChange={(e) => setSelectedProjectId(String(e.target.value))}
              >
                {projects.map(p => (
                  <MenuItem key={p.projectId} value={p.projectId}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <span>{p.projectName}</span>
                      <Chip label={p.state} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {selectedProject && (
            <Chip label={selectedProject.workspaceName} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5' }} />
          )}
        </Stack>
      </Paper>

      {/* Substrate cards */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : !selectedProject ? (
        !error && (
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 6, textAlign: 'center' }}>
            <CodeIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} color="text.secondary">No project yet</Typography>
            <Typography variant="body2" color="text.disabled" mt={0.5}>
              The execution substrate of a project is recorded when it reaches the Deploy & UI step in Studio.
            </Typography>
          </Paper>
        )
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {substrates.map((s) => {
            const color = SUBSTRATE_COLOR[s.substrate] ?? '#7C6EC0';
            const chosen = selectedProject.substrate === s.substrate;
            return (
              <Paper key={s.substrate} variant="outlined" data-testid={`substrate-${s.substrate}`} sx={{
                borderRadius: 3, overflow: 'hidden',
                borderColor: alpha(color, chosen ? 0.5 : 0.25),
                bgcolor: alpha(color, chosen ? 0.04 : 0.02),
                transition: 'box-shadow 0.15s',
                '&:hover': { boxShadow: `0 0 0 1px ${alpha(color, 0.4)}` },
              }}>
                <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CodeIcon sx={{ fontSize: 16, color }} />
                    </Box>
                    <Tooltip title={chosen ? 'This project runs here' : 'Available'}>
                      {chosen
                        ? <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} aria-label="Runs here" />
                        : <CancelIcon sx={{ fontSize: 18, color: '#6b7280' }} aria-label="Available" />
                      }
                    </Tooltip>
                  </Stack>
                  <Typography variant="subtitle2" fontWeight={800} mt={1} noWrap>{s.name}</Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" mt={0.75}>
                    <Chip label={chosen ? 'Runs here' : 'Available'} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(color, 0.1), color }} />
                    {s.substrate === 'Native' && (
                      <Chip label="Default" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                    )}
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {s.summary}
                  </Typography>
                  {chosen && (
                    <>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>WHY THIS PROJECT RUNS HERE</Typography>
                      <Typography variant="caption" color="text.primary" sx={{ display: 'block', mt: 0.25 }}>
                        {selectedProject.reason.trim().length > 0 ? selectedProject.reason : 'No reason written yet.'}
                      </Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ px: 2.5, pb: 2, pt: 0 }}>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>SUITS</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>{s.suits}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>THE TRADE</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>{s.cost}</Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
