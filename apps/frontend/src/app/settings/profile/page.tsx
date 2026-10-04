'use client';

// apps/frontend/src/app/settings/profile/page.tsx
// The profile screen.
// The identity card, the account details, the plan, the usage and the security
// rows all come from Cerulea APIs. The name changes through the account route,
// the sessions close through the sessions routes, and signing out closes the
// Cerulea APIs session behind the browser cookie.
// Without this screen a person sees no plan, no usage and no open session.

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Stack, Button, TextField, Avatar,
  Chip, Alert, CircularProgress, IconButton,
  LinearProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import SecurityIcon from '@mui/icons-material/Security';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PersonIcon from '@mui/icons-material/Person';

import { leaveTo } from './leave';

const PLAN_COLOR: Record<string, string> = {
  public_dapps: '#4F46E5',
  private_dapps: '#9c27b0',
  private_dapps_pro: '#f59e0b',
  ent_sme: '#4F46E5',
  ent_growth: '#9c27b0',
  ent_enterprise: '#f59e0b',
  govt_standard: '#0f766e',
};

/** The plain name of each usage metric Cerulea APIs meters. */
const METRIC_LABEL: Record<string, string> = {
  requests: 'Requests',
  transactions: 'Transactions',
  records_written: 'Records written',
  records_read: 'Records read',
  actions_invoked: 'Actions invoked',
  stream_minutes: 'Stream minutes',
  webhook_deliveries: 'Webhook deliveries',
  storage_bytes: 'Storage bytes',
};

/** The limit key of the entitlement each metered figure is measured against. */
const METRIC_LIMIT: Record<string, string> = {
  transactions: 'txPerMonth',
};

type ProfileView = {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    state: string;
    multiFactorActive: boolean;
    lastSignInAt: string | null;
  };
  profile: { displayName: string | null; avatarUrl: string | null; company: string | null; role: string | null };
  plan: {
    division: string | null;
    tierId: string | null;
    label: string;
    status: string | null;
    limits: Record<string, number>;
    specs: { label: string; value: string }[];
    pricingPath: string;
  };
  workspace: { workspaceId: string; name: string; application: string } | null;
  projectCount: number | null;
  usage: { from: string; to: string; totals: { metric: string; unit: string; quantity: number }[] } | null;
  usageFix: string | null;
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

