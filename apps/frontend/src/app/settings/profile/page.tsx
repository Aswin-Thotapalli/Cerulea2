'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Stack, Button, TextField, Avatar,
  Chip, Divider, Alert, CircularProgress, IconButton, Tooltip,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import LogoutIcon from '@mui/icons-material/Logout';
import SecurityIcon from '@mui/icons-material/Security';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PersonIcon from '@mui/icons-material/Person';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HexagonIcon from '@mui/icons-material/Hexagon';

const PLAN_META: Record<string, { label: string; color: string; features: string[] }> = {
  developer: { label: 'Developer', color: '#4F46E5', features: ['5 projects', '20 deployments/mo', '100K API calls/mo', '10 GB storage'] },
  pro: { label: 'Pro', color: '#9c27b0', features: ['20 projects', '100 deployments/mo', '1M API calls/mo', '50 GB storage'] },
  enterprise: { label: 'Enterprise', color: '#f59e0b', features: ['Unlimited projects', 'Unlimited deployments', 'Custom API limits', 'Dedicated support'] },
  free: { label: 'Free', color: '#6b7280', features: ['1 project', '5 deployments/mo', '10K API calls/mo', '1 GB storage'] },
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const user = session?.user as any;
  const initials = (user?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const plan = user?.plan || 'free';
  const planMeta = PLAN_META[plan] ?? PLAN_META.free;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'Unknown';
  const userId = user?.id || user?.sub || '—';

  const handleSaveName = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch('/api/auth/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (r.ok) {
        await update({ name });
        setSaveMsg('Name updated');
        setEditingName(false);
      } else {
        setSaveMsg('Update failed');
      }
    } catch {
      setSaveMsg('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Box sx={{
        px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 2,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HexagonIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={800}>Cerulea</Typography>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Back
        </Button>
        <Button variant="outlined" startIcon={<LogoutIcon />} size="small" onClick={() => signOut({ callbackUrl: '/' })} sx={{ borderRadius: 1 }}>
          Sign out
        </Button>
      </Box>

      <Box sx={{ maxWidth: 760, mx: 'auto', px: 3, py: 5 }}>
        {saveMsg && (
          <Alert severity={saveMsg.includes('failed') ? 'error' : 'success'} sx={{ mb: 3 }} onClose={() => setSaveMsg(null)}>
            {saveMsg}
          </Alert>
        )}

        {/* Identity Card */}
        <Paper variant="outlined" sx={{ p: 4, mb: 3 }}>
          <Stack direction="row" spacing={3} alignItems="flex-start">
            <Avatar sx={{
              width: 72, height: 72, fontSize: '1.5rem', fontWeight: 900,
              bgcolor: alpha('#4F46E5', 0.15), color: 'primary.main',
              border: `2px solid ${alpha('#4F46E5', 0.2)}`,
            }}>
              {initials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                {editingName ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      value={name} onChange={(e) => setName(e.target.value)}
                      size="small" autoFocus
                      sx={{ '& .MuiInputBase-root': { fontSize: '1.1rem', fontWeight: 700 } }}
                    />
                    <IconButton size="small" color="primary" onClick={handleSaveName} disabled={saving}>
                      {saving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                    </IconButton>
                  </Stack>
                ) : (
                  <>
                    <Typography variant="h6" fontWeight={800}>{user?.name || '—'}</Typography>
                    <IconButton size="small" onClick={() => setEditingName(true)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={1}>{user?.email}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={planMeta.label}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha(planMeta.color, 0.12), color: planMeta.color, border: `1px solid ${alpha(planMeta.color, 0.25)}` }}
                />
                <Chip label={`Member since ${memberSince}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha('#6b7280', 0.1), color: 'text.secondary' }} />
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Account Details */}
        <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <PersonIcon sx={{ fontSize: 17, color: 'primary.main' }} />
              <Typography variant="subtitle2" fontWeight={800}>Account Details</Typography>
            </Stack>
          </Box>
          <Box sx={{ px: 3, py: 2 }}>
            <Stack spacing={2}>
              {[
                { label: 'Full Name', value: user?.name || '—' },
                { label: 'Email', value: user?.email || '—' },
                {
                  label: 'User ID', value: userId,
                  action: (
                    <Tooltip title={copiedId ? 'Copied!' : 'Copy'}>
                      <IconButton size="small" onClick={copyUserId}>
                        {copiedId ? <CheckIcon sx={{ fontSize: 13, color: '#10b981' }} /> : <ContentCopyIcon sx={{ fontSize: 13 }} />}
                      </IconButton>
                    </Tooltip>
                  )
                },
                { label: 'Plan', value: planMeta.label },
                { label: 'Member Since', value: memberSince },
              ].map((row) => (
                <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', alignItems: 'center', gap: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.62rem' }}>
                    {row.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ fontFamily: row.label === 'User ID' ? 'monospace' : undefined, fontSize: '0.82rem' }}>
                    {row.value}
                  </Typography>
                  {row.action ?? null}
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>

        {/* Plan & Usage */}
        <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(planMeta.color, 0.02) }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CreditCardIcon sx={{ fontSize: 17, color: planMeta.color }} />
                <Typography variant="subtitle2" fontWeight={800}>Plan & Usage</Typography>
              </Stack>
              <Button size="small" variant="outlined" sx={{ borderRadius: 1, borderColor: alpha(planMeta.color, 0.4), color: planMeta.color, fontSize: '0.72rem' }}
                onClick={() => router.push('/dashboard/billing')}>
                Upgrade Plan
              </Button>
            </Stack>
          </Box>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Box sx={{ mb: 2.5, p: 2, borderRadius: 1, border: `1px solid ${alpha(planMeta.color, 0.2)}`, bgcolor: alpha(planMeta.color, 0.04) }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: planMeta.color }}>{planMeta.label} Plan</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {planMeta.features.map((f) => (
                  <Box key={f} sx={{ px: 1.25, py: 0.3, borderRadius: 0.5, bgcolor: alpha(planMeta.color, 0.1), color: planMeta.color, fontSize: '0.65rem', fontWeight: 700 }}>
                    {f}
                  </Box>
                ))}
              </Stack>
            </Box>

            <Stack spacing={2}>
              {[
                { label: 'Projects', used: 3, limit: plan === 'developer' ? 5 : plan === 'pro' ? 20 : 1 },
                { label: 'Deployments this month', used: 12, limit: plan === 'developer' ? 20 : plan === 'pro' ? 100 : 5 },
                { label: 'API calls this month', used: 48200, limit: plan === 'developer' ? 100000 : plan === 'pro' ? 1000000 : 10000 },
              ].map((u) => {
                const pct = Math.min((u.used / u.limit) * 100, 100);
                const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
                return (
                  <Box key={u.label}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{u.label}</Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ color }}>{u.used.toLocaleString()} / {u.limit.toLocaleString()}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: alpha(color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }} />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Paper>

        {/* Security */}
        <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <SecurityIcon sx={{ fontSize: 17, color: '#10b981' }} />
              <Typography variant="subtitle2" fontWeight={800}>Security</Typography>
            </Stack>
          </Box>
          <Box sx={{ px: 3, py: 2 }}>
            <Stack spacing={1.5}>
              {[
                { label: 'Password', value: '••••••••••••', action: <Button size="small" sx={{ borderRadius: 1, fontSize: '0.72rem' }}>Change</Button> },
                { label: 'Two-factor authentication', value: 'Not enabled', action: <Button size="small" variant="outlined" sx={{ borderRadius: 1, fontSize: '0.72rem', borderColor: alpha('#10b981', 0.4), color: '#10b981' }}>Enable</Button> },
                { label: 'Active sessions', value: '1 session', action: <Button size="small" color="error" sx={{ borderRadius: 1, fontSize: '0.72rem' }} onClick={() => signOut()}>Sign out all</Button> },
              ].map((row) => (
                <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', alignItems: 'center', gap: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { border: 'none' } }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{row.label}</Typography>
                  <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ fontSize: '0.8rem' }}>{row.value}</Typography>
                  {row.action}
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>

        {/* Danger zone */}
        <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: alpha('#ef4444', 0.2) }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: alpha('#ef4444', 0.15), bgcolor: alpha('#ef4444', 0.02) }}>
            <Typography variant="subtitle2" fontWeight={800} color="error">Danger Zone</Typography>
          </Box>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" fontWeight={600}>Delete account</Typography>
                <Typography variant="caption" color="text.secondary">Permanently remove your account and all associated data. This cannot be undone.</Typography>
              </Box>
              <Button variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setDeleteOpen(true)}
                sx={{ borderRadius: 1, flexShrink: 0, ml: 3 }}>
                Delete
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>

      {/* Delete account dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Delete Account?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This action is irreversible. Type <strong>DELETE</strong> to confirm.
          </Typography>
          <TextField fullWidth size="small" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { setDeleteOpen(false); setConfirmText(''); }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={confirmText !== 'DELETE'}>Delete Account</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
