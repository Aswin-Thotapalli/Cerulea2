'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Tooltip, IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FolderIcon from '@mui/icons-material/Folder';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import AppsIcon from '@mui/icons-material/Apps';

type Project = {
  id: string;
  name: string;
  projectType: string;
  status: string | null;
  userId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  userName: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  active: '#4caf50',
  draft: 'rgba(255,255,255,0.4)',
  deploying: '#448aff',
  failed: '#f44336',
  suspended: '#ff9800',
};

export default function AdminProjectsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    fetch(`/api/admin/projects?${params}`)
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, typeFilter, statusFilter]);

  const dappCount = projects.filter(p => p.projectType === 'dapp').length;
  const chainCount = projects.filter(p => p.projectType === 'blockchain').length;

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <FolderIcon sx={{ color: '#80deea', fontSize: 22 }} />
            <Typography variant="h4" fontWeight={900}>Project Management</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {total} project{total !== 1 ? 's' : ''} across all users
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Chip label={`${dappCount} dApps`} size="small" icon={<AppsIcon sx={{ fontSize: 12 }} />} sx={{ bgcolor: alpha('#448aff', 0.1), color: '#448aff', fontWeight: 700, height: 24 }} />
          <Chip label={`${chainCount} Chains`} size="small" icon={<HexagonOutlinedIcon sx={{ fontSize: 12 }} />} sx={{ bgcolor: alpha('#ce93d8', 0.1), color: '#ce93d8', fontWeight: 700, height: 24 }} />
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderColor: 'rgba(255,255,255,0.07)' }}>
        <FilterListIcon sx={{ color: 'rgba(255,255,255,0.3)' }} fontSize="small" />
        <TextField
          size="small"
          placeholder="Search project name or owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>, sx: { fontSize: '0.82rem' } }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="dapp">dApp</MenuItem>
            <MenuItem value="blockchain">Blockchain</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.35)' }}>{total} projects</Typography>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {['Name', 'Owner', 'Type', 'Status', 'Created', 'Updated', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.45)', fontSize: '0.67rem', letterSpacing: 0.7, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : projects.map((proj) => {
                const statusColor = STATUS_COLOR[proj.status ?? 'draft'] ?? 'rgba(255,255,255,0.4)';
                const isChain = proj.projectType === 'blockchain';
                return (
                  <TableRow key={proj.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{proj.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.67rem' }}>{proj.id.slice(0, 8)}…</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{proj.userName ?? '—'}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem' }}>{proj.userEmail}</Typography>
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
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>{proj.status ?? 'draft'}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                        {new Date(proj.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                        {new Date(proj.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Open in Studio">
                        <IconButton size="small" sx={{ color: '#448aff', '&:hover': { bgcolor: alpha('#448aff', 0.1) } }}>
                          <OpenInNewIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && projects.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>No projects found.</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
