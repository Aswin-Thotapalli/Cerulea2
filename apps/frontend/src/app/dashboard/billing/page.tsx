'use client';

// apps/frontend/src/app/dashboard/billing/page.tsx
//
// Post-signup subscription management: change tier, cancel/resume the
// subscription, and add/remove individual add-ons. Reuses the SAME
// <AddonSelector> and <PriceSummary> components as the signup flow
// (src/components/billing/), pre-filled with the customer's current
// active add-ons. Add-ons cancel individually and instantly (no batch
// "Save" needed for removal — only for additions/quantity changes).
// Also surfaces the pay-per-use "Export Data" action for eligible tiers.

import * as React from 'react';
import {
  Box, Typography, Paper, Stack, Button, Divider, Alert, CircularProgress, Chip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { alpha, useTheme } from '@mui/material/styles';
import {
  TIERS, getTierById, getAddonById, isAddonEligibleForTier, formatCents, type TierId, type AddonSelection,
} from '@/config/billing-catalog';
import AddonSelector from '@/components/billing/AddonSelector';
import PriceSummary from '@/components/billing/PriceSummary';

interface SubscriptionState {
  subscription: {
    id: string; tierId: TierId; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean;
  } | null;
  tier: ReturnType<typeof getTierById> | null;
  addons: AddonSelection[];
  oneTimePurchases: { addonId: string | null; kind: string; createdAt: string }[];
}

function selectionsEqual(a: AddonSelection[], b: AddonSelection[]): boolean {
  if (a.length !== b.length) return false;
  const am = new Map(a.map((x) => [x.addonId, x.quantity]));
  return b.every((x) => am.get(x.addonId) === x.quantity);
}

export default function DashboardBillingPage() {
  const theme = useTheme();
  const [data, setData] = React.useState<SubscriptionState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selections, setSelections] = React.useState<AddonSelection[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [changingTier, setChangingTier] = React.useState<TierId | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const [resuming, setResuming] = React.useState(false);
  const [pendingTierChange, setPendingTierChange] = React.useState<TierId | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/subscription');
      const json: SubscriptionState & { ok: boolean } = await res.json();
      if (json.ok) {
        setData(json);
        setSelections(json.addons);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'success') setNotice('Add-on purchased — applying changes now.');
    if (params.get('export') === 'success') setNotice('Export started — check your downloads shortly.');
  }, [load]);

  const purchasedOneTimeAddonIds = React.useMemo(
    () => (data?.oneTimePurchases ?? []).filter((p) => p.kind === 'addon_one_time' && p.addonId).map((p) => p.addonId as string),
    [data]
  );

  const isDirty = data ? !selectionsEqual(selections, data.addons) : false;

  // What happens to each currently-active add-on if the pending tier
  // switch is confirmed — computed from the catalog's own eligibility
  // rules, the same ones the server enforces, so this can never drift
  // from what actually happens.
  const tierChangeImpact = React.useMemo(() => {
    if (!pendingTierChange || !data) return null;
    const willContinue: { id: string; name: string }[] = [];
    const willBeRemoved: { id: string; name: string }[] = [];
    for (const sel of data.addons) {
      const addon = getAddonById(sel.addonId);
      if (!addon) continue;
      (isAddonEligibleForTier(addon.id, pendingTierChange) ? willContinue : willBeRemoved).push({
        id: addon.id,
        name: addon.name,
      });
    }
    return { willContinue, willBeRemoved };
  }, [pendingTierChange, data]);

  const handleRequestOneTimeCheckout = async (addonId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/billing/addons/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ addonId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not start checkout for this add-on.');
        return;
      }
      window.location.href = json.url;
    } catch {
      setError('Could not start checkout for this add-on.');
    }
  };

  const handleInstantRemove = async (addonId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/billing/subscription/addons/remove', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ addonId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not cancel this add-on.');
        await load(); // revert any optimistic UI state
        return;
      }
      setNotice('Add-on canceled.');
      await load();
    } catch {
      setError('Could not cancel this add-on.');
      await load();
    }
  };

  const handleSave = async () => {
    if (!data?.subscription) return;
    setSaving(true);
    setError(null);
    try {
      // Already-active one-time-bearing add-ons (e.g. block explorer) pass
      // through unchanged; genuinely new ones are routed to checkout via
      // onRequestOneTimeCheckout before they ever reach local selection
      // state; removals are already applied instantly via onInstantRemove.
      // This only ever needs to add or change quantities.
      const res = await fetch('/api/billing/subscription/addons', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selections }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not update add-ons.');
        return;
      }
      setNotice('Subscription updated.');
      await load();
    } catch {
      setError('Could not update add-ons.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Export failed.');
        setExporting(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError('Export failed.');
      setExporting(false);
    }
  };

  const confirmChangeTier = async () => {
    if (!pendingTierChange) return;
    setChangingTier(pendingTierChange);
    setError(null);
    try {
      const res = await fetch('/api/billing/subscription/change-tier', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tierId: pendingTierChange }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not change plan.');
        return;
      }
      const continuedNames = tierChangeImpact?.willContinue.map((a) => a.name) ?? [];
      const parts = [`Switched to ${getTierById(pendingTierChange)?.name}.`];
      if (json.removedAddons?.length) parts.push(`Removed: ${json.removedAddons.join(', ')}.`);
      if (continuedNames.length) parts.push(`Continued unchanged: ${continuedNames.join(', ')}.`);
      setNotice(parts.join(' '));
      await load();
    } catch {
      setError('Could not change plan.');
    } finally {
      setChangingTier(null);
      setPendingTierChange(null);
    }
  };

  const handleCancel = async () => {
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/subscription/cancel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ atPeriodEnd: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not cancel subscription.');
        return;
      }
      setNotice('Subscription will end at the close of your current billing period.');
      await load();
    } catch {
      setError('Could not cancel subscription.');
    } finally {
      setCanceling(false);
      setCancelDialogOpen(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/subscription/resume', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not resume subscription.');
        return;
      }
      setNotice('Subscription resumed.');
      await load();
    } catch {
      setError('Could not resume subscription.');
    } finally {
      setResuming(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mt: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3, mt: 2 }} />
      </Box>
    );
  }

  if (!data?.subscription || !data.tier) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Billing</Typography>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          You don&apos;t have an active subscription yet. <a href="/pricing">Choose a plan</a> to get started.
        </Alert>
      </Box>
    );
  }

  const { tier, subscription } = data;
  const exportEligible = tier ? ['private_dapps', 'private_dapps_pro'].includes(tier.id) : false;
  const pendingCancellation = subscription.cancelAtPeriodEnd;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Billing</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your plan, add-ons, and one-off exports.
      </Typography>

      {notice && <Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2, borderRadius: 2 }}>{notice}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {pendingCancellation && (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleResume} disabled={resuming} sx={{ fontWeight: 700 }}>
              {resuming ? 'Resuming…' : 'Resume subscription'}
            </Button>
          }
        >
          Your subscription is set to cancel at the end of the current billing period
          {subscription.currentPeriodEnd ? ` (${new Date(subscription.currentPeriodEnd).toLocaleDateString()})` : ''}.
        </Alert>
      )}

      {/* Current plan */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h6" fontWeight={800}>{tier.name}</Typography>
              <Chip
                label={subscription.status}
                size="small"
                color={subscription.status === 'active' ? 'success' : 'default'}
                sx={{ fontWeight: 700, textTransform: 'capitalize' }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {formatCents(tier.priceCents)}/month base plan
            </Typography>
          </Box>
          {!pendingCancellation && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setCancelDialogOpen(true)}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Cancel subscription
            </Button>
          )}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          {tier.specs.map((s) => (
            <Box key={s.label}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="body2" fontWeight={700}>{s.value}</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Tier switcher */}
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Plan</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {TIERS.map((t) => {
          const isCurrent = t.id === tier.id;
          return (
            <Paper
              key={t.id}
              variant="outlined"
              sx={{
                flex: 1, p: 2.5, borderRadius: 2.5,
                borderColor: isCurrent ? 'primary.main' : 'divider',
                bgcolor: isCurrent ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>{t.name}</Typography>
                {isCurrent && <Chip label="Current" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />}
              </Stack>
              <Typography variant="h6" fontWeight={800} color={isCurrent ? 'primary.main' : 'text.primary'} sx={{ mb: 1.5 }}>
                {formatCents(t.priceCents)}<Typography component="span" variant="caption" color="text.secondary">/mo</Typography>
              </Typography>
              <Button
                fullWidth
                variant={isCurrent ? 'outlined' : 'contained'}
                disabled={isCurrent || changingTier !== null || pendingCancellation}
                onClick={() => setPendingTierChange(t.id)}
                startIcon={changingTier === t.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                {isCurrent ? 'Current plan' : changingTier === t.id ? 'Switching…' : 'Switch to this plan'}
              </Button>
            </Paper>
          );
        })}
      </Stack>

      {/* Pay-per-use export */}
      {exportEligible && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3, bgcolor: alpha(theme.palette.info.main, 0.04) }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Chain data export</Typography>
              <Typography variant="body2" color="text.secondary">
                Export your chain data as CSV or PDF. Charged once per export, not added to your subscription.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                disabled={exporting}
                onClick={() => handleExport('csv')}
                startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                disabled={exporting}
                onClick={() => handleExport('pdf')}
                startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Export PDF
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Add-on management */}
      <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>Add-ons</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Turn an add-on off to cancel it immediately. Turning one on, or changing a quantity, applies when you save.
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Box sx={{ flex: 1.4, width: '100%' }}>
          <AddonSelector
            tierId={tier.id}
            selections={selections}
            onChange={setSelections}
            mode="dashboard"
            purchasedOneTimeAddonIds={purchasedOneTimeAddonIds}
            onRequestOneTimeCheckout={handleRequestOneTimeCheckout}
            onInstantRemove={handleInstantRemove}
            disabled={saving}
          />
        </Box>
        <Box sx={{ flex: 1, width: '100%' }}>
          <PriceSummary tierId={tier.id} selections={selections} dueNowLabel="New monthly total" />
          <Button
            variant="contained"
            fullWidth
            disabled={!isDirty || saving}
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ mt: 2, py: 1.5, borderRadius: 2, fontWeight: 700 }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Box>
      </Stack>

      {/* Cancel subscription confirm dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Cancel subscription?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You&apos;ll keep access to {tier.name} and all your add-ons until the end of the current
            billing period{subscription.currentPeriodEnd ? ` on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ''}.
            You can resume any time before then.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={canceling}>Keep my plan</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleCancel}
            disabled={canceling}
            startIcon={canceling ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            {canceling ? 'Canceling…' : 'Cancel subscription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change tier confirm dialog */}
      <Dialog open={!!pendingTierChange} onClose={() => setPendingTierChange(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Switch to {pendingTierChange ? getTierById(pendingTierChange)?.name : ''}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: tierChangeImpact && (tierChangeImpact.willContinue.length || tierChangeImpact.willBeRemoved.length) ? 2 : 0 }}>
            Your billing updates immediately, prorated for the rest of this period.
          </DialogContentText>

          {tierChangeImpact && tierChangeImpact.willContinue.length === 0 && tierChangeImpact.willBeRemoved.length === 0 && (
            <DialogContentText>You have no active add-ons, so nothing else changes.</DialogContentText>
          )}

          {tierChangeImpact && tierChangeImpact.willBeRemoved.length > 0 && (
            <Box sx={{ mb: tierChangeImpact.willContinue.length > 0 ? 2 : 0 }}>
              <Typography variant="subtitle2" fontWeight={800} color="error.main" sx={{ mb: 0.75 }}>
                Will be removed — not available on this plan
              </Typography>
              <Stack spacing={0.5}>
                {tierChangeImpact.willBeRemoved.map((a) => (
                  <Stack key={a.id} direction="row" alignItems="center" spacing={1}>
                    <CancelIcon sx={{ fontSize: 18, color: 'error.main' }} />
                    <Typography variant="body2">{a.name}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {tierChangeImpact && tierChangeImpact.willContinue.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="success.main" sx={{ mb: 0.75 }}>
                Will continue, unchanged
              </Typography>
              <Stack spacing={0.5}>
                {tierChangeImpact.willContinue.map((a) => (
                  <Stack key={a.id} direction="row" alignItems="center" spacing={1}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2">{a.name}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setPendingTierChange(null)} disabled={changingTier !== null}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmChangeTier}
            disabled={changingTier !== null}
            startIcon={changingTier !== null ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            {changingTier !== null ? 'Switching…' : 'Confirm switch'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
