'use client';

// apps/frontend/src/app/admin/users/page.tsx
// The accounts screen of the Cerulea operator.
// Each row states the account, whether a second factor is active, how many
// sessions are open and how many workspaces it belongs to. No customer record
// appears here.
// Without this screen the operator cannot tell who holds an account.

import { useState } from 'react';
import {
  Box,
  Chip,
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

type AccountsView = {
  accounts: {
    accountId: string;
    email: string;
    displayName: string;
    state: string;
    multiFactorActive: boolean;
    openSessions: number;
    workspaces: number;
    lastSignInAt: string | null;
    createdAt: string;
  }[];
};

export default function OperatorAccountsScreen() {
  const reading = usePanelData<AccountsView>('/api/admin/accounts');
  const [search, setSearch] = useState('');

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Accounts
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Cerulea requires a second factor on every account. An account without one stays closed.
      </Typography>

      <TextField
        size="small"
        label="Search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 3, minWidth: 280 }}
        helperText="Matches the address and the name."
      />

      <PanelBody reading={reading} subject="every account">
        {(view) => {
          const term = search.trim().toLowerCase();
          const visible = view.accounts.filter(
            (entry) =>
              term.length === 0 ||
              entry.email.toLowerCase().includes(term) ||
              entry.displayName.toLowerCase().includes(term),
          );
          return (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              {visible.length === 0 ? (
                <PanelEmpty
                  heading="No account matches"
                  explanation="Clear the search. Every account on this platform returns."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Person</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Second factor</TableCell>
                      <TableCell align="right">Open sessions</TableCell>
                      <TableCell align="right">Workspaces</TableCell>
                      <TableCell>Last sign in</TableCell>
                      <TableCell>State</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map((entry) => (
                      <TableRow key={entry.accountId}>
                        <TableCell>{entry.displayName}</TableCell>
                        <TableCell>{entry.email}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={entry.multiFactorActive ? 'success' : 'warning'}
                            label={entry.multiFactorActive ? 'Active' : 'Waiting'}
                          />
                        </TableCell>
                        <TableCell align="right">{entry.openSessions}</TableCell>
                        <TableCell align="right">{entry.workspaces}</TableCell>
                        <TableCell>
                          {entry.lastSignInAt
                            ? new Date(entry.lastSignInAt).toLocaleString()
                            : 'Not yet'}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Chip size="small" label={entry.state} />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          );
        }}
      </PanelBody>
    </Box>
  );
}
