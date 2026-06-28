'use client';

import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ArticleIcon from '@mui/icons-material/Article';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

type LogEntry = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  category: string;
  status: 'success' | 'failure' | 'warning';
};

const STUB_LOGS: LogEntry[] = [
  { id: 'log-001', timestamp: '2026-04-17T09:14:32Z', actor: 'aswin@cerulea.app', action: 'API_KEY_CREATED', resource: 'Production Backend', category: 'keys', status: 'success' },
  { id: 'log-002', timestamp: '2026-04-17T08:52:11Z', actor: 'system', action: 'SNAPSHOT_CREATED', resource: 'CeruleaChain Mainnet / #4182034', category: 'snapshot', status: 'success' },
  { id: 'log-003', timestamp: '2026-04-17T07:30:00Z', actor: 'aswin@cerulea.app', action: 'PROJECT_DEPLOYED', resource: 'VoteApp Devnet', category: 'deployment', status: 'success' },
  { id: 'log-004', timestamp: '2026-04-16T22:18:44Z', actor: 'ci-pipeline', action: 'DEPLOY_FAILED', resource: 'SupplyChain Staging', category: 'deployment', status: 'failure' },
  { id: 'log-005', timestamp: '2026-04-16T18:05:00Z', actor: 'aswin@cerulea.app', action: 'PROPOSAL_VOTED', resource: 'prop-002', category: 'governance', status: 'success' },
  { id: 'log-006', timestamp: '2026-04-16T15:43:21Z', actor: 'aswin@cerulea.app', action: 'NODE_KEY_ROTATED', resource: 'node-val-02', category: 'nodes', status: 'success' },
  { id: 'log-007', timestamp: '2026-04-16T11:22:08Z', actor: 'system', action: 'LOGIN_ATTEMPT_BLOCKED', resource: 'auth', category: 'auth', status: 'failure' },
  { id: 'log-008', timestamp: '2026-04-15T20:00:00Z', actor: 'aswin@cerulea.app', action: 'INTEGRATION_UPDATED', resource: 'Alchemy / mainnet', category: 'integrations', status: 'success' },
  { id: 'log-009', timestamp: '2026-04-15T14:33:50Z', actor: 'aswin@cerulea.app', action: 'API_KEY_REVOKED', resource: 'Old Test Key', category: 'keys', status: 'warning' },
  { id: 'log-010', timestamp: '2026-04-15T10:10:10Z', actor: 'system', action: 'AUTO_SNAPSHOT_SCHEDULED', resource: 'CeruleaChain Mainnet', category: 'snapshot', status: 'success' },
];

const CATEGORIES = ['all', 'keys', 'snapshot', 'deployment', 'governance', 'nodes', 'auth', 'integrations'];

const CAT_COLOR: Record<string, string> = {
  keys: '#4F46E5', snapshot: '#06b6d4', deployment: '#10b981',
  governance: '#8b5cf6', nodes: '#f59e0b', auth: '#ef4444', integrations: '#3b82f6',
};

const STATUS_META = {
  success: { color: '#10b981', label: 'Success', icon: <CheckCircleIcon sx={{ fontSize: 13 }} /> },
  failure: { color: '#ef4444', label: 'Failed', icon: <ErrorIcon sx={{ fontSize: 13 }} /> },
  warning: { color: '#f59e0b', label: 'Warning', icon: <WarningAmberIcon sx={{ fontSize: 13 }} /> },
};