function metricLabel(metric: string): string {
  if (METRIC_LABEL[metric]) return METRIC_LABEL[metric];
  const words = metric.split('_').join(' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const theme = useTheme();

  const [view, setView] = useState<ProfileView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const readView = useCallback(async () => {
    setViewError(null);
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error(await failureSentence(res, 'Cerulea APIs did not answer the profile read.'));
      const held = (await res.json()) as ProfileView;
      setView(held);
      setName(held.user.name);
    } catch (e: unknown) {
      setViewError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const readSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/sessions');
      if (!res.ok) return;
      const held = (await res.json()) as { count?: number; sessions?: unknown[] };
      setSessionCount(held.count ?? held.sessions?.length ?? null);
    } catch {
      setSessionCount(null);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void readView();
      void readSessions();
    }
  }, [status, readView, readSessions]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login?next=/settings/profile');
    return null;
  }

  const displayName = view?.user.name || session?.user?.name || '';
  const email = view?.user.email || session?.user?.email || '';
  const initials = (displayName || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const planColor = (view?.plan.tierId && PLAN_COLOR[view.plan.tierId]) || '#6b7280';
  const planLabel = view?.plan.label ?? '';
  const memberSince = view?.user.createdAt
    ? new Date(view.user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '';
  const lastSignIn = view?.user.lastSignInAt
    ? new Date(view.user.lastSignInAt).toLocaleString()
    : 'No sign in recorded yet';

  const handleSaveName = async () => {
    setSaving(true);
    setSaveMsg(null);
    setSaveFailed(false);
    try {
      const r = await fetch('/api/auth/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (r.ok) {
        const changed = (await r.json()) as { name?: string };
        const held = changed.name ?? name;
        setView((before) => (before ? { ...before, user: { ...before.user, name: held } } : before));
        setName(held);
        await update({ name: held });
        setSaveMsg('Name updated successfully');
        setEditingName(false);
      } else {
        setSaveFailed(true);
        setSaveMsg(await failureSentence(r, 'Cerulea APIs refused the new name. Try again.'));
      }
    } catch {
      setSaveFailed(true);
      setSaveMsg('Cerulea APIs did not answer. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    leaveTo('/api/auth/force-signout?next=/');
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      const res = await fetch('/api/dashboard/sessions/revocations', { method: 'POST' });
      if (!res.ok) {
        setSaveFailed(true);
        setSaveMsg(await failureSentence(res, 'Cerulea APIs refused to close the sessions.'));
        return;
      }
      const outcome = (await res.json()) as { signOutPath?: string };
      leaveTo(outcome.signOutPath ?? '/api/auth/force-signout?next=/auth/login');
    } catch {
      setSaveFailed(true);
      setSaveMsg('Cerulea APIs did not answer. Try again.');
    } finally {
      setSigningOutAll(false);
    }
  };

  const usageRows: { label: string; used: number; limit: number | null }[] = [];
  if (view) {
    if (view.projectCount !== null) {
      usageRows.push({ label: 'Projects', used: view.projectCount, limit: view.plan.limits.projects ?? null });
    }
    for (const total of view.usage?.totals ?? []) {
      const limitKey = METRIC_LIMIT[total.metric];
      usageRows.push({
        label: metricLabel(total.metric),
        used: total.quantity,
        limit: limitKey && view.plan.limits[limitKey] ? view.plan.limits[limitKey] : null,
      });
    }
  }

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: 3, py: 5 }}>
      {/* Page header, inline */}
      <Stack direction="row" alignItems="center" mb={4}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ fontWeight: 600, color: 'text.secondary', mr: 'auto' }}>
          Back
        </Button>
        <Button variant="outlined" startIcon={<LogoutIcon />} size="small" onClick={signOut} sx={{ borderRadius: 1 }}>
          Sign out
        </Button>
      </Stack>

      {saveMsg && (
        <Alert severity={saveFailed ? 'error' : 'success'} sx={{ mb: 3 }} onClose={() => setSaveMsg(null)}>
          {saveMsg}
        </Alert>
      )}
      {viewError && (
        <Alert severity="error" sx={{ mb: 3 }}
          action={<Button color="inherit" size="small" onClick={() => void readView()}>Read again</Button>}>
          {viewError}
        </Alert>
      )}

      {/* Identity Card */}
      <Paper variant="outlined" sx={{ p: 4, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={3} alignItems="flex-start">
          <Avatar sx={{
            width: 72, height: 72, fontSize: '1.5rem', fontWeight: 900,
            bgcolor: alpha('#4F46E5', 0.15), color: 'primary.main',
            border: `2px solid ${alpha('#4F46E5', 0.2)}`,
          }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
              {editingName ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                  <TextField
                    value={name} onChange={(e) => setName(e.target.value)}
                    size="small" autoFocus
                    inputProps={{ 'aria-label': 'Full name' }}
                    sx={{ flex: 1, '& .MuiInputBase-root': { fontSize: '1rem', fontWeight: 700 } }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  />
                  <IconButton size="small" color="primary" aria-label="Save name" onClick={() => void handleSaveName()} disabled={saving}>
                    {saving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                  </IconButton>
                  <IconButton size="small" aria-label="Cancel name edit" onClick={() => { setEditingName(false); setName(displayName); }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ) : (
                <>
                  <Typography variant="h6" fontWeight={800}>{displayName || '…'}</Typography>
                  <IconButton size="small" aria-label="Edit name" onClick={() => setEditingName(true)} sx={{ opacity: 0.45, '&:hover': { opacity: 1 } }}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={1.5}>{email}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {view && (
                <Chip
                  label={planLabel}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha(planColor, 0.12), color: planColor, border: `1px solid ${alpha(planColor, 0.25)}` }}
                />
              )}
              {memberSince && (
                <Chip label={`Member since ${memberSince}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha('#6b7280', 0.1), color: 'text.secondary' }} />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Account Details */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden', borderRadius: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <PersonIcon sx={{ fontSize: 17, color: 'primary.main' }} />
            <Typography variant="subtitle2" fontWeight={800}>Account Details</Typography>
          </Stack>
        </Box>
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2.5}>
            {[
              { label: 'Full Name', value: displayName },
              { label: 'Email', value: email },
              { label: 'Company', value: view?.profile.company ?? '' },
              { label: 'Role', value: view?.profile.role ?? '' },
              { label: 'Plan', value: planLabel },
              { label: 'Member Since', value: memberSince },
            ].map((row) => (
              <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.6rem' }}>
                  {row.label}
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>
                  {row.value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Paper>

      {/* Plan & Usage */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden', borderRadius: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(planColor, 0.02) }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CreditCardIcon sx={{ fontSize: 17, color: planColor }} />
              <Typography variant="subtitle2" fontWeight={800}>Plan & Usage</Typography>
            </Stack>
            <Button size="small" variant="outlined" sx={{ borderRadius: 1, borderColor: alpha(planColor, 0.4), color: planColor, fontSize: '0.72rem' }}
              onClick={() => router.push('/dashboard/billing')}>
              Upgrade Plan
            </Button>
          </Stack>
        </Box>
        <Box sx={{ px: 3, py: 2.5 }}>
          {!view ? (
            <Typography variant="caption" color="text.secondary">Cerulea is reading the plan and the usage.</Typography>
          ) : (
            <>
              <Box sx={{ mb: 2.5, p: 2, borderRadius: 1.5, border: `1px solid ${alpha(planColor, 0.2)}`, bgcolor: alpha(planColor, 0.04) }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: planColor, mb: 1 }}>{planLabel} Plan</Typography>
                {view.plan.specs.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {view.plan.specs.map((spec) => (
                      <Box key={spec.label} sx={{ px: 1.25, py: 0.3, borderRadius: 0.5, bgcolor: alpha(planColor, 0.1), color: planColor, fontSize: '0.65rem', fontWeight: 700 }}>
                        {spec.label}: {spec.value}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    The catalogue holds no specification for this plan. The pricing page lists the current plans.
                  </Typography>
                )}
              </Box>
              {view.workspace && (
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                  Usage of {view.workspace.name} over the last thirty days.
                </Typography>
              )}
              {view.usageFix && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{view.usageFix}</Alert>
              )}
              {usageRows.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No usage recorded in the last thirty days.</Typography>
              ) : (
                <Stack spacing={2}>
                  {usageRows.map((u) => {
                    const pct = u.limit ? Math.min((u.used / u.limit) * 100, 100) : 0;
                    const color = u.limit === null ? '#6b7280' : pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
                    return (
                      <Box key={u.label}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{u.label}</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color }}>
                            {u.limit === null ? u.used.toLocaleString() : `${u.used.toLocaleString()} / ${u.limit.toLocaleString()}`}
                          </Typography>
                        </Stack>
                        {u.limit !== null && (
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: alpha(color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }} />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}
              {view.usage && view.usage.totals.length === 0 && usageRows.length > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                  No metered usage recorded in the last thirty days.
                </Typography>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Security */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden', borderRadius: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <SecurityIcon sx={{ fontSize: 17, color: '#10b981' }} />
            <Typography variant="subtitle2" fontWeight={800}>Security</Typography>
          </Stack>
        </Box>
        <Box sx={{ px: 3, py: 2 }}>
          <Stack spacing={0}>
            {[
              {
                label: 'Password',
                value: '••••••••••••',
                action: <Button size="small" href="/dashboard/settings#password" sx={{ borderRadius: 1, fontSize: '0.72rem' }}>Change</Button>,
              },
              {
                label: 'Two-factor authentication',
                value: view ? (view.user.multiFactorActive ? 'Enabled' : 'Awaiting activation') : '',
                action: <Box />,
              },
              {
                label: 'Active sessions',
                value: sessionCount === null ? '' : `${sessionCount} ${sessionCount === 1 ? 'device' : 'devices'}`,
                action: (
                  <Button size="small" color="error" sx={{ borderRadius: 1, fontSize: '0.72rem' }}
                    disabled={signingOutAll} onClick={() => void handleSignOutAll()}>
                    Sign out all
                  </Button>
                ),
              },
              {
                label: 'Last sign in',
                value: view ? lastSignIn : '',
                action: <Box />,
              },
            ].map((row, i, arr) => (
              <Box key={row.label} sx={{ py: 1.5, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider', display: 'grid', gridTemplateColumns: '200px 1fr auto', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{row.label}</Typography>
                <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ fontSize: '0.8rem' }}>{row.value}</Typography>
                {row.action}
              </Box>
            ))}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
