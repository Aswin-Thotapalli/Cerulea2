'use client';
import { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Stack, Link } from '@mui/material';

export default function ForgotPasswordPage(){
  const [email,setEmail]=useState('');
  const [msg,setMsg]=useState<string|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setMsg(null); setErr(null); setLoading(true);
    const res=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    setLoading(false);
    if(!res.ok) return setErr('Failed to send reset link. Try again.');
    setMsg('If an account exists, a reset link has been emailed.');
  };

  return (
    <Box sx={{
      display: 'grid', placeItems: 'center', minHeight: '100vh', bgcolor: 'background.default',
      background: (t: any) => t.palette.mode === 'light'
        ? 'radial-gradient(900px 600px at 20% 0%, rgba(79,70,229,0.09), transparent)'
        : 'radial-gradient(900px 600px at 20% 0%, rgba(99,102,241,0.16), transparent)',
    }}>
      <Paper elevation={0} sx={{
        width: 420, p: '28px 32px', borderRadius: '16px',
        bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider',
        boxShadow: (t: any) => `0 8px 40px ${t.palette.mode === 'light' ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,20,0.4)'}`,
      }}>
        <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mb: 1, letterSpacing: '-0.3px' }}>Forgot password</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Enter your email to receive a reset link.</Typography>
        {msg && <Alert severity="success" sx={{mb:2}}>{msg}</Alert>}
        {err && <Alert severity="error" sx={{mb:2}}>{err}</Alert>}
        <Box component="form" onSubmit={submit}>
          <Stack spacing={1.5}>
            <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required size="small"/>
            <Button type="submit" variant="contained" disabled={loading}>{loading?'Sending…':'Send reset link'}</Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="flex-end" sx={{mt:2}}>
          <Link href="/auth/login" underline="hover">Back to sign in</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
