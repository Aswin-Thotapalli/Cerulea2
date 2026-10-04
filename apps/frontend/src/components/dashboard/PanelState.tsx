'use client';

// apps/frontend/src/components/dashboard/PanelState.tsx
// The three states every Dashboard panel passes through.
// A panel is reading, a panel holds nothing yet, or a panel met a problem.
// Each state is a real component naming what happens next.
// Without these states a panel would show a blank area and explain nothing.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';

export type PanelFailure = { message: string; fix: string };

export type PanelReading<T> = {
  data: T | null;
  loading: boolean;
  failure: PanelFailure | null;
  readAgain: () => void;
};

/** Turns any failure into the message and the fix a panel shows. */
export function describeFailure(cause: unknown): PanelFailure {
  if (cause instanceof StudioRouteError) {
    return { message: cause.message.replace(` ${cause.fix}`, ''), fix: cause.fix };
  }
  return {
    message: cause instanceof Error ? cause.message : String(cause),
    fix: 'Open the panel again. Report the problem to the Cerulea operator when it repeats.',
  };
}

/**
 * Reads one Studio route for a panel.
 * Every panel issues a real request and renders what the request returned.
 */
export function usePanelData<T>(url: string, refreshMs?: number): PanelReading<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<PanelFailure | null>(null);

  const read = useCallback(async () => {
    try {
      setData(await api<T>(url));
      setFailure(null);
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    setLoading(true);
    void read();
    if (!refreshMs) return;
    const timer = setInterval(() => void read(), refreshMs);
    return () => clearInterval(timer);
  }, [read, refreshMs]);

  const readAgain = useCallback(() => {
    setLoading(true);
    void read();
  }, [read]);

  return { data, loading, failure, readAgain };
}

export function PanelLoading({ subject }: { subject: string }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
      <Stack alignItems="center" spacing={2}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Cerulea is reading {subject}.
        </Typography>
      </Stack>
    </Box>
  );
}

export function PanelFailureNotice({
  failure,
  onReadAgain,
}: {
  failure: PanelFailure;
  onReadAgain: () => void;
}) {
  return (
    <Alert
      severity="error"
      sx={{ my: 2 }}
      action={
        <Button size="small" onClick={onReadAgain}>
          Read again
        </Button>
      }
    >
      <AlertTitle>{failure.message}</AlertTitle>
      {failure.fix}
    </Alert>
  );
}

export function PanelEmpty({
  heading,
  explanation,
  action,
}: {
  heading: string;
  explanation: string;
  action?: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
        {heading}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 3 : 0 }}>
        {explanation}
      </Typography>
      {action}
    </Paper>
  );
}

/** Renders the reading, the failure or the content of one panel. */
export function PanelBody<T>({
  reading,
  subject,
  children,
}: {
  reading: PanelReading<T>;
  subject: string;
  children: (data: T) => React.ReactNode;
}) {
  if (reading.loading && reading.data === null) return <PanelLoading subject={subject} />;
  if (reading.failure && reading.data === null) {
    return <PanelFailureNotice failure={reading.failure} onReadAgain={reading.readAgain} />;
  }
  if (reading.data === null) return <PanelLoading subject={subject} />;
  return (
    <>
      {reading.failure && (
        <PanelFailureNotice failure={reading.failure} onReadAgain={reading.readAgain} />
      )}
      {children(reading.data)}
    </>
  );
}
