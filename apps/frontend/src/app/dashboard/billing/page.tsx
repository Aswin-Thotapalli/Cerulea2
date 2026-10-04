'use client';

// apps/frontend/src/app/dashboard/billing/page.tsx
// The billing screen of one division: the plan, the add-ons, the chain data
// export, the payment method, the billing address, the tax identifiers and
// the invoices. Every read and every change goes through the Studio billing
// routes onto Cerulea APIs, which keeps the subscription with the payments
// driver. The tiers, add-ons and prices come from the priced catalogue.
// An account paying in more than one division switches between them here.

import * as React from 'react';
import {
  Box, Typography, Paper, Stack, Button, Divider, Alert, CircularProgress, Chip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { alpha, useTheme } from '@mui/material/styles';
import { useSearchParams } from 'next/navigation';

import { DIVISION_LABELS, asDivision, type Division } from '@/config/divisions';
import { getClientDivision } from '@/lib/division-client';
import AddonSelector from '@/components/billing/AddonSelector';
import { openAddress } from '@/components/billing/open-address';
import PriceSummary from '@/components/billing/PriceSummary';
import {
  CatalogueProvider,
  type AddonSelection,
  type CatalogueTier,
  formatCents,
  useCatalogue,
} from '@/components/billing/CatalogueProvider';
import {
  type AccessAnswer,
  billingDivisionChoice,
  paidDivisions,
} from '@/components/billing/plan-standing';

// ─── types ────────────────────────────────────────────────────────────────────

interface SubscriptionState {
  subscription: {
    id: string; tierId: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean;
  } | null;
  tier: CatalogueTier | null;
  addons: AddonSelection[];
  oneTimePurchases: { addonId: string | null; kind: string; createdAt: string }[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function selectionsEqual(a: AddonSelection[], b: AddonSelection[]): boolean {
  if (a.length !== b.length) return false;
  const am = new Map(a.map((x) => [x.addonId, x.quantity]));
  return b.every((x) => am.get(x.addonId) === x.quantity);
}

function formatInvoiceAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

/** The period word beside a tier price. */
function tierPeriod(tier: CatalogueTier): string {
  return tier.billing === 'one_time' ? 'one time licence' : 'per month';
}

/** Sends one billing change with the division in the body. */
async function postBilling(path: string, division: Division, body: Record<string, unknown> = {}, method = 'POST') {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, division }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.ok === true, json };
}

// ─── main billing page ────────────────────────────────────────────────────────

export default function DashboardBillingPage() {
  return (
    <CatalogueProvider>
      <React.Suspense fallback={<BillingSkeleton />}>
        <BillingScreen />
      </React.Suspense>
    </CatalogueProvider>
  );
}

function BillingSkeleton() {
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
      <Skeleton variant="text" width={240} height={40} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mt: 2 }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3, mt: 2 }} />
    </Box>
  );
}

