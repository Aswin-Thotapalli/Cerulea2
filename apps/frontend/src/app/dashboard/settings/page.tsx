'use client';

// apps/frontend/src/app/dashboard/settings/page.tsx
// The account screen under the dashboard.
// The profile, the password, the second factor, the open sessions, the plan,
// the usage and the workspace members all come from Cerulea APIs. Every
// control here performs a real action through a Studio route.
// Without this screen nobody can change a name, a password or see where an
// account is signed in.

import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Button,
  TextField, Divider, LinearProgress, Chip, Alert, CircularProgress,
  MenuItem, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import SaveIcon from '@mui/icons-material/Save';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import CodeIcon from '@mui/icons-material/Code';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import KeyIcon from '@mui/icons-material/Key';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LaptopIcon from '@mui/icons-material/Laptop';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupIcon from '@mui/icons-material/Group';

import { ROLE_MEANING } from '@/components/dashboard/wording';

const PLAN_COLOR: Record<string, string> = {
  public_dapps: '#4F46E5',
  private_dapps: '#9c27b0',
  private_dapps_pro: '#f59e0b',
  ent_sme: '#4F46E5',
  ent_growth: '#9c27b0',
  ent_enterprise: '#f59e0b',
  govt_standard: '#0f766e',
};

type SettingsView = {
  account: {
    accountId: string;
    email: string;
    displayName: string;
    state: string;
    multiFactorActive: boolean;
    lastSignInAt?: string | null;
    createdAt: string;
  };
  sessions: SessionRow[];
  workspace: { workspaceId: string; name: string; application: string; tier: string };
  members: {
    memberId: string;
    email: string;
    displayName: string;
    role: string;
    state: string;
  }[];
  roles: { role: string; capabilities: string[] }[];
  plan: {
    division: string | null;
    tierId: string | null;
    label: string;
    status: string | null;
    limits: Record<string, number>;
    pricingPath: string;
  };
  projectCount: number;
};

type SessionRow = {
  sessionId: string;
  device: string;
  networkAddress: string;
  issuedAt: string;
  expiresAt: string;
  current: boolean;
};

type ProfileAnswer = {
  user: { name: string; email: string };
  profile: { company: string | null; role: string | null } | null;
};

