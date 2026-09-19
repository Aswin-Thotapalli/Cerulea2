'use client';

// apps/frontend/src/components/studio/steps6/SimulationReport.tsx
// Simulation against generated traffic.
// The chosen model runs against generated traffic before anybody commits.
// Cerulea sends transactions of every class to the Blockchain and reports what
// it measured. No figure here is invented.
// Without the run a person would deploy on a guess.

import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';

export type SimulationClassReport = {
  transactionClass: string;
  submitted: number;
  included: number;
  irreversible: number;
  meanBlocksToInclusion: number;
  meanBlocksToIrreversible: number;
  meanSecondsToInclusion: number;
  meanSecondsToIrreversible: number;
  thresholdPercent: number;
  mandatoryDelay: boolean;
  thresholdHeld: boolean;
  statement: string;
};

export type SimulationReportView = {
  projectId: string;
  version: number;
  chainKind: 'local' | 'live';
  startedAt: string;
  finishedAt: string;
  elapsedSeconds: number;
  blocksProduced: number;
  totalSubmitted: number;
  totalIncluded: number;
  transactionsPerSecond: number;
  classes: SimulationClassReport[];
  headline: string;
};

/** States where the run happened, so a reader knows what the figures mean. */
export function describeSource(kind: 'local' | 'live'): string {
  return kind === 'local'
    ? 'The run reached the Blockchain running on this machine. The figures come from its blocks.'
    : 'The run reached the node this deployment is joined to. The figures come from its blocks.';
}

export default function SimulationReport({
  projectId,
  report,
  onReport,
}: {
  projectId: string;
  report: SimulationReportView | null;
  onReport: (next: SimulationReportView) => void;
}) {
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const run = async () => {
    setWorking(true);
    setFailure(null);
    try {
      onReport(
        await api<SimulationReportView>(
          `/api/projects/${encodeURIComponent(projectId)}/simulation`,
          { method: 'POST', body: JSON.stringify({ transactionsPerClass: 5 }) },
        ),
      );
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: cause instanceof StudioRouteError ? cause.fix : 'Run the simulation again.',
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Run the model against generated traffic
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cerulea sends transactions of every class to the Blockchain and measures what happened.
          The report states the finality of each class, the throughput and how each threshold
          behaved.
        </Typography>
        <Button variant="contained" onClick={() => void run()} disabled={working}>
          {working ? 'Running' : 'Run the simulation'}
        </Button>
        {working && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">
              Cerulea is sending transactions and waiting for the blocks that carry them.
            </Typography>
          </Stack>
        )}
      </Paper>

      {failure && (
        <Alert severity="error">
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      {report && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            What we measured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {report.headline}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {describeSource(report.chainKind)}
          </Typography>

          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Transactions sent
              </Typography>
              <Typography variant="h6">{report.totalSubmitted}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Transactions in a block
              </Typography>
              <Typography variant="h6">{report.totalIncluded}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Transactions each second
              </Typography>
              <Typography variant="h6">{report.transactionsPerSecond.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Blocks the run covered
              </Typography>
              <Typography variant="h6">{report.blocksProduced}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Seconds the run took
              </Typography>
              <Typography variant="h6">{report.elapsedSeconds.toFixed(2)}</Typography>
            </Box>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell align="right">Sent</TableCell>
                <TableCell align="right">In a block</TableCell>
                <TableCell align="right">Irreversible</TableCell>
                <TableCell align="right">Seconds to a block</TableCell>
                <TableCell align="right">Share needed</TableCell>
                <TableCell>Threshold behaviour</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.classes.map((entry) => (
                <TableRow key={entry.transactionClass}>
                  <TableCell>
                    {entry.transactionClass}
                    {entry.mandatoryDelay && (
                      <Chip size="small" sx={{ ml: 1 }} label="waits out a delay" />
                    )}
                  </TableCell>
                  <TableCell align="right">{entry.submitted}</TableCell>
                  <TableCell align="right">{entry.included}</TableCell>
                  <TableCell align="right">{entry.irreversible}</TableCell>
                  <TableCell align="right">{entry.meanSecondsToInclusion.toFixed(2)}</TableCell>
                  <TableCell align="right">{entry.thresholdPercent} percent</TableCell>
                  <TableCell>{entry.statement}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}
