'use client';
// apps/frontend/src/components/auth/AuthModal.tsx
// Sign in without leaving the screen. Cerulea APIs checks the address, the
// password and the authenticator code. Opening an account needs the enrolment
// of the second factor, so the second tab leads to the full registration screen.

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Dialog, DialogContent, DialogTitle, Tabs, Tab, Box,
  TextField, Button, Stack, Typography, Alert, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function AuthModal({ open, title = 'Sign in', subtitle, onSuccess, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '', multiFactorCode: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn('credentials', { redirect: false, ...loginForm });
    setLoading(false);
    if (res?.error) {
      return setError(
        res.error === 'CredentialsSignin'
          ? 'Cerulea refused the address, the password or the code. Check all three and sign in again.'
          : res.error,
      );
    }
    onSuccess();
  };

  // Registration issues a second factor, which the full screen enrols.
  const openRegistration = () => {
    window.location.href = '/auth/register';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
    >
      <DialogTitle sx={{ pb: 0, pr: 6 }}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(null); }} sx={{ mb: 2 }}>
          <Tab label="Sign In" />
          <Tab label="Create Account" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {tab === 0 ? (
          <Box component="form" onSubmit={handleLogin}>
            <Stack spacing={1.5}>
              <TextField
                label="Email" type="email" size="small" required autoFocus
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
              />
              <TextField
                label="Password" type="password" size="small" required
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              />
              <TextField
                label="Authenticator code" size="small" required
                value={loginForm.multiFactorCode}
                inputProps={{ inputMode: 'numeric', maxLength: 12, autoComplete: 'one-time-code' }}
                helperText="The six digit code the authenticator shows now."
                onChange={(e) => setLoginForm((f) => ({ ...f, multiFactorCode: e.target.value }))}
              />
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? 'Signing in' : 'Sign In'}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              A new account holds a second factor from the first day. The registration screen shows the authenticator enrolment and the recovery codes.
            </Typography>
            <Button variant="contained" fullWidth onClick={openRegistration}>
              Open the registration screen
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
