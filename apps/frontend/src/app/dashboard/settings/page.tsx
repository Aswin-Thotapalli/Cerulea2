'use client';

import { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Button,
  TextField, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import SaveIcon from '@mui/icons-material/Save';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const PLAN_COLOR: Record<string, string> = {
  Developer: '#4F46E5', Pro: '#9c27b0', Enterprise: '#f59e0b',
};

const USAGE = {
  projects: { used: 3, limit: 5 },
  deployments: { used: 12, limit: 20 },
  apiCalls: { used: 48_200, limit: 100_000 },
  storage: { used: 4.8, limit: 10 },
};

function UsageMeter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const theme = useTheme();
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {used > 1000 ? used.toLocaleString() : used}{unit ? ` ${unit}` : ''} / {limit > 1000 ? limit.toLocaleString() : limit}{unit ? ` ${unit}` : ''}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} sx={{
        borderRadius: 999, height: 7,
        bgcolor: alpha(color, 0.12),
        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
      }} />
    </Box>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const { data: session } = useSession();

  const [name, setName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [saved, setSaved] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const isTestAccount = session?.user?.email === 'test@cerulea.app';
  const currentPlan = 'Developer';
  const planColor = PLAN_COLOR[currentPlan] || '#4F46E5';

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetTestAccount = async () => {
    setResetLoading(true);
    try {
      await fetch('/api/test-account/reset', { method: 'POST' });
      const STUDIO_KEYS = [
        'cerulea.projectType', 'cerulea.templateId', 'cerulea.templateModules',
        'cerulea.step1.graph', 'cerulea.step3.economics', 'cerulea.step4.integrations',
        'cerulea.step5.ui', 'cerulea.deployed',
        'draft:local:1', 'draft:local:2', 'draft:local:3', 'draft:local:4',
        'draft:local:5', 'draft:local:6', 'draft:local:7',
      ];
      STUDIO_KEYS.forEach((k) => localStorage.removeItem(k));
      Object.keys(localStorage).filter((k) => k.startsWith('guidance:dismissed:')).forEach((k) => localStorage.removeItem(k));
      setResetDone(true);
      setTimeout(() => {
        const isLocal = window.location.hostname.includes('localhost');
        window.location.href = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
      }, 1500);
    } catch {} finally { setResetLoading(false); }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 860 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>ACCOUNT</Typography>
        <Typography variant="h4" fontWeight={900} sx={{
          background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
        }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Manage your profile, subscription, and account configuration.
        </Typography>
      </Box>

      {/* Profile */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>PROFILE</Typography>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            <Grid xs={12} sm={6}>
              <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" type="email" />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField label="Current Password" type="password" placeholder="Leave blank to keep unchanged" fullWidth size="small" />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField label="New Password" type="password" placeholder="Minimum 8 characters" fullWidth size="small" />
            </Grid>
          </Grid>
          <Box mt={2.5}>
            <Button variant="contained" startIcon={saved ? <CheckCircleIcon /> : <SaveIcon />}
              onClick={handleSave} color={saved ? 'success' : 'primary'} sx={{ borderRadius: 999, fontWeight: 700 }}>
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Subscription */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3, borderColor: alpha(planColor, 0.2), bgcolor: alpha(planColor, 0.02) }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: alpha(planColor, 0.15), bgcolor: alpha(planColor, 0.04) }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(planColor, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StarIcon sx={{ fontSize: 15, color: planColor }} />
              </Box>
              <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: planColor }}>SUBSCRIPTION</Typography>
            </Stack>
            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: alpha(planColor, 0.12), color: planColor, fontWeight: 900, fontSize: '0.8rem', border: `1px solid ${alpha(planColor, 0.25)}` }}>
              {currentPlan}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5} mb={3}>
            <UsageMeter label="Projects" used={USAGE.projects.used} limit={USAGE.projects.limit} />
            <UsageMeter label="Deployments this month" used={USAGE.deployments.used} limit={USAGE.deployments.limit} />
            <UsageMeter label="API Calls" used={USAGE.apiCalls.used} limit={USAGE.apiCalls.limit} unit="calls" />
            <UsageMeter label="Storage" used={USAGE.storage.used} limit={USAGE.storage.limit} unit="GB" />
          </Stack>

          <Divider sx={{ mb: 2.5 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Interested in upgrading your plan or enterprise pricing?</Typography>
            <Button variant="outlined" startIcon={<ContactSupportIcon />} href="https://cerulea.io/company/contact-sales"
              target="_blank" rel="noopener noreferrer"
              sx={{ borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap', ml: 2, borderColor: alpha(planColor, 0.4), color: planColor }}>
              Contact Sales
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Danger zone */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha('#ef4444', 0.25), bgcolor: alpha('#ef4444', 0.02) }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: alpha('#ef4444', 0.15), bgcolor: alpha('#ef4444', 0.04) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#ef4444', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WarningAmberIcon sx={{ fontSize: 15, color: '#ef4444' }} />
            </Box>
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: '#ef4444' }}>DANGER ZONE</Typography>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={2}>
            {isTestAccount && (
              <Stack direction="row" alignItems="center" justifyContent="space-between" p={2} sx={{
                borderRadius: 2, border: `1px solid ${alpha('#f59e0b', 0.2)}`, bgcolor: alpha('#f59e0b', 0.04),
              }}>
                <Box>
                  <Typography variant="body2" fontWeight={700}>Factory Reset Test Account</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Deletes ALL projects, drafts, AI threads, and clears all studio selections. Returns to a blank state.
                  </Typography>
                </Box>
                <Button variant="outlined" color="warning" startIcon={<RefreshIcon />} onClick={handleResetTestAccount}
                  disabled={resetLoading} sx={{ borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap', ml: 2 }}>
                  {resetDone ? 'Reset!' : resetLoading ? 'Resetting…' : 'Reset Account'}
                </Button>
              </Stack>
            )}

            <Stack direction="row" alignItems="center" justifyContent="space-between" p={2} sx={{
              borderRadius: 2, border: `1px solid ${alpha('#ef4444', 0.2)}`,
            }}>
              <Box>
                <Typography variant="body2" fontWeight={700}>Delete Account</Typography>
                <Typography variant="caption" color="text.secondary">
                  Permanently remove your account, all projects, and deployed networks. This cannot be undone.
                </Typography>
              </Box>
              <Button variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setDeleteDialogOpen(true)}
                sx={{ borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap', ml: 2 }}>
                Delete Account
              </Button>
            </Stack>
          </Stack>

          {resetDone && (
            <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>Account factory reset complete. Redirecting to Studio...</Alert>
          )}
        </Box>
      </Paper>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setDeleteConfirm(''); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeleteForeverIcon />
            <span>Delete Account</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: 2, mb: 2.5 }}>
            This will permanently delete your account, all projects, deployed networks, snapshots, and API keys. There is no recovery.
          </Alert>
          <Typography variant="body2" color="text.secondary" mb={1.5}>Type <strong>DELETE</strong> to confirm:</Typography>
          <TextField fullWidth size="small" placeholder="DELETE" value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            error={deleteConfirm.length > 0 && deleteConfirm !== 'DELETE'} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDeleteDialogOpen(false); setDeleteConfirm(''); }} sx={{ borderRadius: 999 }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleteConfirm !== 'DELETE'} startIcon={<DeleteForeverIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}>
            Delete My Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