function BillingScreen() {
  const theme = useTheme();
  const catalogue = useCatalogue();
  const searchParams = useSearchParams();
  const namedDivision = asDivision(searchParams.get('division'));

  const [access, setAccess] = React.useState<AccessAnswer | null>(null);
  const [division, setDivision] = React.useState<Division | null>(null);
  const [data, setData] = React.useState<SubscriptionState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selections, setSelections] = React.useState<AddonSelection[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [changingTier, setChangingTier] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const [resuming, setResuming] = React.useState(false);
  const [pendingTierChange, setPendingTierChange] = React.useState<string | null>(null);

  // The standing names the divisions the account pays in and picks the first one to show.
  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/access')
      .then((res) => res.json())
      .then((json: AccessAnswer) => {
        if (cancelled) return;
        setAccess(json);
        setDivision(billingDivisionChoice(json, namedDivision, getClientDivision()));
      })
      .catch(() => {
        if (cancelled) return;
        setDivision(namedDivision ?? getClientDivision() ?? 'dapp');
      });
    return () => { cancelled = true; };
  }, [namedDivision]);

  const load = React.useCallback(async () => {
    if (!division) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/billing/subscription?division=${division}`);
      const json: SubscriptionState & { ok: boolean; error?: string } = await res.json();
      if (json.ok) {
        setData(json);
        setSelections(json.addons);
      } else {
        setData(null);
        setLoadError(json.error || 'Cerulea APIs gave no answer for the subscription. Open the screen again.');
      }
    } catch {
      setData(null);
      setLoadError('Cerulea APIs gave no answer for the subscription. Open the screen again.');
    } finally {
      setLoading(false);
    }
  }, [division]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'success') setNotice('Add-on purchased. The change applies now.');
    if (params.get('export') === 'success') setNotice('Export started. The file arrives in the downloads shortly.');
  }, []);

  const purchasedOneTimeAddonIds = React.useMemo(
    () => (data?.oneTimePurchases ?? []).filter((p) => p.kind === 'addon_one_time' && p.addonId).map((p) => p.addonId as string),
    [data]
  );

  const isDirty = data ? !selectionsEqual(selections, data.addons) : false;

  const tierChangeImpact = React.useMemo(() => {
    if (!pendingTierChange || !data) return null;
    const willContinue: { id: string; name: string }[] = [];
    const willBeRemoved: { id: string; name: string }[] = [];
    for (const sel of data.addons) {
      const addon = catalogue.addonById(sel.addonId);
      if (!addon) continue;
      (catalogue.isAddonEligible(addon.id, pendingTierChange) ? willContinue : willBeRemoved).push({
        id: addon.id,
        name: addon.name,
      });
    }
    return { willContinue, willBeRemoved };
  }, [pendingTierChange, data, catalogue]);

  const handleRequestOneTimeCheckout = async (addonId: string) => {
    if (!division) return;
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/addons/checkout', division, { addonId });
      if (!ok) {
        setError(json.error || 'The add-on purchase did not start. Try again.');
        return;
      }
      openAddress(json.url);
    } catch {
      setError('The add-on purchase did not start. Try again.');
    }
  };

  const handleInstantRemove = async (addonId: string) => {
    if (!division) return;
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/subscription/addons/remove', division, { addonId });
      if (!ok) {
        setError(json.error || 'The add-on is still on the subscription. Try again.');
        await load();
        return;
      }
      setNotice('Add-on ended.');
      await load();
    } catch {
      setError('The add-on is still on the subscription. Try again.');
      await load();
    }
  };

  const handleSave = async () => {
    if (!data?.subscription || !division) return;
    setSaving(true);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/subscription/addons', division, { selections }, 'PATCH');
      if (!ok) {
        setError(json.error || 'The add-ons stayed as they were. Try again.');
        return;
      }
      if (typeof json.url === 'string' && json.devMode !== true) {
        openAddress(json.url);
        return;
      }
      setNotice('Subscription updated.');
      await load();
    } catch {
      setError('The add-ons stayed as they were. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!division) return;
    setExporting(true);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/export', division, { format });
      if (!ok) {
        setError(json.error || 'The export did not start. Try again.');
        setExporting(false);
        return;
      }
      openAddress(json.url);
    } catch {
      setError('The export did not start. Try again.');
      setExporting(false);
    }
  };

  const confirmChangeTier = async () => {
    if (!pendingTierChange || !division) return;
    setChangingTier(pendingTierChange);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/subscription/change-tier', division, { tierId: pendingTierChange });
      if (!ok) {
        setError(json.error || 'The plan stayed as it was. Try again.');
        return;
      }
      if (typeof json.url === 'string' && json.devMode !== true) {
        openAddress(json.url);
        return;
      }
      const continuedNames = tierChangeImpact?.willContinue.map((a) => a.name) ?? [];
      const parts = [`Switched to ${catalogue.tierById(pendingTierChange)?.name ?? pendingTierChange}.`];
      if (json.removedAddons?.length) parts.push(`Removed: ${json.removedAddons.join(', ')}.`);
      if (continuedNames.length) parts.push(`Continued unchanged: ${continuedNames.join(', ')}.`);
      setNotice(parts.join(' '));
      await load();
    } catch {
      setError('The plan stayed as it was. Try again.');
    } finally {
      setChangingTier(null);
      setPendingTierChange(null);
    }
  };

  const handleCancel = async () => {
    if (!division) return;
    setCanceling(true);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/subscription/cancel', division, { atPeriodEnd: true });
      if (!ok) {
        setError(json.error || 'The subscription is still open. Try again.');
        return;
      }
      setNotice('The subscription ends at the close of the current billing period.');
      await load();
    } catch {
      setError('The subscription is still open. Try again.');
    } finally {
      setCanceling(false);
      setCancelDialogOpen(false);
    }
  };

  const handleResume = async () => {
    if (!division) return;
    setResuming(true);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/subscription/resume', division);
      if (!ok) {
        setError(json.error || 'The subscription still ends at the close of the period. Try again.');
        return;
      }
      setNotice('Subscription resumed.');
      await load();
    } catch {
      setError('The subscription still ends at the close of the period. Try again.');
    } finally {
      setResuming(false);
    }
  };

  const paid = paidDivisions(access);
  const divisionSwitcher = division && paid.length > 1 && (
    <Stack direction="row" spacing={1} sx={{ mb: 3 }} role="tablist" aria-label="Division">
      {paid.map((entry) => (
        <Chip
          key={entry}
          label={DIVISION_LABELS[entry].title}
          color={entry === division ? 'primary' : 'default'}
          variant={entry === division ? 'filled' : 'outlined'}
          onClick={() => setDivision(entry)}
          sx={{ fontWeight: 700 }}
        />
      ))}
    </Stack>
  );

  if (loading || !division || !catalogue.ready) {
    return <BillingSkeleton />;
  }

  if (loadError || catalogue.error) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Billing</Typography>
        {divisionSwitcher}
        <Alert
          severity="error"
          sx={{ borderRadius: 2 }}
          action={<Button color="inherit" size="small" onClick={() => { catalogue.reload(); load(); }}>Read again</Button>}
        >
          {loadError ?? catalogue.error}
        </Alert>
      </Box>
    );
  }

  if (!data?.subscription || !data.tier) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Billing</Typography>
        {divisionSwitcher}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {data?.subscription
            ? <>The {DIVISION_LABELS[division].title} subscription runs on a plan outside the current catalogue. <a href={`/pricing?division=${division}`}>Choose a plan</a> to move it onto a current tier.</>
            : <>The account holds no active {DIVISION_LABELS[division].title} subscription yet. <a href={`/pricing?division=${division}`}>Choose a plan</a> to get started.</>}
        </Alert>
      </Box>
    );
  }

  const { tier, subscription } = data;
  const exportAction = catalogue.exportActionFor(division);
  const exportEligible = exportAction ? exportAction.eligibleTierIds.includes(tier.id) : false;
  const pendingCancellation = subscription.cancelAtPeriodEnd;
  const divisionTiers = catalogue.tiersForDivision(division);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Billing</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The plan, the add-ons, the payment method and the billing details of the {DIVISION_LABELS[division].title} division. Prices are in US dollars.
      </Typography>
      {divisionSwitcher}

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
          The subscription ends at the close of the current billing period
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
              {formatCents(tier.priceCents)} {tierPeriod(tier)}, base plan
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
        {divisionTiers.map((t) => {
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
                {formatCents(t.priceCents)}<Typography component="span" variant="caption" color="text.secondary">{t.billing === 'one_time' ? ' one time' : '/mo'}</Typography>
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
      {exportEligible && exportAction && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3, bgcolor: alpha(theme.palette.info.main, 0.04) }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Chain data export</Typography>
              <Typography variant="body2" color="text.secondary">
                Export the chain data of this division as a CSV or PDF file. Each export is charged once at {formatCents(exportAction.priceCents)}, outside the subscription.
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
        Switching an add-on off ends it at once. Switching one on, or changing a quantity, applies on Save.
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start" sx={{ mb: 3 }}>
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

      <PaymentMethodSection division={division} />
      <BillingDetailsSection division={division} />
      <InvoicesSection division={division} />

      {/* Cancel subscription confirm dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Cancel subscription?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Access to {tier.name} and every add-on stays until the end of the current
            billing period{subscription.currentPeriodEnd ? ` on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ''}.
            The subscription resumes at any time before then.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={canceling}>Keep the plan</Button>
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
          Switch to {pendingTierChange ? catalogue.tierById(pendingTierChange)?.name : ''}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: tierChangeImpact && (tierChangeImpact.willContinue.length || tierChangeImpact.willBeRemoved.length) ? 2 : 0 }}>
            Billing changes at once, prorated for the rest of this period.
          </DialogContentText>

          {tierChangeImpact && tierChangeImpact.willContinue.length === 0 && tierChangeImpact.willBeRemoved.length === 0 && (
            <DialogContentText>The subscription carries no add-on, so nothing else changes.</DialogContentText>
          )}

          {tierChangeImpact && tierChangeImpact.willBeRemoved.length > 0 && (
            <Box sx={{ mb: tierChangeImpact.willContinue.length > 0 ? 2 : 0 }}>
              <Typography variant="subtitle2" fontWeight={800} color="error.main" sx={{ mb: 0.75 }}>
                Removed, since this plan offers none of these
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
                Continued, unchanged
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

// ─── Payment Method Section ───────────────────────────────────────────────────

function PaymentMethodSection({ division }: { division: Division }) {
  const [redirecting, setRedirecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleUpdate = async () => {
    setRedirecting(true);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/payment-method', division);
      if (!ok) {
        setError(json.error || 'The payment method page did not open. Try again.');
        setRedirecting(false);
        return;
      }
      openAddress(json.url);
    } catch {
      setError('The payment method page did not open. Try again.');
      setRedirecting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <CreditCardIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Payment Method</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Replace the saved card or other payment details.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={handleUpdate}
          disabled={redirecting}
          startIcon={redirecting ? <CircularProgress size={14} /> : <CreditCardIcon />}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {redirecting ? 'Opening…' : 'Update payment method'}
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
}

// ─── Billing Details Section (address + tax IDs) ──────────────────────────────

const TAX_ID_TYPES = [
  { value: 'in_gst', label: 'India GST' },
  { value: 'in_pan', label: 'India PAN' },
  { value: 'eu_vat', label: 'EU VAT' },
  { value: 'gb_vat', label: 'UK VAT' },
  { value: 'sg_gst', label: 'Singapore GST' },
  { value: 'au_abn', label: 'Australia ABN' },
  { value: 'us_ein', label: 'US EIN' },
  { value: 'ae_trn', label: 'UAE TRN' },
];

interface CustomerData {
  address: {
    line1?: string | null; line2?: string | null;
    city?: string | null; state?: string | null;
    postal_code?: string | null; country?: string | null;
  } | null;
  name: string | null;
  phone: string | null;
  taxIds: { id: string; type: string; value: string; verification?: string | null }[];
}

function BillingDetailsSection({ division }: { division: Division }) {
  const [customerData, setCustomerData] = React.useState<CustomerData | null>(null);
  const [sectionLoading, setSectionLoading] = React.useState(true);
  const [editingAddress, setEditingAddress] = React.useState(false);
  const [form, setForm] = React.useState({ line1: '', line2: '', city: '', state: '', postal_code: '', country: 'IN' });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [newTaxType, setNewTaxType] = React.useState('in_gst');
  const [newTaxValue, setNewTaxValue] = React.useState('');
  const [addingTax, setAddingTax] = React.useState(false);
  const [removingTaxId, setRemovingTaxId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setSectionLoading(true);
    try {
      const res = await fetch(`/api/billing/customer?division=${division}`);
      const json = await res.json();
      if (json.ok) setCustomerData(json as CustomerData);
      else setError(json.error || 'Cerulea APIs gave no answer for the billing details.');
    } catch {
      setError('Cerulea APIs gave no answer for the billing details.');
    } finally {
      setSectionLoading(false);
    }
  }, [division]);

  React.useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    setForm({
      line1: customerData?.address?.line1 ?? '',
      line2: customerData?.address?.line2 ?? '',
      city: customerData?.address?.city ?? '',
      state: customerData?.address?.state ?? '',
      postal_code: customerData?.address?.postal_code ?? '',
      country: customerData?.address?.country ?? 'IN',
    });
    setEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    setSaving(true);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/customer', division, { address: form }, 'PATCH');
      if (!ok) {
        setError(json.error || 'The address stayed as it was. Try again.');
        return;
      }
      setNotice('Billing address updated.');
      setEditingAddress(false);
      await load();
    } catch {
      setError('The address stayed as it was. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTaxId = async () => {
    if (!newTaxValue.trim()) return;
    setAddingTax(true);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/customer', division, { addTaxId: { type: newTaxType, value: newTaxValue.trim() } }, 'PATCH');
      if (!ok) {
        setError(json.error || 'The tax ID was left off. Try again.');
        return;
      }
      setNotice('Tax ID added.');
      setNewTaxValue('');
      await load();
    } catch {
      setError('The tax ID was left off. Try again.');
    } finally {
      setAddingTax(false);
    }
  };

  const handleRemoveTaxId = async (taxId: string) => {
    setRemovingTaxId(taxId);
    setError(null);
    try {
      const { ok, json } = await postBilling('/api/billing/customer', division, { removeTaxId: taxId }, 'PATCH');
      if (!ok) {
        setError(json.error || 'The tax ID stayed on file. Try again.');
        return;
      }
      setNotice('Tax ID removed.');
      await load();
    } catch {
      setError('The tax ID stayed on file. Try again.');
    } finally {
      setRemovingTaxId(null);
    }
  };

  if (sectionLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Skeleton variant="text" width={180} height={28} />
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mt: 1.5 }} />
      </Paper>
    );
  }

  const addr = customerData?.address;
  const addrDisplay = addr
    ? [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Billing Details</Typography>

      {notice && <Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2, borderRadius: 2 }}>{notice}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Billing Address */}
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        Billing Address
      </Typography>

      {!editingAddress ? (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mt: 1, mb: 2 }}>
          <Typography variant="body2" color={addrDisplay ? 'text.primary' : 'text.secondary'}>
            {addrDisplay ?? 'No billing address on file.'}
          </Typography>
          <Tooltip title="Edit address">
            <IconButton size="small" onClick={startEdit} sx={{ ml: 1, mt: -0.5 }} aria-label="Edit address">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : (
        <Box sx={{ mt: 1.5, mb: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Address line 1" size="small" fullWidth required
              value={form.line1}
              onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
            />
            <TextField
              label="Address line 2 (optional)" size="small" fullWidth
              value={form.line2}
              onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="City" size="small" fullWidth required
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              />
              <TextField
                label="State / Province" size="small" fullWidth
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Postal / ZIP code" size="small" fullWidth
                value={form.postal_code}
                onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
              />
              <TextField
                label="Country code (e.g. IN, US)" size="small" fullWidth required
                inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value.toUpperCase() }))}
              />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleSaveAddress}
              disabled={saving || !form.line1 || !form.city || form.country.length !== 2}
              startIcon={saving ? <CircularProgress size={12} color="inherit" /> : undefined}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {saving ? 'Saving…' : 'Save address'}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => setEditingAddress(false)}
              disabled={saving}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
          </Stack>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Tax IDs */}
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        Tax IDs
      </Typography>

      {customerData?.taxIds && customerData.taxIds.length > 0 ? (
        <Stack spacing={1} sx={{ mt: 1.5, mb: 2 }}>
          {customerData.taxIds.map((t) => (
            <Stack key={t.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80 }}>
                  {TAX_ID_TYPES.find((x) => x.value === t.type)?.label ?? t.type}
                </Typography>
                <Typography variant="body2" color="text.secondary">{t.value}</Typography>
                {t.verification && (
                  <Chip
                    label={t.verification}
                    size="small"
                    color={t.verification === 'verified' ? 'success' : t.verification === 'pending' ? 'warning' : 'default'}
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                )}
              </Stack>
              <Tooltip title="Remove tax ID">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveTaxId(t.id)}
                    disabled={removingTaxId === t.id}
                    aria-label={`Remove tax ID ${t.value}`}
                  >
                    {removingTaxId === t.id
                      ? <CircularProgress size={14} />
                      : <DeleteIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    }
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          No tax IDs on file.
        </Typography>
      )}

      {/* Add new tax ID */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={newTaxType}
            onChange={(e) => setNewTaxType(e.target.value)}
          >
            {TAX_ID_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Tax ID number"
          size="small"
          value={newTaxValue}
          onChange={(e) => setNewTaxValue(e.target.value)}
          sx={{ flex: 1, minWidth: 180 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleAddTaxId}
          disabled={addingTax || !newTaxValue.trim()}
          startIcon={addingTax ? <CircularProgress size={12} /> : <AddIcon />}
          sx={{ borderRadius: 2, fontWeight: 700, whiteSpace: 'nowrap', height: 40 }}
        >
          {addingTax ? 'Adding…' : 'Add tax ID'}
        </Button>
      </Stack>
    </Paper>
  );
}

// ─── Invoices Section ─────────────────────────────────────────────────────────

interface InvoiceRow {
  id: string;
  number: string | null;
  date: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  viewUrl: string | null;
}

const INVOICE_STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  paid: 'success',
  open: 'warning',
  uncollectible: 'error',
  void: 'default',
  draft: 'default',
};

function InvoicesSection({ division }: { division: Division }) {
  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [sectionLoading, setSectionLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPage = React.useCallback(async (startingAfter?: string) => {
    const qs = startingAfter ? `&starting_after=${encodeURIComponent(startingAfter)}` : '';
    const res = await fetch(`/api/billing/invoices?division=${division}${qs}`);
    return res.json();
  }, [division]);

  React.useEffect(() => {
    setSectionLoading(true);
    fetchPage()
      .then((json) => {
        if (json.ok) {
          setInvoices(json.invoices);
          setHasMore(json.hasMore ?? false);
        } else {
          setError(json.error || 'Cerulea APIs gave no answer for the invoices.');
        }
      })
      .catch(() => setError('Cerulea APIs gave no answer for the invoices.'))
      .finally(() => setSectionLoading(false));
  }, [fetchPage]);

  const handleLoadMore = async () => {
    if (!invoices.length) return;
    setLoadingMore(true);
    try {
      const json = await fetchPage(invoices[invoices.length - 1].id);
      if (json.ok) {
        setInvoices((prev) => [...prev, ...json.invoices]);
        setHasMore(json.hasMore ?? false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <ReceiptLongIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight={700}>Invoices</Typography>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {sectionLoading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />)}
        </Stack>
      ) : invoices.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No invoice yet. The first one appears here after the first billing cycle.
        </Typography>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Invoice</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {inv.number ?? inv.id.slice(-8).toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(inv.date * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatInvoiceAmount(inv.status === 'paid' ? inv.amountPaid : inv.amountDue, inv.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={inv.status}
                        size="small"
                        color={INVOICE_STATUS_COLOR[inv.status] ?? 'default'}
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {inv.viewUrl && (
                          <Tooltip title="View invoice">
                            <IconButton
                              size="small"
                              component="a"
                              href={inv.viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`View invoice ${inv.number ?? inv.id}`}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {inv.pdfUrl && (
                          <Tooltip title="Download PDF">
                            <IconButton
                              size="small"
                              component="a"
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Download invoice ${inv.number ?? inv.id} as PDF`}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {hasMore && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={handleLoadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={14} /> : undefined}
              >
                {loadingMore ? 'Loading…' : 'Load more invoices'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
