'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box, Paper, Typography, TextField, Button, Stack, Link, Alert
} from '@mui/material';

export default function LoginPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get('next') || '/dashboard';
  const urlError = sp.get('error'); // NextAuth puts error here when it redirects to the error page
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(
    urlError ? `Auth error: ${urlError}. Please try signing in again.` : null
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await signIn('credentials', { redirect: false, email, password });
      setLoading(false);
      if (!res) {
        setErr('No response from auth server. Please try again.');
        return;
      }
      if (res.error) {
        // CredentialsSignin = wrong password; other values = server-side error
        const msg = res.error === 'CredentialsSignin'
          ? 'Invalid email or password.'
          : `Sign-in failed (${res.error}). Please try again.`;
        setErr(msg);
        return;
      }
      // Hard redirect so middleware runs fresh and enforces the pricing gate
      window.location.href = next;
    } catch (ex: any) {
      setLoading(false);
      setErr(`Error: ${ex?.message || 'Something went wrong. Please try again.'}`);
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
          Sign in to access your Cerulea dashboard.
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
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{mt:2}}>
          <Link href="/auth/register" underline="hover">Create account</Link>
          <Link href="/auth/forgot-password" underline="hover">Forgot password?</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
