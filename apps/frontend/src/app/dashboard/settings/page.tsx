'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Button, Switch, FormControlLabel,
  TextField, Divider, LinearProgress, Chip, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SaveIcon from '@mui/icons-material/Save';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CodeIcon from '@mui/icons-material/Code';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import KeyIcon from '@mui/icons-material/Key';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LaptopIcon from '@mui/icons-material/Laptop';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const PLAN_COLOR: Record<string, string> = {
  public_dapps: '#4F46E5',
  private_dapps: '#9c27b0',
  private_dapps_pro: '#f59e0b',
  free: '#6b7280',
};
const PLAN_LABEL: Record<string, string> = {
  public_dapps: 'Public dApps',
  private_dapps: 'Private dApps',
  private_dapps_pro: 'Private dApps Pro',
  free: 'Free',
};

function SectionHeader({ icon, label, color = '#4F46E5', badge }: { icon: React.ReactNode; label: string; color?: string; badge?: React.ReactNode }) {
  return (
    <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(color, 0.03) }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color }}>{label}</Typography>
        {badge && <Box sx={{ ml: 'auto' }}>{badge}</Box>}
      </Stack>
    </Box>
  );
}

function UsageMeter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
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
        borderRadius: 1, height: 7,
        bgcolor: alpha(color, 0.12),
        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 1 },
      }} />
    </Box>
  );
}

function NotifRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
      <Box>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{desc}</Typography>
      </Box>
      <Switch size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} sx={{ flexShrink: 0, mt: 0.25 }} />
    </Stack>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const router = useRouter();
  const { data: session } = useSession();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  const [notifDigest, setNotifDigest] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifTips, setNotifTips] = useState(true);
  const [notifDeployment, setNotifDeployment] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [projectCount, setProjectCount] = useState<number | null>(null);

  const isTestAccount = session?.user?.email === 'test@cerulea.app';
  const user = session?.user as any;
  const currentPlan: string = user?.plan ?? 'free';
  const planColor = PLAN_COLOR[currentPlan] ?? '#6b7280';
  const planLabel = PLAN_LABEL[currentPlan] ?? currentPlan;

  const isDark = theme.palette.mode === 'dark';

  // Load profile data
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.user) setName(d.user.name ?? '');
        if (d.profile) {
          setCompany(d.profile.company ?? '');
          setRole(d.profile.role ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Load real project count
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjectCount((d.projects ?? []).length))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, role }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError('Failed to save. Please try again.');
    }
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
    <Box sx={{ p: 4, maxWidth: 860, mx: 'auto' }}>
      {/* Header */}
      <Box mb={5}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>ACCOUNT</Typography>
        <Typography variant="h4" fontWeight={900} sx={{
          background: `linear-gradient(135deg, ${isDark ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
        }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Manage your profile, security, subscription, and developer configuration.
        </Typography>
      </Box>

      {/* ── PROFILE ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <SectionHeader icon={<PersonIcon sx={{ fontSize: 15, color: '#4F46E5' }} />} label="PROFILE" />
        <Box sx={{ p: 3 }}>
          {profileLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
                <TextField label="Email Address" value={session?.user?.email ?? ''} fullWidth size="small" type="email" disabled helperText="Email cannot be changed" />
                <TextField label="Company / Organisation" value={company} onChange={(e) => setCompany(e.target.value)} fullWidth size="small" placeholder="Cerulea Bytechians" />
                <TextField label="Role" value={role} onChange={(e) => setRole(e.target.value)} fullWidth size="small" placeholder="Founder, Developer…" />
              </Box>
              {saveError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{saveError}</Alert>}
              <Button variant="contained" startIcon={saved ? <CheckCircleIcon /> : <SaveIcon />}
                onClick={handleSave} color={saved ? 'success' : 'primary'} sx={{ fontWeight: 700, borderRadius: 1 }}>
                {saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* ── SECURITY ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <SectionHeader icon={<SecurityIcon sx={{ fontSize: 15, color: '#8b5cf6' }} />} label="SECURITY" color="#8b5cf6" />
        <Box sx={{ p: 3 }}>
          {/* Password change */}
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Change Password</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
            <TextField label="Current Password" type="password" size="small" fullWidth value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <TextField label="New Password" type="password" size="small" fullWidth value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
            <TextField label="Confirm Password" type="password" size="small" fullWidth value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && confirmPassword !== newPassword} helperText={confirmPassword.length > 0 && confirmPassword !== newPassword ? 'Passwords do not match' : undefined} />
          </Box>
          <Button variant="outlined" size="small" sx={{ borderRadius: 1, fontWeight: 700, mb: 3 }} disabled={!newPassword || newPassword !== confirmPassword}>
            Update Password
          </Button>

          <Divider sx={{ mb: 3 }} />

          {/* 2FA */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} mb={3}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>Two-Factor Authentication</Typography>
                <Chip label={twoFaEnabled ? 'Enabled' : 'Disabled'} size="small" sx={{
                  height: 18, fontSize: '0.62rem', fontWeight: 700,
                  bgcolor: twoFaEnabled ? alpha('#10b981', 0.1) : alpha('#6b7280', 0.1),
                  color: twoFaEnabled ? '#10b981' : 'text.secondary',
                }} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Add an extra layer of protection. Use an authenticator app like Google Authenticator or Authy.
              </Typography>
            </Box>
            <Switch size="small" checked={twoFaEnabled} onChange={(e) => setTwoFaEnabled(e.target.checked)} sx={{ flexShrink: 0, mt: 0.25 }} />
          </Stack>
        </Box>
      </Paper>

      {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <SectionHeader icon={<NotificationsNoneIcon sx={{ fontSize: 15, color: '#f59e0b' }} />} label="NOTIFICATIONS" color="#f59e0b" />
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="body2" fontWeight={600}>Critical Alerts</Typography>
                <Typography variant="caption" color="text.secondary">Security events, failed deployments, billing issues. Always on.</Typography>
              </Box>
              <Switch size="small" checked disabled sx={{ flexShrink: 0, mt: 0.25 }} />
            </Stack>
            <Divider />
            <NotifRow label="Deployment Notifications" desc="Email when a deployment succeeds or fails." checked={notifDeployment} onChange={setNotifDeployment} />
            <NotifRow label="Weekly Digest" desc="A summary of your projects, API usage, and platform news." checked={notifDigest} onChange={setNotifDigest} />
            <NotifRow label="Studio Tips & Updates" desc="Feature announcements, best practices, and how-to guides." checked={notifTips} onChange={setNotifTips} />
            <NotifRow label="Marketing Emails" desc="Case studies, webinars, and promotional offers." checked={notifMarketing} onChange={setNotifMarketing} />
          </Stack>
          <Box mt={3}>
            <Button variant="outlined" size="small" startIcon={<SaveIcon />} onClick={handleSave}
              sx={{ borderRadius: 1, fontWeight: 700 }}>
              Save Preferences
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── DEVELOPER ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <SectionHeader icon={<CodeIcon sx={{ fontSize: 15, color: '#06b6d4' }} />} label="DEVELOPER" color="#06b6d4" />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: alpha('#06b6d4', 0.2), bgcolor: alpha('#06b6d4', 0.02) }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                <KeyIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
                <Typography variant="subtitle2" fontWeight={700}>API Keys</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Create and manage API keys for programmatic access to Cerulea APIs.
              </Typography>
              <Button size="small" variant="outlined" endIcon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                onClick={() => router.push('/dashboard/keys')}
                sx={{ borderRadius: 1, fontWeight: 700, fontSize: '0.72rem', borderColor: alpha('#06b6d4', 0.4), color: '#06b6d4' }}>
                Manage Keys
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: alpha('#06b6d4', 0.2), bgcolor: alpha('#06b6d4', 0.02) }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                <CodeIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
                <Typography variant="subtitle2" fontWeight={700}>Webhook Secret</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Used to verify that incoming webhook events are from Cerulea.
              </Typography>
              <TextField size="small" value="whsec_••••••••••••••••••••••••" fullWidth disabled
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.75rem' } }} />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: alpha('#06b6d4', 0.2), bgcolor: alpha('#06b6d4', 0.02) }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                <OpenInNewIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
                <Typography variant="subtitle2" fontWeight={700}>API Documentation</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Full REST API reference, SDKs, and code examples.
              </Typography>
              <Button size="small" variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                href="https://docs.cerulea.io" target="_blank" rel="noopener noreferrer"
                sx={{ borderRadius: 1, fontWeight: 700, fontSize: '0.72rem', borderColor: alpha('#06b6d4', 0.4), color: '#06b6d4' }}>
                Open Docs
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: alpha('#06b6d4', 0.2), bgcolor: alpha('#06b6d4', 0.02) }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                <CodeIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
                <Typography variant="subtitle2" fontWeight={700}>CLI Access</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
                Install the Cerulea CLI to deploy and manage from your terminal.
              </Typography>
              <Box sx={{ bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)', borderRadius: 1, px: 1.5, py: 0.75 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#06b6d4' }}>
                  npm install -g @cerulea/cli
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>

      {/* ── SUBSCRIPTION ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden', borderColor: alpha(planColor, 0.2), bgcolor: alpha(planColor, 0.01) }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: alpha(planColor, 0.15), bgcolor: alpha(planColor, 0.04) }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(planColor, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <StarIcon sx={{ fontSize: 15, color: planColor }} />
              </Box>
              <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: planColor }}>SUBSCRIPTION</Typography>
            </Stack>
            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: alpha(planColor, 0.12), color: planColor, fontWeight: 900, fontSize: '0.8rem', border: `1px solid ${alpha(planColor, 0.25)}` }}>
              {planLabel}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5} mb={3}>
            <UsageMeter label="Projects" used={projectCount ?? 0} limit={currentPlan === 'free' ? 1 : currentPlan === 'public_dapps' ? 3 : 999} />
          </Stack>
          <Divider sx={{ mb: 2.5 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Interested in upgrading your plan or enterprise pricing?</Typography>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" startIcon={<CreditCardIcon />} onClick={() => router.push('/dashboard/billing')}
                sx={{ borderRadius: 1, fontWeight: 700, whiteSpace: 'nowrap', borderColor: alpha(planColor, 0.4), color: planColor }}>
                Billing History
              </Button>
              <Button variant="outlined" startIcon={<ContactSupportIcon />} href="https://cerulea.io/company/contact-sales"
                target="_blank" rel="noopener noreferrer"
                sx={{ borderRadius: 1, fontWeight: 700, whiteSpace: 'nowrap', borderColor: alpha(planColor, 0.4), color: planColor }}>
                Contact Sales
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* ── DANGER ZONE ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha('#ef4444', 0.25), bgcolor: alpha('#ef4444', 0.01) }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: alpha('#ef4444', 0.15), bgcolor: alpha('#ef4444', 0.04) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#ef4444', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WarningAmberIcon sx={{ fontSize: 15, color: '#ef4444' }} />
            </Box>
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: '#ef4444' }}>DANGER ZONE</Typography>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={2}>
            {isTestAccount && (
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} p={2} sx={{
                borderRadius: 2, border: `1px solid ${alpha('#f59e0b', 0.2)}`, bgcolor: alpha('#f59e0b', 0.04),
              }}>
                <Box>
                  <Typography variant="body2" fontWeight={700}>Factory Reset Test Account</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Deletes ALL projects, drafts, AI threads, and clears all studio selections. Returns to a blank state.
                  </Typography>
                </Box>
                <Button variant="outlined" color="warning" startIcon={<RefreshIcon />} onClick={handleResetTestAccount}
                  disabled={resetLoading} sx={{ borderRadius: 1, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {resetDone ? 'Reset!' : resetLoading ? 'Resetting…' : 'Reset Account'}
                </Button>
              </Stack>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} p={2} sx={{
              borderRadius: 2, border: `1px solid ${alpha('#ef4444', 0.2)}`,
            }}>
              <Box>
                <Typography variant="body2" fontWeight={700}>Delete Account</Typography>
                <Typography variant="caption" color="text.secondary">
                  Permanently removes your account, all projects, deployed networks, snapshots, and API keys. This cannot be undone.
                </Typography>
              </Box>
              <Button variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setDeleteDialogOpen(true)}
                sx={{ borderRadius: 1, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                Delete Account
              </Button>
            </Stack>
          </Stack>

          {resetDone && (
            <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>Account factory reset complete. Redirecting to Studio…</Alert>
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
          <Button onClick={() => { setDeleteDialogOpen(false); setDeleteConfirm(''); }} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleteConfirm !== 'DELETE'} startIcon={<DeleteForeverIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Delete My Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
