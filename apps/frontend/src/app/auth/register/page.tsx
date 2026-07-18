'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Box, Paper, Typography, TextField, Button, Stack, Link, Alert
} from '@mui/material';

export default function RegisterPage() {
  const [form, setForm] = useState({ name:'', email:'', password:'', company:'', role:'' });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({...prev, [e.target.name]: e.target.value}));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(false); setLoading(true);

    // 1. Create the account
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setLoading(false);
      const j = await res.json().catch(() => ({ error: 'Failed' }));
      return setErr(j.error || 'Registration failed');
    }

    setOk(true);

    // 2. Auto sign-in with the new credentials
    const signInRes = await signIn('credentials', {
      redirect: false,
      email: form.email,
      password: form.password,
    });

    if (signInRes?.error) {
      setLoading(false);
      setOk(false);
      setErr('Account created but sign-in failed. Please sign in manually.');
      return;
    }

    // 3. If the user arrived with a prompt from the homepage, send them to Studio with it.
    //    Otherwise go to the dashboard.
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
      display: 'grid', placeItems: 'center', minHeight: '100vh',
      bgcolor: 'background.default',
      background: (t) => t.palette.mode === 'light'
        ? 'radial-gradient(900px 600px at 20% 0%, rgba(79,70,229,0.09), transparent), radial-gradient(700px 500px at 80% 10%, rgba(124,58,237,0.07), transparent)'
        : 'radial-gradient(900px 600px at 20% 0%, rgba(99,102,241,0.16), transparent), radial-gradient(700px 500px at 80% 10%, rgba(139,92,246,0.10), transparent)',
    }}>
      <Paper elevation={0} sx={{
        width: 520, p: '28px 32px', borderRadius: '16px', my: 4,
        bgcolor: 'background.paper',
        border: '0.5px solid', borderColor: 'divider',
        boxShadow: (t) => `0 8px 40px ${t.palette.mode === 'light' ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,20,0.4)'}`,
      }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1, color: 'text.primary', letterSpacing: '-0.3px' }}>Create your account</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          One account for dashboard and studio.
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>Account created. Setting up your workspace...</Alert>}
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={1.5}>
            <TextField label="Full name" name="name" value={form.name} onChange={onChange} required size="small" />
            <TextField label="Company (optional)" name="company" value={form.company} onChange={onChange} size="small" />
            <TextField label="Role (optional)" name="role" value={form.role} onChange={onChange} size="small" />
            <TextField label="Email" name="email" type="email" value={form.email} onChange={onChange} required size="small" />
            <TextField label="Password" name="password" type="password" value={form.password} onChange={onChange} required size="small" />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Link href="/auth/login" underline="hover">Already have an account? Sign in</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