/** Reads the one sentence every Studio failure carries. */
async function failureSentence(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (body && typeof body.error === 'string') return body.error;
  if (body && body.error && typeof body.error === 'object') {
    const inner = body.error as { message?: string; fix?: string };
    return `${inner.message ?? ''} ${inner.fix ?? ''}`.trim() || fallback;
  }
  return fallback;
}

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

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  if (limit === null || limit <= 0) {
    return (
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
          <Typography variant="body2" fontWeight={600}>{label}</Typography>
          <Typography variant="caption" color="text.secondary">{used.toLocaleString()}, no limit on record</Typography>
        </Stack>
      </Box>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {used.toLocaleString()} / {limit.toLocaleString()}
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

export default function SettingsPage() {
  const theme = useTheme();
  const router = useRouter();

  const [view, setView] = useState<SettingsView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [sessionError, setSessionError] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('builder');
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const isDark = theme.palette.mode === 'dark';
  const planColor = (view?.plan.tierId && PLAN_COLOR[view.plan.tierId]) || '#6b7280';
  const planLabel = view?.plan.label ?? '';
  const projectLimit = view?.plan.limits.projects ?? null;

  const readView = useCallback(async () => {
    setViewError(null);
    try {
      const res = await fetch('/api/dashboard/settings');
      if (!res.ok) throw new Error(await failureSentence(res, 'Cerulea APIs did not answer the account read.'));
      setView((await res.json()) as SettingsView);
    } catch (e: unknown) {
      setViewError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Load the profile fields
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((d: ProfileAnswer) => {
        if (d.user) {
          setName(d.user.name ?? '');
          setEmail(d.user.email ?? '');
        }
        if (d.profile) {
          setCompany(d.profile.company ?? '');
          setRole(d.profile.role ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Load the account, the sessions, the plan and the workspace
  useEffect(() => { void readView(); }, [readView]);

  const handleSave = async () => {
    setSaveError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, role }),
      });
      if (!res.ok) throw new Error(await failureSentence(res, 'Cerulea APIs refused the save. Try again.'));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  };

  const handlePasswordChange = async () => {
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error(await failureSentence(res, 'Cerulea APIs refused the password change.'));
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : String(e));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    setSessionError(null);
    setClosing(sessionId);
    try {
      const res = await fetch(`/api/dashboard/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await failureSentence(res, 'Cerulea APIs refused to close the session.'));
      await readView();
    } catch (e: unknown) {
      setSessionError(e instanceof Error ? e.message : String(e));
    } finally {
      setClosing(null);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    setInviteError(null);
    setInviteNotice(null);
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, workspaceId: view?.workspace.workspaceId }),
      });
      if (!res.ok) throw new Error(await failureSentence(res, 'Cerulea APIs refused the invitation.'));
      const outcome = (await res.json()) as { guidance?: string };
      setInviteNotice(outcome.guidance ?? `Cerulea sent the invitation to ${inviteEmail}.`);
      setInviteEmail('');
      await readView();
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : String(e));
    } finally {
      setInviting(false);
    }
  };

  const twoFaEnabled = view?.account.multiFactorActive ?? false;
  const sessions = view?.sessions ?? [];

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
          Our profile, security, subscription and developer access live here.
        </Typography>
      </Box>

      {viewError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}
          action={<Button color="inherit" size="small" onClick={() => void readView()}>Read again</Button>}>
          {viewError}
        </Alert>
      )}

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
                <TextField label="Email Address" value={email} fullWidth size="small" type="email" disabled helperText="The email address stays fixed" />
                <TextField label="Company / Organisation" value={company} onChange={(e) => setCompany(e.target.value)} fullWidth size="small" placeholder="Caerulean Bytechains" />
                <TextField label="Role" value={role} onChange={(e) => setRole(e.target.value)} fullWidth size="small" placeholder="Founder, Builder…" />
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
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }} id="password">
        <SectionHeader icon={<SecurityIcon sx={{ fontSize: 15, color: '#8b5cf6' }} />} label="SECURITY" color="#8b5cf6" />
        <Box sx={{ p: 3 }}>
          {/* Password change */}
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Change Password</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
            <TextField label="Current Password" type="password" size="small" fullWidth value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <TextField label="New Password" type="password" size="small" fullWidth value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least twelve characters" />
            <TextField label="Confirm Password" type="password" size="small" fullWidth value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && confirmPassword !== newPassword} helperText={confirmPassword.length > 0 && confirmPassword !== newPassword ? 'The two passwords differ' : undefined} />
          </Box>
          {passwordError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{passwordError}</Alert>}
          {passwordSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Password updated successfully.</Alert>}
          <Button variant="outlined" size="small" sx={{ borderRadius: 1, fontWeight: 700, mb: 3 }}
            onClick={handlePasswordChange}
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || passwordLoading}>
            {passwordLoading ? 'Updating…' : 'Update Password'}
          </Button>

          <Divider sx={{ mb: 3 }} />

          {/* Second factor */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} mb={3}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>Two-Factor Authentication</Typography>
                {view && (
                  <Chip label={twoFaEnabled ? 'Enabled' : 'Awaiting activation'} size="small" sx={{
                    height: 18, fontSize: '0.62rem', fontWeight: 700,
                    bgcolor: twoFaEnabled ? alpha('#10b981', 0.1) : alpha('#f59e0b', 0.1),
                    color: twoFaEnabled ? '#10b981' : '#b45309',
                  }} />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Every Cerulea account signs in with a password and a six digit code from an authenticator app.
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* Recent Login Sessions */}
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Recent Login Sessions</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Each session binds to the device and the network it opened from. Closing one stops it at once.
          </Typography>
          {sessionError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{sessionError}</Alert>}
          <Stack spacing={1.5}>
            {!view && !viewError ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
            ) : sessions.length === 0 ? (
              <Typography variant="caption" color="text.secondary">No session is open.</Typography>
            ) : sessions.map((s) => (
              <Stack key={s.sessionId} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.04), border: '1px solid', borderColor: alpha('#8b5cf6', 0.1) }}>
                <LaptopIcon sx={{ fontSize: 18, color: '#8b5cf6', flexShrink: 0 }} />
                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" fontWeight={600}>
                    {s.device}{s.networkAddress ? ` from ${s.networkAddress}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Opened {new Date(s.issuedAt).toLocaleString()}, ends {new Date(s.expiresAt).toLocaleString()}
                  </Typography>
                </Box>
                {s.current ? (
                  <Chip label="This device" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981' }} />
                ) : (
                  <Button size="small" color="error" sx={{ borderRadius: 1, fontWeight: 700, fontSize: '0.72rem' }}
                    disabled={closing === s.sessionId}
                    onClick={() => void handleCloseSession(s.sessionId)}>
                    Close
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
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
                <OpenInNewIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
                <Typography variant="subtitle2" fontWeight={700}>API Documentation</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                The Cerulea APIs reference with worked examples for every route.
              </Typography>
              <Button size="small" variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                href="/docs/" target="_blank" rel="noopener noreferrer"
                sx={{ borderRadius: 1, fontWeight: 700, fontSize: '0.72rem', borderColor: alpha('#06b6d4', 0.4), color: '#06b6d4' }}>
                Open Docs
              </Button>
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
            {view && (
              <Box data-testid="plan-label" sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: alpha(planColor, 0.12), color: planColor, fontWeight: 900, fontSize: '0.8rem', border: `1px solid ${alpha(planColor, 0.25)}` }}>
                {planLabel}
              </Box>
            )}
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5} mb={3}>
            {view ? (
              <UsageMeter label="Projects" used={view.projectCount} limit={projectLimit} />
            ) : (
              <Typography variant="caption" color="text.secondary">Cerulea is reading the plan.</Typography>
            )}
          </Stack>
          <Divider sx={{ mb: 2.5 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">A plan change or enterprise pricing starts with a word to sales.</Typography>
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

      {/* ── WORKSPACE ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <SectionHeader icon={<GroupIcon sx={{ fontSize: 15, color: '#0ea5e9' }} />} label="WORKSPACE" color="#0ea5e9"
          badge={view ? <Typography variant="caption" fontWeight={700} color="text.secondary">{view.workspace.name}</Typography> : undefined} />
        <Box sx={{ p: 3 }}>
          {!view ? (
            <Typography variant="caption" color="text.secondary">Cerulea is reading the workspace members.</Typography>
          ) : (
            <>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Members</Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Person</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>What the role may do</TableCell>
                    <TableCell>State</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.members.map((member) => (
                    <TableRow key={member.memberId}>
                      <TableCell>{member.displayName || member.email}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>{ROLE_MEANING[member.role] ?? ''}</TableCell>
                      <TableCell>
                        <Chip size="small" color={member.state === 'active' ? 'success' : 'default'} label={member.state} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="subtitle2" fontWeight={700} mb={1}>Invite a colleague</Typography>
              {inviteNotice && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setInviteNotice(null)}>{inviteNotice}</Alert>}
              {inviteError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{inviteError}</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <TextField
                  label="Email address"
                  size="small"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  sx={{ minWidth: 260 }}
                  helperText="Cerulea sends the invitation link to this address."
                />
                <TextField
                  select
                  label="Role"
                  size="small"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                  sx={{ minWidth: 200 }}
                  helperText={ROLE_MEANING[inviteRole] ?? ''}
                >
                  {view.roles.map((entry) => (
                    <MenuItem key={entry.role} value={entry.role}>{entry.role}</MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" onClick={() => void handleInvite()}
                  disabled={inviting || inviteEmail.trim().length < 5}
                  sx={{ borderRadius: 1, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Send the invitation
                </Button>
              </Stack>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
