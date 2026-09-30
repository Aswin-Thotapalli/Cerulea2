'use client';

// apps/frontend/src/app/settings/profile/page.tsx
// The profile of the signed in person.
// The screen reads the account Cerulea APIs holds: the name, the address, the
// second factor and the last sign in. A person checks here which account
// Studio is working under.
// Without this screen a person could not confirm the account behind the work.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';

type ProfileAccount = {
  displayName: string;
  email: string;
  multiFactorActive: boolean;
  lastSignInAt: string | null;
  createdAt: string;
};

/** Writes an instant as a date a person reads, or a sentence when absent. */
function whenWords(value: string | null): string {
  if (value === null || value.length === 0) return 'No sign in recorded yet.';
  const held = new Date(value);
  return Number.isNaN(held.getTime()) ? 'No sign in recorded yet.' : held.toLocaleString();
}

export default function ProfilePage() {
  const [account, setAccount] = useState<ProfileAccount | null>(null);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const read = useCallback(async () => {
    setFailure(null);
    try {
      const held = await api<{ account: ProfileAccount }>('/api/auth/me');
      setAccount(held.account);
    } catch (cause) {
      setFailure({
        message:
          cause instanceof StudioRouteError
            ? cause.message.replace(` ${cause.fix}`, '')
            : 'Cerulea did not answer with the account.',
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Read the profile again. Report the problem to the Cerulea operator when it repeats.',
      });
    }
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
        Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The account Studio works under. Every project and every change carries this account.
      </Typography>
      {failure !== null ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void read()}>
              Read again
            </Button>
          }
        >
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      ) : account === null ? (
        <CircularProgress size={24} aria-label="Cerulea is reading the account" />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
          <List>
            <ListItem>
              <ListItemText primary="Name" secondary={account.displayName} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Email address" secondary={account.email} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Second factor"
                secondary={
                  account.multiFactorActive
                    ? 'Active. Every sign in asks for the code the authenticator shows.'
                    : 'Not active yet. Activate the authenticator to sign in.'
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText primary="Last sign in" secondary={whenWords(account.lastSignInAt)} />
            </ListItem>
          </List>
        </Paper>
      )}
    </Container>
  );
}
