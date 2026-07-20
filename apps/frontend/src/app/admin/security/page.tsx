'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha } from '@mui/material/styles';
import ShieldIcon from '@mui/icons-material/Shield';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

type AuthLog = {
  id: string;
  createdAt: string;
  actorEmail: string | null;
  action: string;
  status: string;
  ip: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  success: '#4caf50',
  failure: '#f44336',
  warning: '#ff9800',
};

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit?action=auth.&limit=200')
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const logins = logs.filter(l => l.action === 'auth.login');
  const registers = logs.filter(l => l.action === 'auth.register');
  const failures = logs.filter(l => l.status === 'failure');

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
        <ShieldIcon sx={{ color: '#4caf50', fontSize: 22 }} />
        <Typography variant="h4" fontWeight={900}>Security & Auth Events</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 4 }}>
        Authentication audit events logged by the platform
      </Typography>

      <Grid container spacing={2} mb={4}>
        {[
          { label: 'Total Auth Events', value: loading ? '…' : logs.length.toString(), color: '#448aff', icon: <LockIcon sx={{ fontSize: 20 }} /> },
          { label: 'Logins', value: loading ? '…' : logins.length.toString(), color: '#4caf50', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
          { label: 'Registrations', value: loading ? '…' : registers.length.toString(), color: '#80deea', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
          { label: 'Failed Events', value: loading ? '…' : failures.length.toString(), color: '#f44336', icon: <ErrorOutlineIcon sx={{ fontSize: 20 }} /> },
        ].map(({ label, value, color, icon }) => (
          <Grid key={label} xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, background: alpha(color, 0.05), borderColor: alpha(color, 0.15) }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={0.75}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: 0.7, fontSize: '0.67rem' }}>{label.toUpperCase()}</Typography>
                <Box sx={{ color, opacity: 0.75 }}>{icon}</Box>
              </Stack>
              <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 1.1, fontSize: '1.8rem' }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <Stack sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '0.95rem' }}>Auth Event Log</Typography>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {['Timestamp', 'Actor', 'Action', 'IP', 'Status'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', letterSpacing: 0.7, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : logs.map((log) => {
                const sc = STATUS_COLOR[log.status] ?? 'rgba(255,255,255,0.4)';
                return (
                  <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, ...(log.status === 'failure' && { bgcolor: alpha('#f44336', 0.025) }) }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                        {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem' }} noWrap>{log.actorEmail ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 700 }}>{log.action}</Typography>
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
              {!loading && logs.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                    No auth events yet. Events appear after users log in or register.
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
