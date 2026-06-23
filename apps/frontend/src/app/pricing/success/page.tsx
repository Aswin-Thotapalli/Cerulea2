'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function PricingSuccessInner() {
  const { update } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const returnUrl = params.get('return');
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts++;

      try {
        const res = await fetch('/api/billing/subscription');
        const json = await res.json();
        if (json?.ok && json.subscription?.status === 'active' && json.tier) {
          await update();
          if (!cancelled) {
            setDone(true);
            setTimeout(() => router.replace(returnUrl || '/dashboard'), 1500);
          }
          return;
        }
      } catch { /* ignore transient errors */ }

      if (attempts < 12 && !cancelled) {
        setTimeout(poll, 1500);
      } else if (!cancelled) {
        await update();
        setDone(true);
        setTimeout(() => router.replace(returnUrl || '/dashboard'), 1500);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [update, router, returnUrl]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', gap: 2 }}>
      {done ? (
        <>
          <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main' }} />
          <Typography variant="h5" fontWeight={800}>You&apos;re all set!</Typography>
          <Typography color="text.secondary">Redirecting to your dashboard…</Typography>
        </>
      ) : (
        <>
          <CircularProgress size={48} />
          <Typography variant="h6" fontWeight={600}>Setting up your subscription…</Typography>
          <Typography variant="body2" color="text.secondary">This takes just a moment.</Typography>
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
