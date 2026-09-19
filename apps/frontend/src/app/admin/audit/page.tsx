'use client';

// apps/frontend/src/app/admin/audit/page.tsx
// The audit screen of the Cerulea operator.
// Every change across the platform appears with its actor, its subject and its
// outcome. The export carries the same rows a reader sees.
// Without this screen a review of the whole platform has nothing to read.

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
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
import { describeAction, toDelimitedText } from '@/components/dashboard/wording';

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
};

export default function OperatorAuditScreen() {
  const reading = usePanelData<SecurityView>('/api/admin/security');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const actions = useMemo(() => {
    const held = new Set((reading.data?.events ?? []).map((entry) => entry.action));
    return [...held].sort();
  }, [reading.data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (reading.data?.events ?? []).filter(
      (entry) =>
        (action.length === 0 || entry.action === action) &&
        (term.length === 0 ||
          `${entry.action} ${entry.subjectType} ${entry.accountEmail}`
            .toLowerCase()
            .includes(term)),
    );
  }, [reading.data, action, search]);

  const download = () => {
    const text = toDelimitedText(
      visible.map((entry) => ({
        occurredAt: entry.occurredAt,
        actorEmail: entry.accountEmail,
        action: entry.action,
        subjectType: entry.subjectType,
        subjectId: entry.eventId,
        outcome: entry.outcome,
      })),
    );
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const address = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = address;
    anchor.download = 'cerulea-platform-audit.csv';
    anchor.click();
    URL.revokeObjectURL(address);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Audit
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Every operator action appears in the customer audit log with actor, timestamp and reason.
        This screen reads the same record across the platform.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          size="small"
          label="Action"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          sx={{ minWidth: 240 }}
          helperText="Narrows the record to one kind of change."
        >
          <MenuItem value="">Every action</MenuItem>
          {actions.map((entry) => (
            <MenuItem key={entry} value={entry}>
              {describeAction(entry)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 240 }}
          helperText="Matches the actor, the action and the subject."
        />
        <Button variant="outlined" onClick={download} disabled={visible.length === 0}>
          Export the record
        </Button>
      </Stack>

      <PanelBody reading={reading} subject="the platform audit record">
        {() => (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            {visible.length === 0 ? (
              <PanelEmpty
                heading="No event matches"
                explanation="Clear the search, or choose every action. The whole record returns."
              />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Who</TableCell>
                    <TableCell>What happened</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Outcome</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map((event) => (
                    <TableRow key={event.eventId}>
                      <TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell>
                      <TableCell>{event.accountEmail || 'Cerulea'}</TableCell>
                      <TableCell>{describeAction(event.action)}</TableCell>
                      <TableCell>{event.subjectType}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={event.outcome === 'allowed' ? 'success' : 'error'}
                          label={event.outcome}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}
      </PanelBody>
    </Box>
  );
}
