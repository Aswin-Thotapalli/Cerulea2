'use client';

// apps/frontend/src/app/admin/security/page.tsx
// The Security & Auth Events screen of the Cerulea operator.
// Every event and every session comes from /api/admin/audit, which reads the
// administration security read from Cerulea APIs. The sign in family covers
// the account and session actions. A refusal carries the same weight as an
// allowed action, so the refusal filter sits beside the table.
// Without this screen a refused attempt would pass unseen.

import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha } from '@mui/material/styles';
import ShieldIcon from '@mui/icons-material/Shield';
import LockIcon from '@mui/icons-material/Lock';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import { FailureLine, HeadCell, NONE, moment, useOperatorRead } from '../_shared/operator';

type AuthLog = {
  id: string;
  createdAt: string;
  actorEmail: string | null;
  action: string;
  status: string;
  outcome: string;
  ip: string | null;
};

type SecuritySession = {
  sessionId: string;
  accountId: string;
  device: string;
  networkAddress: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  rotationCount: number;
};

type AuditReply = { logs: AuthLog[]; total: number; sessions?: SecuritySession[] };

const STATUS_COLOR: Record<string, string> = {
  success: '#4caf50',
  failure: '#f44336',
};

/** The action Cerulea records for a sign in and for a registration. */
const SIGNED_IN = 'account.signed_in';
const REGISTERED = 'account.registered';

const EVENT_COLUMNS = ['Timestamp', 'Actor', 'Action', 'IP', 'Status'];

export default function AdminSecurityPage() {
  const { data, error, loading } = useOperatorRead<AuditReply>('/api/admin/audit?action=auth.&limit=500&sessions=1');
  const [show, setShow] = useState<'all' | 'refused' | 'allowed'>('all');

  const logs = useMemo(() => data?.logs ?? [], [data]);
  const sessions = data?.sessions ?? [];
  const logins = logs.filter((l) => l.action === SIGNED_IN);
  const registers = logs.filter((l) => l.action === REGISTERED);
  const failures = logs.filter((l) => l.status === 'failure');

  const visible = useMemo(() => {
    if (show === 'refused') return logs.filter((l) => l.status === 'failure');
    if (show === 'allowed') return logs.filter((l) => l.status === 'success');
    return logs;
  }, [logs, show]);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
        <ShieldIcon sx={{ color: '#4caf50', fontSize: 22 }} />
        <Typography variant="h4" fontWeight={900}>Security & Auth Events</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 4 }}>
        Authentication audit events logged by the platform
      </Typography>

      {error && <Box mb={3}><FailureLine message={error} /></Box>}

      <Grid container spacing={2} mb={4}>
        {[
          { label: 'Total Auth Events', value: loading ? '…' : logs.length.toString(), color: '#448aff', icon: <LockIcon sx={{ fontSize: 20 }} /> },
          { label: 'Logins', value: loading ? '…' : logins.length.toString(), color: '#4caf50', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
          { label: 'Registrations', value: loading ? '…' : registers.length.toString(), color: '#80deea', icon: <PersonAddIcon sx={{ fontSize: 20 }} /> },
          { label: 'Failed Events', value: loading ? '…' : failures.length.toString(), color: '#f44336', icon: <ErrorOutlineIcon sx={{ fontSize: 20 }} /> },
        ].map(({ label, value, color, icon }) => (
          <Grid key={label} xs={12} sm={6} md={3}>
            <Paper variant="outlined" data-testid="security-card" sx={{ p: 2.5, borderRadius: 3, background: alpha(color, 0.05), borderColor: alpha(color, 0.15) }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={0.75}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: 0.7, fontSize: '0.67rem' }}>{label.toUpperCase()}</Typography>
                <Box sx={{ color, opacity: 0.75 }}>{icon}</Box>
              </Stack>
              <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 1.1, fontSize: '1.8rem' }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)', mb: 4 }}>
        <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }} spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '0.95rem' }}>Auth Event Log</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
              Cerulea records a refusal with the same weight as an allowed action.
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="show-filter-label">Show</InputLabel>
            <Select labelId="show-filter-label" value={show} label="Show" onChange={(e) => setShow(e.target.value as typeof show)}>
              <MenuItem value="all">Every event</MenuItem>
              <MenuItem value="refused">Refusals only</MenuItem>
              <MenuItem value="allowed">Allowed only</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>{visible.length} shown</Typography>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {EVENT_COLUMNS.map((h) => <HeadCell key={h} label={h} />)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : visible.map((log) => {
                const sc = STATUS_COLOR[log.status] ?? 'rgba(255,255,255,0.4)';
                return (
                  <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, ...(log.status === 'failure' && { bgcolor: alpha('#f44336', 0.025) }) }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                        {moment(log.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem' }} noWrap>{log.actorEmail ?? 'Cerulea'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 700 }}>{log.action}</Typography>
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
              {!loading && !error && visible.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                    {show === 'refused'
                      ? 'Cerulea refused nothing in this window.'
                      : 'No auth events yet. Events appear after users log in or register.'}
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Sessions */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <Stack sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '0.95rem' }}>Sessions</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
            Every session binds to the device and the network it opened from. A rotation count above zero means the pair rotated.
          </Typography>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                <HeadCell label="Device" />
                <HeadCell label="From" />
                <HeadCell label="Opened" />
                <HeadCell label="Ends" />
                <HeadCell label="Rotations" align="right" />
                <HeadCell label="State" />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : sessions.map((session) => (
                <TableRow key={session.sessionId} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell><Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{session.device || NONE}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{session.networkAddress || 'this machine'}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{moment(session.issuedAt)}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{moment(session.expiresAt)}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{session.rotationCount}</Typography></TableCell>
                  <TableCell>
                    <Chip size="small" label={session.revokedAt === null ? 'Open' : 'Closed'} sx={{ height: 20, fontSize: '0.63rem', fontWeight: 700, bgcolor: session.revokedAt === null ? alpha('#4caf50', 0.12) : alpha('#ffffff', 0.07), color: session.revokedAt === null ? '#4caf50' : 'rgba(255,255,255,0.45)', border: 'none' }} />
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !error && sessions.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>No session yet. A session appears when a person signs in.</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
