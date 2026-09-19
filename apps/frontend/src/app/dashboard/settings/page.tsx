'use client';

// apps/frontend/src/app/dashboard/settings/page.tsx
// The account and workspace screen.
// The account, the open sessions, the workspace and its members all come from
// Cerulea APIs. Closing a session here closes it everywhere at once.
// Without this screen nobody can see where an account is signed in.

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
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

import {
  PanelBody,
  describeFailure,
  usePanelData,
  type PanelFailure,
} from '@/components/dashboard/PanelState';
import { api } from '@/lib/apiClient';
import { ROLE_MEANING } from '@/components/dashboard/wording';

type SettingsView = {
  account: {
    accountId: string;
    email: string;
    displayName: string;
    state: string;
    multiFactorActive: boolean;
    lastSignInAt?: string;
    createdAt: string;
  };
  sessions: {
    sessionId: string;
    device: string;
    networkAddress: string;
    issuedAt: string;
    expiresAt: string;
    rotationCount: number;
    current: boolean;
  }[];
  workspace: { workspaceId: string; name: string; application: string; tier: string };
  members: {
    memberId: string;
    email: string;
    displayName: string;
    role: string;
    state: string;
    joinedAt?: string;
  }[];
  roles: { role: string; capabilities: string[] }[];
};

export default function AccountPanel() {
  const reading = usePanelData<SettingsView>('/api/dashboard/settings');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('builder');
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [working, setWorking] = useState(false);

  const invite = async () => {
    setWorking(true);
    setFailure(null);
    try {
      const outcome = await api<{ guidance: string }>('/api/dashboard/settings', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      setNotice(outcome.guidance);
      setEmail('');
      reading.readAgain();
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setWorking(false);
    }
  };

  const closeSession = async (sessionId: string) => {
    setFailure(null);
    try {
      await api(`/api/dashboard/settings?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });
      reading.readAgain();
    } catch (cause) {
      setFailure(describeFailure(cause));
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Account and workspace
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        One account opens Studio, Dashboard and Explorer. A workspace holds the projects a team
        builds together.
      </Typography>

      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      <PanelBody reading={reading} subject="the account and the workspace">
        {(view) => (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Account
              </Typography>
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">{view.account.displayName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Email address
                  </Typography>
                  <Typography variant="body1">{view.account.email}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Second factor
                  </Typography>
                  <Chip
                    size="small"
                    color={view.account.multiFactorActive ? 'success' : 'warning'}
                    label={view.account.multiFactorActive ? 'Active' : 'Waiting'}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Opened
                  </Typography>
                  <Typography variant="body1">
                    {new Date(view.account.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Cerulea holds a verifier rather than the password. Recover the password from the
                sign in screen when it is lost.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                Open sessions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Each session binds to the device and the network it opened from. Closing one stops
                it at once.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Device</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Opened</TableCell>
                    <TableCell>Ends</TableCell>
                    <TableCell align="right">Close</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.sessions.map((session) => (
                    <TableRow key={session.sessionId}>
                      <TableCell>
                        {session.device}
                        {session.current && <Chip size="small" sx={{ ml: 1 }} label="This one" />}
                      </TableCell>
                      <TableCell>{session.networkAddress || 'this machine'}</TableCell>
                      <TableCell>{new Date(session.issuedAt).toLocaleString()}</TableCell>
                      <TableCell>{new Date(session.expiresAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          disabled={session.current}
                          onClick={() => void closeSession(session.sessionId)}
                        >
                          Close
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {view.workspace.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {view.workspace.application} application, {view.workspace.tier} plan
                  </Typography>
                </Box>
                <Button component={Link} href="/pricing" size="small">
                  Change the plan
                </Button>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Members
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Person</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>What the role may do</TableCell>
                    <TableCell>State</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.members.map((member) => (
                    <TableRow key={member.memberId}>
                      <TableCell>{member.displayName || member.email}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>{ROLE_MEANING[member.role] ?? ''}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={member.state === 'active' ? 'success' : 'default'}
                          label={member.state}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Invite a colleague
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <TextField
                  label="Email address"
                  size="small"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  sx={{ minWidth: 260 }}
                  helperText="Cerulea sends the invitation link to this address."
                />
                <TextField
                  select
                  label="Role"
                  size="small"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  sx={{ minWidth: 200 }}
                  helperText={ROLE_MEANING[role] ?? ''}
                >
                  {view.roles.map((entry) => (
                    <MenuItem key={entry.role} value={entry.role}>
                      {entry.role}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  onClick={() => void invite()}
                  disabled={working || email.trim().length < 5}
                >
                  Send the invitation
                </Button>
              </Stack>
            </Paper>
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
