'use client';
// apps/frontend/src/app/auth/login/LoginClient.tsx
// The Cerulea sign in screen.
// Cerulea holds a second factor on every account, so signing in reads the
// address, the password and the six digit code from the authenticator.
// Cerulea APIs checks all three and opens the session.

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { landingAfterSignIn } from '@/lib/same-site-path';
import {
  Box, Paper, Typography, TextField, Button, Stack, Link, Alert
} from '@mui/material';

export default function LoginPage() {
  const sp = useSearchParams();
  // The landing page stays on this site. Another site lands on the home page.
  const next = landingAfterSignIn(sp.get('next'));

  // A prompt carried in the landing address waits in session storage, so the
  // register flow reads it after the account opens.
  useEffect(() => {
    try {
      const nextUrl = new URL(next, window.location.origin);
      const prompt = nextUrl.searchParams.get('prompt');
      if (prompt) sessionStorage.setItem('ceruleai:pendingPrompt', prompt);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const urlError = sp.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(
    urlError ? 'The earlier sign in did not complete. Type the three values and sign in again.' : null
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        multiFactorCode: code,
      });
      setLoading(false);
      if (!res) {
        setErr('Cerulea did not answer. Check that Cerulea APIs is running, then sign in again.');
        return;
      }
      if (res.error) {
        // Cerulea APIs names the reason and the fix in the error text.
        const msg = res.error === 'CredentialsSignin'
          ? 'Cerulea refused the address, the password or the code. Check all three and sign in again.'
          : res.error;
        setErr(msg);
        return;
      }
      // A full load runs the gate again, so the plan and division checks apply.
      window.location.href = next;
    } catch (ex: any) {
      setLoading(false);
      setErr(ex?.message || 'The sign in stopped. Sign in again.');
    }
  };

  return (
    <Box sx={{
      display: 'grid', placeItems: 'center', minHeight: '100vh',
      bgcolor: 'background.default',
      background: (t) => t.palette.mode === 'light'
        ? 'radial-gradient(900px 600px at 20% 0%, rgba(79,70,229,0.09), transparent), radial-gradient(700px 500px at 80% 10%, rgba(124,58,237,0.07), transparent)'
        : 'radial-gradient(900px 600px at 20% 0%, rgba(99,102,241,0.16), transparent), radial-gradient(700px 500px at 80% 10%, rgba(139,92,246,0.10), transparent)',
    }}>
      <Paper elevation={0} sx={{
        width: 420, p: '28px 32px', borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '0.5px solid', borderColor: 'divider',
        boxShadow: (t) => `0 8px 40px ${t.palette.mode === 'light' ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,20,0.4)'}`,
      }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1, color: 'text.primary', letterSpacing: '-0.3px' }}>Welcome back</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to Cerulea Studio and the Cerulea Dashboard.
        </Typography>
        {err && <Alert severity="error" sx={{mb:2}}>{err}</Alert>}
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={1.5}>
            <TextField
              label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              size="small" autoFocus fullWidth
            />
            <TextField
              label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required
              size="small" fullWidth
            />
            <TextField
              label="Authenticator code" value={code} onChange={e=>setCode(e.target.value)} required
              size="small" fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 12, autoComplete: 'one-time-code' }}
              helperText="The six digit code the authenticator shows now. A recovery code also works."
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Signing in' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{mt:2}}>
          <Link href="/auth/register" underline="hover">Create account</Link>
          <Link href="/auth/forgot-password" underline="hover">Recover the password</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
