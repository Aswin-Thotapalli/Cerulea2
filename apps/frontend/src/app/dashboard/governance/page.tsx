'use client';

// apps/frontend/src/app/dashboard/governance/page.tsx
// The Governance screen.
// Governance states who may change a deployed system and how much agreement
// each transaction class needs. The four classes and their thresholds come
// from the architecture. The authority, the change process and the quorum of
// each project come from the Governance section of its Blueprint.
// Without this screen nobody can see who holds authority over a deployment.

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Button, Chip, CircularProgress, Alert, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GavelIcon from '@mui/icons-material/Gavel';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Link from 'next/link';

import { api } from '@/lib/apiClient';
import { describeDelay } from '@/components/dashboard/wording';

type TransactionClass = {
  name: string;
  architectureThreshold: number;
  mandatoryDelay: boolean;
  meaning: string;
};

type ProjectGovernance = {
  projectId: string;
  projectName: string;
  workspaceName: string;
  state: string;
  version: number;
  authority: string[];
  quorum: { routine: number; financial: number; structural: number; constitutional: number };
  constitutionalDelayBlocks: number;
  changeProcess: string;
  roleCount: number;
};

type GovernanceView = { classes: TransactionClass[]; projects: ProjectGovernance[] };

const CLASS_COLOR: Record<string, string> = {
  Routine: '#10b981',
  Financial: '#f59e0b',
  Structural: '#8b5cf6',
  Constitutional: '#ef4444',
};

const QUORUM_KEY: Record<string, keyof ProjectGovernance['quorum']> = {
  Routine: 'routine',
  Financial: 'financial',
  Structural: 'structural',
  Constitutional: 'constitutional',
};

function studioBase(): string {
  if (typeof window === 'undefined') return 'https://studio.cerulea.io';
  return window.location.hostname.includes('localhost') ? window.location.origin : 'https://studio.cerulea.io';
}

export default function GovernancePage() {
  const theme = useTheme();
  const [view, setView] = useState<GovernanceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setView(await api<GovernanceView>('/api/dashboard/governance'));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Cerulea could not read the governance of our projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void read(); }, [read]);

  const header = (
    <Box mb={4}>
      <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>ON-CHAIN GOVERNANCE</Typography>
      <Typography variant="h4" fontWeight={900} sx={{
        background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
      }}>Governance</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        Who may change each deployed system, and the share of validators each transaction class needs.
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 4, maxWidth: 860, mx: 'auto' }}>
        {header}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }} role="status" aria-label="Reading the governance">
          <CircularProgress size={32} />
        </Box>
      </Box>
    );
  }

  if (loadError || !view) {
    return (
      <Box sx={{ p: 4, maxWidth: 860, mx: 'auto' }}>
        {header}
        <Alert severity="error" action={<Button size="small" onClick={() => void read()}>Retry</Button>}>
          {loadError ?? 'Cerulea could not read the governance of our projects.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 860, mx: 'auto' }}>
      {header}

      {/* Transaction classes */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GavelIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800}>Transaction Classes</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Every transaction belongs to one class. The class sets the share of validators that must agree.
            </Typography>
          </Stack>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              {['Class', 'Agreement', 'Delay', 'What it covers'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.65rem', letterSpacing: 0.8, py: 1.5 }}>
                  {h.toUpperCase()}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {view.classes.map((entry) => {
              const color = CLASS_COLOR[entry.name] ?? '#4F46E5';
              return (
                <TableRow key={entry.name} sx={{ borderLeft: `3px solid ${alpha(color, 0.5)}` }}>
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip label={entry.name} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha(color, 0.1), color, border: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ color }}>{entry.architectureThreshold} percent</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {entry.mandatoryDelay ? 'Mandatory delay' : 'None'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">{entry.meaning}</Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* Per project governance */}
      {view.projects.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', borderColor: alpha('#4F46E5', 0.2), bgcolor: alpha('#4F46E5', 0.03) }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalanceIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" fontWeight={800} gutterBottom>No project yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 460, mx: 'auto', lineHeight: 1.7 }}>
            Start a project in Studio. The authority, the change process and the quorum of its Blueprint appear here.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" startIcon={<RocketLaunchIcon />} sx={{ fontWeight: 700 }}
              onClick={() => { window.location.href = studioBase(); }}>
              Start a project in Studio
            </Button>
            <Button variant="outlined" sx={{ borderRadius: 1, fontWeight: 700 }} component={Link} href="/dashboard">
              Back to Overview
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {view.projects.map((project) => (
            <Paper key={project.projectId} variant="outlined" data-testid={`governance-${project.projectId}`} sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>{project.projectName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {project.workspaceName}, Blueprint version {project.version}, {project.roleCount} roles
                  </Typography>
                </Box>
                <Chip label={project.state} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize' }} />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>AUTHORITY</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 2 }}>
                {project.authority.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No role holds authority yet.</Typography>
                ) : project.authority.map((role) => (
                  <Chip key={role} label={role} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5', border: 'none' }} />
                ))}
              </Stack>

              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>CHANGE PROCESS</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2, lineHeight: 1.7 }}>
                {project.changeProcess.trim().length > 0 ? project.changeProcess : 'No change process written yet.'}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>QUORUM BY CLASS</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5, mt: 0.75 }}>
                {view.classes.map((entry) => {
                  const color = CLASS_COLOR[entry.name] ?? '#4F46E5';
                  const share = project.quorum[QUORUM_KEY[entry.name] ?? 'routine'];
                  return (
                    <Tooltip key={entry.name} title={entry.meaning} arrow>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(color, 0.04), borderColor: alpha(color, 0.18) }}>
                        <Typography variant="caption" sx={{ color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>{entry.name.toUpperCase()}</Typography>
                        <Typography variant="h6" fontWeight={900} sx={{ color, lineHeight: 1.1, mt: 0.25 }}>{share} percent</Typography>
                        {entry.mandatoryDelay && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Delay {describeDelay(project.constitutionalDelayBlocks)}
                          </Typography>
                        )}
                      </Paper>
                    </Tooltip>
                  );
                })}
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
