'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, Paper, Typography, TextField, Button, Alert, Stack, Link } from '@mui/material';

export default function ResetPasswordPage(){
  const sp=useSearchParams();
  const token=sp.get('token')||'';
  const router=useRouter();
  const [password,setPassword]=useState('');
  const [ok,setOk]=useState(false);
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setErr(null); setOk(false); setLoading(true);
    const res=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});
    setLoading(false);
    if(!res.ok){ setErr('Reset failed or token expired.'); return; }
    setOk(true);
    setTimeout(()=>router.push('/auth/login'), 1000);
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
        <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mb: 1, letterSpacing: '-0.3px' }}>Reset password</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Choose a new password for your account.</Typography>
        {ok && <Alert severity="success" sx={{mb:2}}>Password updated. Redirecting…</Alert>}
        {err && <Alert severity="error" sx={{mb:2}}>{err}</Alert>}
        <Box component="form" onSubmit={submit}>
          <Stack spacing={1.5}>
            <TextField label="New password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required size="small"/>
            <Button type="submit" variant="contained" disabled={loading || !token}>{loading?'Updating…':'Update password'}</Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{mt:2}}>
          <Link href="/auth/login" underline="hover">Back to sign in</Link>
          <Typography variant="caption" sx={{opacity:.7}}>Token: {token ? 'OK' : 'missing'}</Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
