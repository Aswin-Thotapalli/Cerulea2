'use client';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { CircularProgress, Box, Typography } from '@mui/material';

export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: '/auth/login' });
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
      <CircularProgress />
      <Typography color="text.secondary">Signing out…</Typography>
    </Box>
  );
}
