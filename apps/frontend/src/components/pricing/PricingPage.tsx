'use client';

// apps/frontend/src/components/pricing/PricingPage.tsx
// The subscription screen.
// Every plan on this screen comes from the Cerulea APIs payments driver, so the
// price a person reads is the price Cerulea charges.
// Without this screen a workspace stays on no plan and deployment stays closed.

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { alpha, useTheme } from '@mui/material/styles';

import { StudioRouteError, api } from '@/lib/apiClient';

type Plan = {
  planId: string;
  displayName: string;
  amountMinor: number;
  currency: string;
  periodDays: number;
};

type HeldSubscription = {
  subscriptionId: string;
  planId: string;
  planName: string;
  state: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
} | null;

type Invoice = {
  invoiceId: string;
  state: string;
  currency: string;
  totalMinor: number;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
};

type BillingView = {
  workspace: { workspaceId: string; name: string; tier: string };
  plans: Plan[];
  subscription: HeldSubscription;
  invoices: Invoice[];
};

/** Turns the smallest currency unit into the text a person reads. */
export function formatAmount(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

/** Turns a billing period in days into the phrase beside the price. */
export function describePeriod(periodDays: number): string {
  if (periodDays >= 365) return 'each year';
  if (periodDays >= 28) return 'each month';
  return `every ${periodDays} days`;
}

export default function PricingPage() {
  const theme = useTheme();
  const { status } = useSession();
  const [view, setView] = useState<BillingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      setView(await api<BillingView>('/api/billing/subscription'));
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Open this screen again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // The plans and the subscription belong to a workspace, so the screen reads
  // them once a person has signed in. A visitor meets the sign in step first.
  useEffect(() => {
    if (status === 'authenticated') void read();
    if (status === 'unauthenticated') setLoading(false);
  }, [read, status]);

  const choose = async (plan: Plan) => {
    setWorking(plan.planId);
    setFailure(null);
    try {
      await api('/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.planId }),
      });
      await read();
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: cause instanceof StudioRouteError ? cause.fix : 'Choose the plan again.',
      });
    } finally {
      setWorking(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2">Cerulea is reading the plans it publishes.</Typography>
        </Stack>
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', py: 8, px: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Subscription
        </Typography>
        <Alert
          severity="info"
          data-testid="pricing-sign-in"
          action={
            <Button color="inherit" href="/auth/login?next=%2Fpricing">
              Sign in
            </Button>
          }
        >
          We settle every deployment through a subscription held by a workspace. Sign in to read
          the plans and the subscription your workspace holds.
        </Alert>
      </Box>
    );
  }

  if (failure && !view) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', py: 8, px: 2 }}>
        <Alert severity="error" action={<Button onClick={() => void read()}>Read again</Button>}>
          <Typography sx={{ fontWeight: 700 }}>{failure.message}</Typography>
          <Typography variant="body2">{failure.fix}</Typography>
        </Alert>
      </Box>
    );
  }

  const plans = view?.plans ?? [];
  const held = view?.subscription ?? null;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', py: 8, px: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        Subscription
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.8, mb: 4 }}>
        We settle every deployment through a subscription. The plan sets how much capacity a
        workspace holds. Deployment stays closed while a workspace holds no plan.
      </Typography>

      {failure && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 700 }}>{failure.message}</Typography>
          <Typography variant="body2">{failure.fix}</Typography>
        </Alert>
      )}

      {held && (
        <Alert severity="success" sx={{ mb: 4 }}>
          The {view?.workspace.name} workspace holds the {held.planName} plan. The period runs to{' '}
          {new Date(held.currentPeriodEnd).toLocaleDateString()}.
        </Alert>
      )}

      {plans.length === 0 && (
        <Alert severity="info">
          Cerulea publishes no plan at this address yet. Start Cerulea APIs, then read this screen
          again.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
        {plans.map((plan) => {
          const current = held?.planId === plan.planId;
          return (
            <Card
              key={plan.planId}
              variant="outlined"
              sx={{
                flex: 1,
                borderRadius: 3,
                borderColor: current ? theme.palette.primary.main : theme.palette.divider,
                backgroundColor: current
                  ? alpha(theme.palette.primary.main, 0.06)
                  : 'transparent',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="overline" sx={{ fontWeight: 800 }}>
                    {plan.displayName}
                  </Typography>
                  {current && <Chip size="small" color="primary" label="In use" />}
                </Stack>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {formatAmount(plan.amountMinor, plan.currency)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                  {describePeriod(plan.periodDays)}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 3 }}>
                  <CheckCircleIcon fontSize="small" color="primary" />
                  <Typography variant="body2">
                    Cerulea issues an invoice at the start of every period and renews the plan while
                    the invoice is paid.
                  </Typography>
                </Stack>
                <Button
                  fullWidth
                  variant={current ? 'outlined' : 'contained'}
                  disabled={current || working !== null}
                  onClick={() => void choose(plan)}
                  startIcon={
                    working === plan.planId ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : undefined
                  }
                >
                  {current ? 'This plan is in use' : `Move to ${plan.displayName}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {view && view.invoices.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Invoices
          </Typography>
          <Stack spacing={1}>
            {view.invoices.map((invoice) => (
              <Stack
                key={invoice.invoiceId}
                direction="row"
                justifyContent="space-between"
                sx={{ py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
              >
                <Typography variant="body2">
                  Issued {new Date(invoice.issuedAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  {formatAmount(invoice.totalMinor, invoice.currency)}
                </Typography>
                <Chip
                  size="small"
                  label={invoice.state}
                  color={invoice.state === 'paid' ? 'success' : 'default'}
                />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
