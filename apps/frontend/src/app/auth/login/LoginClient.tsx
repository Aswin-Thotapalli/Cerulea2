'use client';

// apps/frontend/src/app/auth/login/LoginClient.tsx
// The Cerulea sign in screen.
// Cerulea holds a second factor on every account, so signing in reads the
// address, the password and the six digit code from the authenticator.
// Without the second factor a stolen password would open the account.

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';

export default function LoginClient() {
  const search = useSearchParams();
  const next = search.get('next') || '/dashboard';
  const carried = search.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<string | null>(
    carried ? 'The earlier sign in did not complete. Type the three values and sign in again.' : null,
  );
  const [working, setWorking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    setWorking(true);
    const outcome = await signIn('credentials', {
      redirect: false,
      email,
      password,
      multiFactorCode: code,
    });
    setWorking(false);
    if (!outcome) {
      setFailure('Cerulea did not answer. Check that Cerulea APIs is running, then sign in again.');
      return;
    }
    if (outcome.error) {
      setFailure(
        outcome.error === 'CredentialsSignin'
          ? 'Cerulea refused the address, the password or the code. Check all three and sign in again.'
          : outcome.error,
      );
      return;
    }
    window.location.href = next;
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', px: 2 }}>
      <Paper variant="outlined" sx={{ width: 420, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          Sign in
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
          We open Studio, Dashboard and Explorer from one account.
        </Typography>
        {failure && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {failure}
          </Alert>
        )}
        <Box component="form" onSubmit={submit}>
          <Stack spacing={2}>
            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              size="small"
              autoFocus
              fullWidth
              helperText="The address the account was opened with."
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              size="small"
              fullWidth
              helperText="Cerulea stores a verifier rather than the password itself."
            />
            <TextField
              label="Authenticator code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 12 }}
              helperText="The six digit code the authenticator shows now. A password alone opens no account."
            />
            <Button type="submit" variant="contained" disabled={working}>
              {working ? 'Signing in' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Link href="/auth/register" underline="hover">
            Open an account
          </Link>
          <Link href="/auth/forgot-password" underline="hover">
            Recover the password
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}
