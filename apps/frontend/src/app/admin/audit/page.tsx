'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import AssignmentIcon from '@mui/icons-material/Assignment';

type AuditLog = {
  id: string;
  createdAt: string;
  actorEmail: string | null;
  actorType: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  status: string;
  ip: string | null;
  userId: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  success: '#4caf50',
  failure: '#f44336',
  warning: '#ff9800',
};

const ACTOR_TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  user: { bg: alpha('#448aff', 0.1), text: '#448aff' },
  admin: { bg: alpha('#f44336', 0.1), text: '#f44336' },
  system: { bg: alpha('#ce93d8', 0.1), text: '#ce93d8' },
};

function atColor(type: string | null) {
  return ACTOR_TYPE_COLOR[type ?? 'user'] ?? ACTOR_TYPE_COLOR.user;
}

function exportCSV(logs: AuditLog[]) {
  const header = 'Timestamp,Actor,Actor Type,Action,Resource,Status,IP\n';
  const rows = logs.map((l) =>
    `"${l.createdAt}","${l.actorEmail ?? ''}","${l.actorType ?? ''}","${l.action}","${l.resource ?? ''}","${l.status}","${l.ip ?? ''}"`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cerulea-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_OPTIONS = ['all', 'success', 'failure', 'warning'];

export default function AdminAuditPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '500' });
    if (status !== 'all') params.set('status', status);
    fetch(`/api/admin/audit?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return logs;
    return logs.filter(l =>
      (l.actorEmail ?? '').toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.resource ?? '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <AssignmentIcon sx={{ color: '#80deea', fontSize: 22 }} />
            <Typography variant="h4" fontWeight={900}>Platform Audit Logs</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            Platform-level event trail — logins, project creation, billing events
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCSV(filtered)} sx={{ borderRadius: 999, fontWeight: 700, flexShrink: 0 }}>
          Export CSV
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderColor: 'rgba(255,255,255,0.07)' }}>
        <FilterListIcon sx={{ color: 'rgba(255,255,255,0.3)' }} fontSize="small" />
        <TextField
          size="small"
          placeholder="Search actor, action, resource..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>, sx: { fontSize: '0.82rem' } }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.35)' }}>{filtered.length} entries</Typography>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {['Timestamp', 'Actor', 'Type', 'Action', 'Resource', 'IP', 'Status'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', letterSpacing: 0.7, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : filtered.map((log) => {
                const sc = STATUS_COLOR[log.status] ?? 'rgba(255,255,255,0.4)';
                const ac = atColor(log.actorType);
                return (
                  <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, ...(log.status === 'failure' && { bgcolor: alpha('#f44336', 0.025) }) }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                        {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>{log.actorEmail ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={log.actorType ?? 'user'} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: ac.bg, color: ac.text, border: 'none', textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 700 }}>{log.action}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)' }} noWrap>{log.resource ?? log.resourceId ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{log.ip ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sc }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: sc, fontWeight: 700, textTransform: 'capitalize' }}>{log.status}</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                    No audit logs yet. Logs appear after login, registration, and project events.
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
