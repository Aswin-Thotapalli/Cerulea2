'use client';

// apps/frontend/src/app/dashboard/billing/page.tsx
//
// Post-signup add-on management. Reuses the SAME <AddonSelector> and
// <PriceSummary> components as the signup flow (src/components/billing/),
// pre-filled with the customer's current active add-ons, feeding the
// update-subscription flow (PATCH /api/billing/subscription/addons for
// purely recurring changes, POST /api/billing/addons/checkout for
// add-ons with a one-time component). Also surfaces the pay-per-use
// "Export Data" action for eligible tiers — never part of the add-on
// selector, charged once per click.

import * as React from 'react';
import {
  Box, Typography, Paper, Stack, Button, Divider, Alert, CircularProgress, Chip, Skeleton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { alpha, useTheme } from '@mui/material/styles';
import {
  getTierById, formatCents, type TierId, type AddonSelection,
} from '@/config/billing-catalog';
import AddonSelector from '@/components/billing/AddonSelector';
import PriceSummary from '@/components/billing/PriceSummary';

interface SubscriptionState {
  subscription: { id: string; tierId: TierId; status: string; currentPeriodEnd: string | null } | null;
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
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

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

  const handleSave = async () => {
    if (!data?.subscription) return;
    setSaving(true);
    setError(null);
    try {
      // Already-active one-time-bearing add-ons (e.g. block explorer) pass
      // through unchanged; genuinely new ones are routed to checkout via
      // onRequestOneTimeCheckout before they ever reach local selection
      // state, so everything in `selections` here is safe to PATCH.
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

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Billing</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your plan, add-ons, and one-off exports.
      </Typography>

      {notice && <Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2, borderRadius: 2 }}>{notice}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

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
          <Button variant="outlined" href="/pricing" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Change plan
          </Button>
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
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Add-ons</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Box sx={{ flex: 1.4, width: '100%' }}>
          <AddonSelector
            tierId={tier.id}
            selections={selections}
            onChange={setSelections}
            mode="dashboard"
            purchasedOneTimeAddonIds={purchasedOneTimeAddonIds}
            onRequestOneTimeCheckout={handleRequestOneTimeCheckout}
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
    </Box>
  );
}
