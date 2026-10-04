'use client';

// apps/frontend/src/app/admin/_shared/operator.tsx
// The pieces every operator screen shares: one read hook over a Studio route,
// the failure line in the production look, and the date formats.
// A screen shows the Cerulea failure sentence whenever a read fails, so the
// operator reads the fix rather than an empty table.
// Without this module each screen would repeat the same fetch and the same line.

import { useEffect, useState } from 'react';
import { Box, Paper, TableCell, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export type OperatorRead<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

/**
 * Reads one Studio route and keeps the answer, the failure sentence and the
 * loading state. A failure body carries `error` as one sentence with the fix.
 */
export function useOperatorRead<T>(url: string): OperatorRead<T> {
  const [state, setState] = useState<OperatorRead<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    let live = true;
    setState((held) => ({ ...held, loading: true, error: null }));
    fetch(url)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!live) return;
        if (!response.ok || body === null) {
          const sentence =
            body && typeof body.error === 'string'
              ? body.error
              : `The read at ${url} answered ${response.status}. Open the screen again.`;
          setState({ data: null, error: sentence, loading: false });
          return;
        }
        setState({ data: body as T, error: null, loading: false });
      })
      .catch(() => {
        if (!live) return;
        setState({
          data: null,
          error: 'Studio did not answer. Check that Studio and Cerulea APIs are running, then open the screen again.',
          loading: false,
        });
      });
    return () => {
      live = false;
    };
  }, [url]);

  return state;
}

/** The failure line a screen shows in place of its panels. */
export function FailureLine({ message }: { message: string }) {
  return (
    <Paper
      variant="outlined"
      role="alert"
      sx={{ p: 2.5, borderRadius: 3, borderColor: alpha('#f44336', 0.3), background: alpha('#f44336', 0.05), display: 'flex', gap: 1.5, alignItems: 'flex-start' }}
    >
      <ErrorOutlineIcon sx={{ color: '#f44336', fontSize: 18, mt: 0.2 }} />
      <Box>
        <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 700, fontSize: '0.82rem' }}>
          This screen could not read Cerulea APIs
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{message}</Typography>
      </Box>
    </Paper>
  );
}

/** The production column heading cell. */
export function HeadCell({ label, align }: { label: string; align?: 'left' | 'right' }) {
  return (
    <TableCell align={align} sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.45)', fontSize: '0.67rem', letterSpacing: 0.7, py: 1.5 }}>
      {label.toUpperCase()}
    </TableCell>
  );
}

/** 04 Oct 26, as the production tables print a date. */
export function shortDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

/** 04 Oct 2026, as the production cards print a date. */
export function longDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** 04 Oct, 06:12:30, as the production event tables print a moment. */
export function moment(value: string): string {
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** The plain word a cell shows when the record holds no value. */
export const NONE = 'none';
