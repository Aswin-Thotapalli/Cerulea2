'use client';

// apps/frontend/src/app/admin/projects/page.tsx
// The Project Management screen of the Cerulea operator.
// Every project row comes from /api/admin/projects and every workspace row
// from /api/admin/workspaces. Both read the administration reads from Cerulea
// APIs. The workspace a project lives in fixes its type. The owner shows once
// the project rows carry it; until then the workspace name stands in. No
// action opens a Blueprint, because the operator reads no customer content.
// Without this screen the operator cannot size the platform.

import { Suspense, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSearchParams } from 'next/navigation';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import FolderIcon from '@mui/icons-material/Folder';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import AppsIcon from '@mui/icons-material/Apps';

import { FailureLine, HeadCell, shortDate, useOperatorRead } from '../_shared/operator';

type Project = {
  id: string;
  name: string;
  projectType: 'dapp' | 'blockchain' | null;
  status: string;
  state: string;
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectsReply = {
  projects: Project[];
  total: number;
  counts: { projects: number; dapp: number; blockchain: number };
  statuses: string[];
};

type Workspace = {
  workspaceId: string;
  name: string;
  application: string;
  tier: string;
  state: string;
  members: number;
  projects: number;
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  active: '#4caf50',
  draft: 'rgba(255,255,255,0.4)',
  deploying: '#448aff',
  failed: '#f44336',
  suspended: '#ff9800',
  closed: 'rgba(255,255,255,0.4)',
};

/** The plain name of a plan id, so plan_starter reads as Starter. */
function planLabel(plan: string): string {
  const bare = plan.replace(/^plan_/, '').split('_').join(' ');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

function capital(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const PROJECT_COLUMNS = ['Name', 'Owner', 'Type', 'Status', 'Created', 'Updated'];

function ProjectsScreen() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params?.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const url = useMemo(() => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (typeFilter !== 'all') query.set('type', typeFilter);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    const tail = query.toString();
    return `/api/admin/projects${tail ? `?${tail}` : ''}`;
  }, [search, typeFilter, statusFilter]);

  const { data, error, loading } = useOperatorRead<ProjectsReply>(url);
  const spaces = useOperatorRead<{ workspaces: Workspace[] }>('/api/admin/workspaces');

  const projects = data?.projects ?? [];
  const total = data?.total ?? 0;
  const all = data?.counts.projects ?? 0;
  const statuses = data?.statuses ?? [];

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <FolderIcon sx={{ color: '#80deea', fontSize: 22 }} />
            <Typography variant="h4" fontWeight={900}>Project Management</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {all} project{all !== 1 ? 's' : ''} across all users
          </Typography>
        </Box>
        {data && (
          <Stack direction="row" spacing={1.5}>
            <Chip label={`${data.counts.dapp} dApps`} size="small" icon={<AppsIcon sx={{ fontSize: 12 }} />} sx={{ bgcolor: alpha('#448aff', 0.1), color: '#448aff', fontWeight: 700, height: 24 }} />
            <Chip label={`${data.counts.blockchain} Chains`} size="small" icon={<HexagonOutlinedIcon sx={{ fontSize: 12 }} />} sx={{ bgcolor: alpha('#ce93d8', 0.1), color: '#ce93d8', fontWeight: 700, height: 24 }} />
          </Stack>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderColor: 'rgba(255,255,255,0.07)' }}>
        <FilterListIcon sx={{ color: 'rgba(255,255,255,0.3)' }} fontSize="small" />
        <TextField
          size="small"
          placeholder="Search project name or owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ 'aria-label': 'Search project name or owner' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>, sx: { fontSize: '0.82rem' } }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="type-filter-label">Type</InputLabel>
          <Select labelId="type-filter-label" value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="dapp">dApp</MenuItem>
            <MenuItem value="blockchain">Blockchain</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select labelId="status-filter-label" value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            {Array.from(new Set(['active', 'draft', ...statuses, statusFilter])).filter((s) => s !== 'all').map((s) => (
              <MenuItem key={s} value={s}>{capital(s)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.35)' }}>{total} project{total !== 1 ? 's' : ''}</Typography>
      </Paper>

      {error && <Box mb={3}><FailureLine message={error} /></Box>}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)', mb: 4 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {PROJECT_COLUMNS.map((h) => <HeadCell key={h} label={h} />)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={PROJECT_COLUMNS.length} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : projects.map((proj) => {
                const statusColor = STATUS_COLOR[proj.status] ?? 'rgba(255,255,255,0.4)';
                const isChain = proj.projectType === 'blockchain';
                return (
                  <TableRow key={proj.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{proj.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.67rem' }}>{proj.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{proj.ownerName ?? proj.ownerEmail ?? proj.workspaceName}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem' }}>
                        {proj.ownerEmail ? proj.ownerEmail : `workspace ${proj.workspaceName}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isChain ? 'Blockchain' : 'dApp'}
                        size="small"
                        icon={isChain ? <HexagonOutlinedIcon sx={{ fontSize: '0.65rem !important' }} /> : <AppsIcon sx={{ fontSize: '0.65rem !important' }} />}
                        sx={{ height: 20, fontSize: '0.63rem', fontWeight: 700, bgcolor: isChain ? alpha('#ce93d8', 0.1) : alpha('#448aff', 0.1), color: isChain ? '#ce93d8' : '#448aff', border: 'none' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusColor }} />
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>{proj.status}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                        {shortDate(proj.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                        {shortDate(proj.updatedAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && !error && projects.length === 0 && (
                <TableRow><TableCell colSpan={PROJECT_COLUMNS.length} align="center" sx={{ py: 6 }}><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>No projects found.</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Workspaces */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <Stack sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '0.95rem' }}>Workspaces</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
            One workspace holds the projects a team builds together. The operator reads the counts and never the content.
          </Typography>
        </Stack>
        {spaces.error && <Box p={2}><FailureLine message={spaces.error} /></Box>}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                <HeadCell label="Workspace" />
                <HeadCell label="Application" />
                <HeadCell label="Plan" />
                <HeadCell label="Members" align="right" />
                <HeadCell label="Projects" align="right" />
                <HeadCell label="Opened" />
                <HeadCell label="State" />
              </TableRow>
            </TableHead>
            <TableBody>
              {spaces.loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : (spaces.data?.workspaces ?? []).map((entry) => (
                <TableRow key={entry.workspaceId} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{entry.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.67rem' }}>{entry.workspaceId}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{entry.application}</Typography></TableCell>
                  <TableCell>
                    <Chip label={planLabel(entry.tier)} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha('#448aff', 0.12), color: '#448aff', border: 'none' }} />
                  </TableCell>
                  <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{entry.members}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{entry.projects}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{shortDate(entry.createdAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.78rem', color: entry.state === 'active' ? '#4caf50' : 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'capitalize' }}>{entry.state}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {!spaces.loading && !spaces.error && (spaces.data?.workspaces ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>No workspace yet. A workspace opens the first time a person signs in and starts work.</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default function AdminProjectsPage() {
  return (
    <Suspense fallback={<Box display="flex" justifyContent="center" py={8}><CircularProgress size={32} /></Box>}>
      <ProjectsScreen />
    </Suspense>
  );
}
