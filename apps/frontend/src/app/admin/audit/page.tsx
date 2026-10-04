'use client';

// apps/frontend/src/app/admin/audit/page.tsx
// The Platform Audit Logs screen of the Cerulea operator.
// Every row comes from /api/admin/audit, which reads the administration
// security read from Cerulea APIs. The Action and Status selects run on the
// server read; the search runs over the rows the screen holds. Export CSV
// writes the rows on the screen to a file.
// Without this screen the operator has no record of what happened.

import { useEffect, useMemo, useState } from 'react';
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

import { FailureLine, HeadCell, NONE, moment, useOperatorRead } from '../_shared/operator';

type AuditLog = {
  id: string;
  createdAt: string;
  actorEmail: string | null;
  actorType: string | null;
  action: string;
  resource: string | null;
  status: string;
  outcome: string;
  ip: string | null;
};

type AuditReply = { logs: AuditLog[]; total: number; areas: string[] };

const STATUS_COLOR: Record<string, string> = {
  success: '#4caf50',
  failure: '#f44336',
};

const ACTOR_TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  user: { bg: alpha('#448aff', 0.1), text: '#448aff' },
  admin: { bg: alpha('#f44336', 0.1), text: '#f44336' },
  system: { bg: alpha('#ce93d8', 0.1), text: '#ce93d8' },
};

function atColor(type: string | null) {
  return ACTOR_TYPE_COLOR[type ?? 'user'] ?? ACTOR_TYPE_COLOR.user;
}

function csvCell(value: string | null): string {
  return `"${(value ?? '').replace(/"/g, '""')}"`;
}

/** Writes the rows on the screen to a file the browser saves. */
function exportCSV(logs: AuditLog[]): string {
  const header = 'Timestamp,Actor,Actor Type,Action,Resource,Status,Outcome,IP\n';
  const rows = logs
    .map((l) =>
      [l.createdAt, l.actorEmail, l.actorType, l.action, l.resource, l.status, l.outcome, l.ip]
        .map(csvCell)
        .join(','),
    )
    .join('\n');
  const text = header + rows;
  if (typeof document !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cerulea-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return text;
}

const STATUS_OPTIONS = ['all', 'success', 'failure'];

/** The plain name of an action area, so workspaces reads as Workspaces. */
function areaLabel(area: string): string {
  const bare = area.split('_').join(' ');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

const COLUMNS = ['Timestamp', 'Actor', 'Type', 'Action', 'Resource', 'IP', 'Status'];

export default function AdminAuditPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [area, setArea] = useState('all');
  const [areas, setAreas] = useState<string[]>([]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ limit: '500' });
    if (status !== 'all') params.set('status', status);
    if (area !== 'all') params.set('action', `${area}.`);
    return `/api/admin/audit?${params}`;
  }, [status, area]);

  const { data, error, loading } = useOperatorRead<AuditReply>(url);
  const logs = useMemo(() => data?.logs ?? [], [data]);
  // The areas of the whole record stay in the select while a filter narrows the rows.
  const known = data?.areas;
  useEffect(() => {
    if (known && known.length > 0) {
      setAreas((held) => Array.from(new Set([...held, ...known])).sort());
    }
  }, [known]);

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
            Platform event trail: sign ins, project creation and billing events
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} disabled={filtered.length === 0} onClick={() => exportCSV(filtered)} sx={{ borderRadius: 999, fontWeight: 700, flexShrink: 0 }}>
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
          inputProps={{ 'aria-label': 'Search actor, action, resource' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>, sx: { fontSize: '0.82rem' } }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="action-filter-label">Action</InputLabel>
          <Select labelId="action-filter-label" value={area} label="Action" onChange={(e) => setArea(e.target.value)}>
            <MenuItem value="all">All Actions</MenuItem>
            {areas.map((entry) => (
              <MenuItem key={entry} value={entry}>{areaLabel(entry)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select labelId="status-filter-label" value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.35)' }}>{filtered.length} entries</Typography>
      </Paper>

      {error && <Box mb={3}><FailureLine message={error} /></Box>}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {COLUMNS.map((h) => <HeadCell key={h} label={h} />)}
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
                        {moment(log.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>{log.actorEmail ?? 'Cerulea'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={log.actorType ?? 'user'} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: ac.bg, color: ac.text, border: 'none', textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 700 }}>{log.action}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)' }} noWrap>{log.resource ?? NONE}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{log.ip ?? 'this machine'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sc }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: sc, fontWeight: 700, textTransform: 'capitalize' }}>
                          {log.status === 'success' ? 'success' : log.outcome}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && !error && filtered.length === 0 && (
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
