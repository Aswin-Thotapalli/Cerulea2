'use client';

// apps/frontend/src/app/dashboard/audit/page.tsx
// The Audit Logs screen.
// Cerulea records the actor, the action, the subject and the outcome of every
// change inside a workspace. A refusal is recorded with the same weight as an
// allowed action. This screen reads that record across every workspace the
// account may review.
// Without this screen a review has nothing to read.

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Button, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ArticleIcon from '@mui/icons-material/Article';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { api } from '@/lib/apiClient';
import { describeAction } from '@/components/dashboard/wording';

/** One entry as the audit-logs route answers it. */
type RealLog = {
  id: string;
  createdAt: string;
  actorEmail: string | null;
  actorName: string | null;
  actorType: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  status: string;
  outcome: string;
  ip: string | null;
  workspaceName: string | null;
};

/** One row as the table shows it. */
type LogEntry = {
  id: string;
  timestamp: string;
  actor: string;
  actorDetail: string;
  action: string;
  actionText: string;
  resource: string;
  category: string;
  outcome: string;
  workspace: string;
};

/** The three outcomes Cerulea records. */
const OUTCOMES = ['allowed', 'denied', 'failed'] as const;

const STATUS_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  allowed: { color: '#10b981', label: 'Allowed', icon: <CheckCircleIcon sx={{ fontSize: 13 }} /> },
  denied: { color: '#f59e0b', label: 'Denied', icon: <WarningAmberIcon sx={{ fontSize: 13 }} /> },
  failed: { color: '#ef4444', label: 'Failed', icon: <ErrorIcon sx={{ fontSize: 13 }} /> },
};

