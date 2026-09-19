'use client';

// apps/frontend/src/app/auth/register/page.tsx
// Opening a Cerulea account.
// Cerulea issues the second factor at the same moment as the account, so this
// screen shows the enrolment address once and confirms one code before the
// account opens.
// Without the confirmation step the account would open with one factor.

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';

type Enrolment = { secret: string; uri: string; recoveryCodes: string[] };

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [opened, setOpened] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const change = (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const openAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    setWorking(true);
    try {
      const outcome = await api<{ enrolment: Enrolment }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setEnrolment(outcome.enrolment);
    } catch (cause) {
      setFailure(cause instanceof StudioRouteError ? cause.message : String(cause));
    } finally {
      setWorking(false);
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    setWorking(true);
    try {
      await api('/api/auth/multi-factor', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password, code }),
      });
      setOpened(true);
    } catch (cause) {
      setFailure(cause instanceof StudioRouteError ? cause.message : String(cause));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', px: 2, py: 6 }}>
      <Paper variant="outlined" sx={{ width: 520, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          Open a Cerulea account
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
          One account opens Studio, Dashboard and Explorer.
        </Typography>

        {failure && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {failure}
          </Alert>
        )}

        {opened && (
          <Stack spacing={2}>
            <Alert severity="success">
              The account is open. Sign in with the password and a fresh code from the
              authenticator.
            </Alert>
            <Button component={Link} href="/auth/login" variant="contained">
              Go to sign in
            </Button>
          </Stack>
        )}

        {!opened && !enrolment && (
          <Box component="form" onSubmit={openAccount}>
            <Stack spacing={2}>
              <TextField
                label="Full name"
                name="name"
                value={form.name}
                onChange={change}
                required
                size="small"
                helperText="The name colleagues see beside the work."
              />
              <TextField
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={change}
                required
                size="small"
                helperText="Cerulea sends recovery links to this address."
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={change}
                required
                size="small"
                helperText="Twelve characters or more. Cerulea stores a verifier rather than the password."
              />
              <Button type="submit" variant="contained" disabled={working}>
                {working ? 'Opening' : 'Open the account'}
              </Button>
            </Stack>
          </Box>
        )}

        {!opened && enrolment && (
          <Box component="form" onSubmit={confirm}>
            <Stack spacing={2}>
              <Alert severity="info">
                Add this enrolment address to an authenticator. Cerulea shows the recovery codes
                once. Keep them somewhere safe.
              </Alert>
              <TextField
                label="Enrolment address"
                value={enrolment.uri}
                size="small"
                InputProps={{ readOnly: true }}
                multiline
                helperText="Paste this into the authenticator, or type the secret by hand."
              />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Recovery codes
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {enrolment.recoveryCodes.map((entry) => (
                    <Chip key={entry} label={entry} size="small" />
                  ))}
                </Stack>
              </Box>
              <TextField
                label="Authenticator code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                size="small"
                inputProps={{ inputMode: 'numeric', maxLength: 12 }}
                helperText="One code confirms the authenticator holds the right secret."
              />
              <Button type="submit" variant="contained" disabled={working}>
                {working ? 'Confirming' : 'Confirm and open the account'}
              </Button>
            </Stack>
          </Box>
        )}

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Link href="/auth/login">Sign in instead</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
