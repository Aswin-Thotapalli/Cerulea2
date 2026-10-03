'use client';
// apps/frontend/src/app/auth/register/page.tsx
// Opening a Cerulea account.
// Cerulea APIs issues the second factor at the same moment as the account. The
// screen shows the enrolment once, confirms one code, then signs in with the
// next code and continues where the person was heading.
// Without the confirmation step the account would open with one factor.

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box, Paper, Typography, TextField, Button, Stack, Link, Alert, Chip
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';

type Enrolment = { secret: string; uri: string; recoveryCodes: string[] };

type Stage = 'details' | 'enrol' | 'sign-in';

function messageOf(cause: unknown): string {
  return cause instanceof StudioRouteError ? cause.message : cause instanceof Error ? cause.message : String(cause);
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [stage, setStage] = useState<Stage>('details');
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [nextCode, setNextCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // 1. Cerulea APIs opens the account and issues the enrolment.
  const openAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const outcome = await api<{ enrolment: Enrolment }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setEnrolment(outcome.enrolment);
      setStage('enrol');
    } catch (cause) {
      setErr(messageOf(cause));
    } finally {
      setLoading(false);
    }
  };

  // 2. One code from the authenticator turns the second factor on.
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await api('/api/auth/multi-factor', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password, code }),
      });
      setStage('sign-in');
    } catch (cause) {
      setErr(messageOf(cause));
    } finally {
      setLoading(false);
    }
  };

  // 3. The next code opens the first session. Each code opens one session.
  const signInNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    const signInRes = await signIn('credentials', {
      redirect: false,
      email: form.email,
      password: form.password,
      multiFactorCode: nextCode,
    });
    if (!signInRes || signInRes.error) {
      setLoading(false);
      setErr(
        signInRes?.error && signInRes.error !== 'CredentialsSignin'
          ? signInRes.error
          : 'The account is open. Cerulea refused this code. Wait for the authenticator to show the next code and sign in again.',
      );
      return;
    }

    // A person who arrived with a prompt from the home page lands in Studio with it.
    const pendingPrompt = sessionStorage.getItem('ceruleai:pendingPrompt');
    if (pendingPrompt) {
      sessionStorage.removeItem('ceruleai:pendingPrompt');
      window.location.href = `/?prompt=${encodeURIComponent(pendingPrompt)}`;
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <Box sx={{
      display: 'grid', placeItems: 'center', minHeight: '100vh', px: 2,
      bgcolor: 'background.default',
      background: (t) => t.palette.mode === 'light'
        ? 'radial-gradient(900px 600px at 20% 0%, rgba(79,70,229,0.09), transparent), radial-gradient(700px 500px at 80% 10%, rgba(124,58,237,0.07), transparent)'
        : 'radial-gradient(900px 600px at 20% 0%, rgba(99,102,241,0.16), transparent), radial-gradient(700px 500px at 80% 10%, rgba(139,92,246,0.10), transparent)',
    }}>
      <Paper elevation={0} sx={{
        width: '100%', maxWidth: 520, boxSizing: 'border-box', p: '28px 32px', borderRadius: '16px', my: 4,
        bgcolor: 'background.paper',
        border: '0.5px solid', borderColor: 'divider',
        boxShadow: (t) => `0 8px 40px ${t.palette.mode === 'light' ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,20,0.4)'}`,
      }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1, color: 'text.primary', letterSpacing: '-0.3px' }}>Create an account</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          One account opens the Dashboard and Studio.
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {stage === 'details' && (
          <Box component="form" onSubmit={openAccount}>
            <Stack spacing={1.5}>
              <TextField label="Full name" name="name" value={form.name} onChange={onChange} required size="small"
                helperText="The name colleagues see beside the work." />
              <TextField label="Email" name="email" type="email" value={form.email} onChange={onChange} required size="small"
                helperText="Cerulea sends recovery links to this address." />
              <TextField label="Password" name="password" type="password" value={form.password} onChange={onChange} required size="small"
                helperText="Twelve characters or more. Cerulea stores a verifier rather than the password." />
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? 'Creating account' : 'Create account'}
              </Button>
            </Stack>
          </Box>
        )}

        {stage === 'enrol' && enrolment && (
          <Box component="form" onSubmit={confirm}>
            <Stack spacing={1.5}>
              <Alert severity="info">
                Scan this code with an authenticator. Cerulea shows the recovery codes once. Keep them somewhere safe.
              </Alert>
              <Box sx={{ display: 'grid', placeItems: 'center', p: 2, bgcolor: '#FFFFFF', borderRadius: '12px' }}>
                <QRCodeSVG value={enrolment.uri} size={176} />
              </Box>
              <TextField label="Secret" value={enrolment.secret} size="small" InputProps={{ readOnly: true }}
                helperText="Type this into the authenticator when scanning is unavailable." />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Recovery codes</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {enrolment.recoveryCodes.map((entry) => (
                    <Chip key={entry} label={entry} size="small" />
                  ))}
                </Stack>
              </Box>
              <TextField label="Authenticator code" value={code} onChange={(e) => setCode(e.target.value)} required size="small"
                inputProps={{ inputMode: 'numeric', maxLength: 12, autoComplete: 'one-time-code' }}
                helperText="One code confirms the authenticator holds the right secret." />
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? 'Confirming' : 'Confirm the code'}
              </Button>
            </Stack>
          </Box>
        )}

        {stage === 'sign-in' && (
          <Box component="form" onSubmit={signInNow}>
            <Stack spacing={1.5}>
              <Alert severity="success">
                The account is open. Wait for the authenticator to show the next code, then sign in with it.
              </Alert>
              <TextField label="Next authenticator code" value={nextCode} onChange={(e) => setNextCode(e.target.value)} required size="small"
                inputProps={{ inputMode: 'numeric', maxLength: 12, autoComplete: 'one-time-code' }}
                helperText="Each code opens one session, so the confirmed code stays spent." />
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? 'Signing in' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        )}

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Link href="/auth/login" underline="hover">Sign in to an existing account</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