/** The production palette, handed to the real action groups in order of appearance. */
const CATEGORY_PALETTE = ['#4F46E5', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

/** The action Cerulea records when an account signs in. */
const SIGN_IN_ACTION = 'account.signed_in';

function statusOf(outcome: string) {
  return STATUS_META[outcome] ?? { color: '#6b7280', label: outcome, icon: <ArticleIcon sx={{ fontSize: 13 }} /> };
}

/** Builds the file a reviewer downloads, one row per entry on screen. */
function exportCSV(logs: LogEntry[]) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = 'Timestamp,Actor,Action,Resource,Category,Status\n';
  const rows = logs
    .map((l) => [l.timestamp, l.actor, l.action, l.resource, l.category, l.outcome].map(quote).join(','))
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cerulea-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

/** Turns one route entry into the row the table shows. */
function toEntry(l: RealLog): LogEntry {
  const actor = l.actorName && l.actorName.length > 0 ? l.actorName : l.actorEmail && l.actorEmail.length > 0 ? l.actorEmail : 'Cerulea';
  const actorDetail = l.actorName && l.actorEmail ? l.actorEmail : l.actorType === 'system' ? 'the platform itself' : '';
  return {
    id: l.id,
    timestamp: l.createdAt,
    actor,
    actorDetail,
    action: l.action,
    actionText: describeAction(l.action),
    resource: [l.resource ?? '', l.resourceId ?? ''].filter((part) => part.length > 0).join(' '),
    category: l.action.split('.')[0] || 'other',
    outcome: l.outcome,
    workspace: l.workspaceName ?? '',
  };
}

export default function AuditPage() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [realLogs, setRealLogs] = useState<RealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api<{ logs: RealLog[]; total: number }>('/api/dashboard/audit-logs');
      setRealLogs(data.logs ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Cerulea could not read the audit record.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void read(); }, [read]);

  const logs: LogEntry[] = useMemo(() => realLogs.map(toEntry), [realLogs]);

  // The category list comes from the actions Cerulea really recorded.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  }, [logs]);

  const categoryColor = useMemo(() => {
    const map: Record<string, string> = { all: '#4F46E5' };
    categories.forEach((c, i) => { map[c.name] = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]; });
    return map;
  }, [categories]);

  const filtered = useMemo(() => logs.filter((l) => {
    const needle = search.trim().toLowerCase();
    const matchSearch = !needle ||
      l.actor.toLowerCase().includes(needle) ||
      l.actorDetail.toLowerCase().includes(needle) ||
      l.action.toLowerCase().includes(needle) ||
      l.actionText.toLowerCase().includes(needle) ||
      l.resource.toLowerCase().includes(needle) ||
      l.workspace.toLowerCase().includes(needle);
    const matchStatus = statusFilter === 'all' || l.outcome === statusFilter;
    const matchCategory = category === 'all' || l.category === category;
    return matchSearch && matchStatus && matchCategory;
  }), [logs, search, statusFilter, category]);

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = logs.filter((l) => l.timestamp.startsWith(today)).length;
  const failureCount = logs.filter((l) => l.outcome !== 'allowed').length;
  const signInCount = logs.filter((l) => l.action === SIGN_IN_ACTION).length;

  const stats = [
    { label: 'Total Events', value: logs.length, color: '#4F46E5' },
    { label: 'Today', value: todayCount, color: '#06b6d4' },
    { label: 'Failures', value: failureCount, color: '#ef4444' },
    { label: 'Sign ins', value: signInCount, color: '#10b981' },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
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
            Every action, deployment and platform event across our account, in one place.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
          sx={{ fontWeight: 700, borderColor: alpha(theme.palette.primary.main, 0.4) }}
        >
          Export CSV
        </Button>
      </Stack>

      {/* Stat strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        {stats.map((s) => (
          <Paper key={s.label} variant="outlined" data-testid={`stat-${s.label}`} sx={{
            p: 2, borderRadius: 2.5,
            bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18),
          }}>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>
              {s.label.toUpperCase()}
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5 }}>
              {loading ? '…' : s.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Category + status filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center" mb={2} useFlexGap>
          {[{ name: 'all', count: logs.length }, ...categories].map((c) => {
            const isActive = category === c.name;
            const color = categoryColor[c.name] || '#4F46E5';
            return (
              <Box key={c.name} role="button" aria-pressed={isActive} aria-label={`Category ${c.name === 'all' ? 'all' : c.name.split('_').join(' ')}, ${c.count} events`} onClick={() => setCategory(c.name)} sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.6, borderRadius: 1.5, cursor: 'pointer',
                bgcolor: isActive ? alpha(color, 0.12) : 'transparent',
                color: isActive ? color : 'text.secondary',
                border: `1px solid ${isActive ? alpha(color, 0.3) : alpha(theme.palette.divider, 0.8)}`,
                fontWeight: isActive ? 700 : 500, fontSize: '0.75rem',
                transition: 'all 0.12s',
                '&:hover': { bgcolor: alpha(color, 0.08), color: color },
              }}>
                <span style={{ textTransform: 'capitalize' }}>{c.name === 'all' ? 'All' : c.name.split('_').join(' ')}</span>
                <Box sx={{ minWidth: 16, height: 16, px: 0.4, borderRadius: 8, bgcolor: isActive ? color : alpha(theme.palette.text.disabled, 0.2), color: isActive ? '#fff' : 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800 }}>
                  {c.count}
                </Box>
              </Box>
            );
          })}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Search actor, action, resource…"
            inputProps={{ 'aria-label': 'Search' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          {(['all', ...OUTCOMES] as const).map((s) => {
            const isActive = statusFilter === s;
            const meta = s === 'all' ? { color: '#4F46E5', label: 'All Statuses' } : STATUS_META[s];
            return (
              <Box key={s} role="button" aria-pressed={isActive} aria-label={`Status ${s === 'all' ? 'all' : meta.label}`} onClick={() => setStatusFilter(s)} sx={{
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

        {loading && (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }} role="status" aria-label="Reading the audit record">
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && loadError && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button size="small" onClick={() => void read()}>Retry</Button>}>
              {loadError}
            </Alert>
          </Box>
        )}

        {!loading && !loadError && (
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
                  const statusMeta = statusOf(log.outcome);
                  const catColor = categoryColor[log.category] || '#4F46E5';
                  return (
                    <TableRow key={log.id} sx={{
                      '&:hover': { bgcolor: alpha(statusMeta.color, 0.04) },
                      borderLeft: `3px solid ${alpha(statusMeta.color, 0.5)}`,
                    }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Tooltip title={log.workspace ? `${new Date(log.timestamp).toLocaleString()} in ${log.workspace}` : new Date(log.timestamp).toLocaleString()} arrow>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.72rem' }}>
                            {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160, fontSize: '0.8rem' }}>
                          {log.actor}
                        </Typography>
                        {log.actorDetail && (
                          <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', maxWidth: 160, fontSize: '0.65rem' }}>
                            {log.actorDetail}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', fontSize: '0.8rem' }}>
                          {log.actionText}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: '0.65rem' }}>
                          {log.action}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Tooltip title={log.resource} arrow>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 220, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {log.resource}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.4, borderRadius: 1, bgcolor: alpha(catColor, 0.1), color: catColor, fontSize: '0.62rem', fontWeight: 700, textTransform: 'capitalize' }}>
                          {log.category.split('_').join(' ')}
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
                      <Typography variant="body2" color="text.secondary">
                        {logs.length === 0 ? 'No event recorded yet.' : 'No log entries match the filters.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
