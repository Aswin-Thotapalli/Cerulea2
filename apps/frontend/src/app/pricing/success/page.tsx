'use client';

// apps/frontend/src/app/pricing/success/page.tsx
// The screen the browser lands on after a purchase.
// It waits for Cerulea APIs to hold the new subscription, refreshes the
// browser session so the division gate reads the new plan, then opens the
// Dashboard or the address the purchase named. The division comes from the
// address of this screen or the division cookie; without either, the poll
// reads the standing in every division.

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { asDivision } from '@/config/divisions';
import { getClientDivision } from '@/lib/division-client';
import { type AccessAnswer, holdsActivePlan } from '@/components/billing/plan-standing';

/** The attempts the screen makes before it opens the Dashboard anyway. */
const POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 1500;

function PricingSuccessInner() {
  const { update } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('return');
  const returnUrl = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
  const namedDivision = asDivision(params.get('division'));
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const division = namedDivision ?? getClientDivision();

    const finish = async () => {
      await update();
      if (cancelled) return;
      setDone(true);
      setTimeout(() => router.replace(returnUrl || '/dashboard'), 1500);
    };

    const settled = async (): Promise<boolean> => {
      if (division) {
        const res = await fetch(`/api/billing/subscription?division=${division}`);
        const json = await res.json();
        return json?.ok === true && json.subscription?.status === 'active' && json.tier;
      }
      const res = await fetch('/api/billing/access');
      return holdsActivePlan((await res.json()) as AccessAnswer);
    };

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      try {
        if (await settled()) {
          await finish();
          return;
        }
      } catch {
        // A short outage of Cerulea APIs leads to the next attempt.
      }
      if (attempts < POLL_ATTEMPTS && !cancelled) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else if (!cancelled) {
        await finish();
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [update, router, returnUrl, namedDivision]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', gap: 2 }}>
      {done ? (
        <>
          <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main' }} />
          <Typography variant="h5" fontWeight={800}>The plan is in place</Typography>
          <Typography color="text.secondary">Opening the Dashboard…</Typography>
        </>
      ) : (
        <>
          <CircularProgress size={48} />
          <Typography variant="h6" fontWeight={600}>Setting up the subscription…</Typography>
          <Typography variant="body2" color="text.secondary">This takes a moment.</Typography>
        </>
      )}
    </Box>
  );
}

export default function PricingSuccessPage() {
  return (
    <React.Suspense fallback={
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={48} />
      </Box>
    }>
      <PricingSuccessInner />
    </React.Suspense>
  );
}
