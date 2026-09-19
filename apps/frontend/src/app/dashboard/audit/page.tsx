'use client';

// apps/frontend/src/app/dashboard/audit/page.tsx
// The Audit panel.
// Cerulea records the actor, the action, the subject and the outcome of every
// change. A denial carries the same weight as an allowed action, so a review
// sees both. The filters and the search run against the record itself.
// Without this panel a review has nothing to read.

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

type AuditView = {
  workspace: { workspaceId: string; name: string };
  events: {
    eventId: string;
    actorEmail: string;
    actorName: string;
    action: string;
    subjectType: string;
    subjectId: string;
    outcome: string;
    networkAddress: string;
    occurredAt: string;
  }[];
  total: number;
  actions: string[];
  outcomes: string[];
};

export default function AuditPanel() {
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [search, setSearch] = useState('');

  const url = useMemo(() => {
    const values = new URLSearchParams();
    if (action) values.set('action', action);
    if (outcome) values.set('outcome', outcome);
    if (search) values.set('search', search);
    values.set('limit', '200');
    return `/api/dashboard/audit?${values.toString()}`;
  }, [action, outcome, search]);

  const reading = usePanelData<AuditView>(url);

  const download = (events: AuditView['events']) => {
    const blob = new Blob([toDelimitedText(events)], { type: 'text/csv;charset=utf-8' });
    const address = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = address;
    anchor.download = 'cerulea-audit.csv';
    anchor.click();
    URL.revokeObjectURL(address);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Audit
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        We record every change with its actor, its subject and its outcome. A refused action
        appears here beside an allowed one.
      </Typography>

      <PanelBody reading={reading} subject="the audit record">
        {(view) => (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField
                  select
                  size="small"
                  label="Action"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  sx={{ minWidth: 220 }}
                  helperText="Narrows the record to one kind of change."
                >
                  <MenuItem value="">Every action</MenuItem>
                  {view.actions.map((entry) => (
                    <MenuItem key={entry} value={entry}>
                      {describeAction(entry)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Outcome"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  sx={{ minWidth: 180 }}
                  helperText="A refusal is recorded with the same weight."
                >
                  <MenuItem value="">Every outcome</MenuItem>
                  {view.outcomes.map((entry) => (
                    <MenuItem key={entry} value={entry}>
                      {entry}
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
                <Button variant="outlined" onClick={() => download(view.events)}>
                  Export the record
                </Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {view.events.length} of {view.total} events in {view.workspace.name}.
              </Typography>
              {view.events.length === 0 ? (
                <PanelEmpty
                  heading="No event matches"
                  explanation="Widen the filters, or clear the search. Every change a person makes appears here as it happens."
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
                    {view.events.map((event) => (
                      <TableRow key={event.eventId}>
                        <TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell>
                        <TableCell>{event.actorName || event.actorEmail || 'Cerulea'}</TableCell>
                        <TableCell>{describeAction(event.action)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={event.outcome === 'allowed' ? 'success' : 'warning'}
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
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
