'use client';

// apps/frontend/src/app/admin/security/page.tsx
// The security screen of the Cerulea operator.
// Every refusal, every sign in and every open session comes from the platform
// record. A refusal carries the same weight as an allowed action.
// Without this screen a refused attempt would pass unseen.

import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import { PanelBody, PanelEmpty, usePanelData } from '@/components/dashboard/PanelState';
import { describeAction } from '@/components/dashboard/wording';

type SecurityView = {
  events: {
    eventId: string;
    action: string;
    subjectType: string;
    outcome: string;
    networkAddress: string;
    accountEmail: string;
    occurredAt: string;
  }[];
  sessions: {
    sessionId: string;
    accountId: string;
    device: string;
    networkAddress: string;
    issuedAt: string;
    expiresAt: string;
    revokedAt: string | null;
    rotationCount: number;
  }[];
};

export default function OperatorSecurityScreen() {
  const reading = usePanelData<SecurityView>('/api/admin/security', 20000);
  const [outcome, setOutcome] = useState('refused');

  const visible = useMemo(() => {
    const held = reading.data?.events ?? [];
    if (outcome === 'all') return held;
    if (outcome === 'refused') return held.filter((entry) => entry.outcome !== 'allowed');
    return held.filter((entry) => entry.outcome === outcome);
  }, [reading.data, outcome]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Security
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Cerulea records a refusal with the same weight as an allowed action, so a pattern of
        refusals is visible here.
      </Typography>

      <TextField
        select
        size="small"
        label="Show"
        value={outcome}
        onChange={(event) => setOutcome(event.target.value)}
        sx={{ mb: 3, minWidth: 220 }}
        helperText="Refusals come first, since they carry the signal."
      >
        <MenuItem value="refused">Refusals only</MenuItem>
        <MenuItem value="allowed">Allowed actions</MenuItem>
        <MenuItem value="all">Everything</MenuItem>
      </TextField>

      <PanelBody reading={reading} subject="the security record">
        {(view) => (
          <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Events
              </Typography>
              {visible.length === 0 ? (
                <PanelEmpty
                  heading="Nothing matches"
                  explanation="Cerulea refused nothing in this window. Choose everything to read the allowed actions beside it."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell>
                      <TableCell>Who</TableCell>
                      <TableCell>What happened</TableCell>
                      <TableCell>Outcome</TableCell>
                      <TableCell>From</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map((event) => (
                      <TableRow key={event.eventId}>
                        <TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell>
                        <TableCell>{event.accountEmail || 'Cerulea'}</TableCell>
                        <TableCell>{describeAction(event.action)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={event.outcome === 'allowed' ? 'success' : 'error'}
                            label={event.outcome}
                          />
                        </TableCell>
                        <TableCell>{event.networkAddress || 'this machine'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                Sessions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Every session binds to the device and the network it opened from. A rotation count
                above zero means the pair rotated.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Device</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Opened</TableCell>
                    <TableCell>Ends</TableCell>
                    <TableCell align="right">Rotations</TableCell>
                    <TableCell>State</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.sessions.map((session) => (
                    <TableRow key={session.sessionId}>
                      <TableCell>{session.device || 'not stated'}</TableCell>
                      <TableCell>{session.networkAddress || 'this machine'}</TableCell>
                      <TableCell>{new Date(session.issuedAt).toLocaleString()}</TableCell>
                      <TableCell>{new Date(session.expiresAt).toLocaleString()}</TableCell>
                      <TableCell align="right">{session.rotationCount}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={session.revokedAt === null ? 'success' : 'default'}
                          label={session.revokedAt === null ? 'Open' : 'Closed'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