function exportCSV(logs: LogEntry[]) {
  const header = 'Timestamp,Actor,Action,Resource,Category,Status\n';
  const rows = logs.map((l) => `"${l.timestamp}","${l.actor}","${l.action}","${l.resource}","${l.category}","${l.status}"`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cerulea-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => STUB_LOGS.filter((l) => {
    const matchSearch = l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || l.category === category;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  }), [search, category, statusFilter]);

  const todayCount = STUB_LOGS.filter((l) => l.timestamp.startsWith('2026-04-17')).length;
  const failureCount = STUB_LOGS.filter((l) => l.status === 'failure').length;
  const warningCount = STUB_LOGS.filter((l) => l.status === 'warning').length;

  const stats = [
    { label: 'Total Events', value: STUB_LOGS.length, color: '#4F46E5' },
    { label: 'Today', value: todayCount, color: '#06b6d4' },
    { label: 'Failures', value: failureCount, color: '#ef4444' },
    { label: 'Warnings', value: warningCount, color: '#f59e0b' },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1200 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>
            SECURITY & COMPLIANCE
          </Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>
            Audit Logs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Every action, deployment, and system event across your account — all in one place.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => exportCSV(filtered)}
          sx={{ borderRadius: 999, fontWeight: 700, borderColor: alpha(theme.palette.primary.main, 0.4) }}
        >
          Export CSV
        </Button>
      </Stack>

      {/* Stat strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        {stats.map((s) => (
          <Paper key={s.label} variant="outlined" sx={{
            p: 2, borderRadius: 2.5,
            bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18),
          }}>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>
              {s.label.toUpperCase()}
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5 }}>
              {s.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Category + status filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center" mb={2}>
          {CATEGORIES.map((c) => {
            const isActive = category === c;
            const color = CAT_COLOR[c] || '#4F46E5';
            const enabledCount = c === 'all' ? STUB_LOGS.length : STUB_LOGS.filter((l) => l.category === c).length;
            return (
              <Box key={c} onClick={() => setCategory(c)} sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.6, borderRadius: 1.5, cursor: 'pointer',
                bgcolor: isActive ? alpha(color, 0.12) : 'transparent',
                color: isActive ? color : 'text.secondary',
                border: `1px solid ${isActive ? alpha(color, 0.3) : alpha(theme.palette.divider, 0.8)}`,
                fontWeight: isActive ? 700 : 500, fontSize: '0.75rem',
                transition: 'all 0.12s',
                '&:hover': { bgcolor: alpha(color, 0.08), color: color },
              }}>
                <span style={{ textTransform: 'capitalize' }}>{c === 'all' ? 'All' : c}</span>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: isActive ? color : alpha(theme.palette.text.disabled, 0.2), color: isActive ? '#fff' : 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800 }}>
                  {enabledCount}
                </Box>
              </Box>
            );
          })}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Search actor, action, resource…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          {(['all', 'success', 'failure', 'warning'] as const).map((s) => {
            const isActive = statusFilter === s;
            const meta = s === 'all' ? { color: '#4F46E5', label: 'All Statuses' } : STATUS_META[s];
            return (
              <Box key={s} onClick={() => setStatusFilter(s)} sx={{
                px: 1.5, py: 0.6, borderRadius: 1.5, cursor: 'pointer', fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
                color: isActive ? meta.color : 'text.secondary',
                bgcolor: isActive ? alpha(meta.color, 0.1) : 'transparent',
                border: `1px solid ${isActive ? alpha(meta.color, 0.25) : 'transparent'}`,
                transition: 'all 0.12s', '&:hover': { bgcolor: alpha(meta.color, 0.07) },
              }}>
                {s === 'all' ? 'All' : meta.label}
              </Box>
            );
          })}
          <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto', fontWeight: 600 }}>
            {filtered.length} entries
          </Typography>
        </Stack>
      </Paper>

      {/* Log Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ArticleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>
              EVENT LOG
            </Typography>
          </Stack>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                {['Timestamp', 'Actor', 'Action', 'Resource', 'Category', 'Status'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.65rem', letterSpacing: 0.8, py: 1.5 }}>
                    {h.toUpperCase()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((log) => {
                const statusMeta = STATUS_META[log.status];
                const catColor = CAT_COLOR[log.category] || '#4F46E5';
                return (
                  <TableRow key={log.id} sx={{
                    '&:hover': { bgcolor: alpha(statusMeta.color, 0.04) },
                    borderLeft: `3px solid ${alpha(statusMeta.color, 0.5)}`,
                  }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.72rem' }}>
                        {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160, fontSize: '0.8rem' }}>
                        {log.actor}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary', fontSize: '0.78rem' }}>
                        {log.action}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200, fontSize: '0.8rem' }}>
                        {log.resource}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.4, borderRadius: 1, bgcolor: alpha(catColor, 0.1), color: catColor, fontSize: '0.62rem', fontWeight: 700, textTransform: 'capitalize' }}>
                        {log.category}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: statusMeta.color }}>
                        {statusMeta.icon}
                        <Typography variant="caption" fontWeight={700} sx={{ color: statusMeta.color, fontSize: '0.72rem' }}>
                          {statusMeta.label}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography variant="body2" color="text.secondary">No log entries match your filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
