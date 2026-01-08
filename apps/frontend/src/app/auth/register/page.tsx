'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Paper, Typography, TextField, Button, Stack, Link, Alert
} from '@mui/material';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name:'', email:'', password:'', company:'', role:'' });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({...prev, [e.target.name]: e.target.value}));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(false); setLoading(true);
    const res = await fetch('/api/auth/register', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(()=>({error:'Failed'}));
      return setErr(j.error || 'Registration failed');
    }
    setOk(true);
    setTimeout(()=>router.push('/auth/login'), 800);
  };

  return (
    <Box sx={{
      display:'grid', placeItems:'center', minHeight:'100vh',
      background: 'radial-gradient(1200px 600px at 10% 10%, rgba(99,102,241,.18), transparent), radial-gradient(1000px 500px at 90% 10%, rgba(16,185,129,.12), transparent)'
    }}>
      <Paper elevation={0} sx={{
        width: 520, p: 3, borderRadius: 3,
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.16)'
      }}>
        <Typography variant="h5" sx={{mb:1.5, fontWeight:700}}>Create your account</Typography>
        <Typography variant="body2" sx={{mb:3, opacity:.8}}>
          One account for dashboard and studio.
        </Typography>
        {err && <Alert severity="error" sx={{mb:2}}>{err}</Alert>}
        {ok && <Alert severity="success" sx={{mb:2}}>Account created. Redirecting…</Alert>}
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={1.5}>
            <TextField label="Full name" name="name" value={form.name} onChange={onChange} required size="small" />
            <TextField label="Company (optional)" name="company" value={form.company} onChange={onChange} size="small" />
            <TextField label="Role (optional)" name="role" value={form.role} onChange={onChange} size="small" />
            <TextField label="Email" name="email" type="email" value={form.email} onChange={onChange} required size="small" />
            <TextField label="Password" name="password" type="password" value={form.password} onChange={onChange} required size="small" />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="flex-end" sx={{mt:2}}>
          <Link href="/auth/login" underline="hover">Back to sign in</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
