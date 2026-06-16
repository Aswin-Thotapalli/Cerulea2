// apps/frontend/src/components/billing/PriceSummary.tsx
//
// Shared live running-total component: tier price + sum of selected
// add-on prices, split into "due now" (one-time charges + first month)
// and "then, monthly" (ongoing recurring total). Used by both the
// signup checkout screen and the dashboard billing page.

'use client';

import * as React from 'react';
import { Box, Paper, Stack, Typography, Divider } from '@mui/material';
import {
  computePriceBreakdown,
  getTierById,
  getAddonById,
  formatCents,
  type TierId,
  type AddonSelection,
} from '@/config/billing-catalog';

export interface PriceSummaryProps {
  tierId: TierId | null;
  selections: AddonSelection[];
  /** Label for the primary action button area below the summary, e.g. "Due today" */
  dueNowLabel?: string;
}

export default function PriceSummary({ tierId, selections, dueNowLabel = 'Due today' }: PriceSummaryProps) {
  const tier = tierId ? getTierById(tierId) : undefined;
  const breakdown = computePriceBreakdown(tierId, selections);

  if (!tier) return null;

  const lineItems = selections
    .map((s) => ({ addon: getAddonById(s.addonId), quantity: s.quantity }))
    .filter((x) => !!x.addon) as { addon: NonNullable<ReturnType<typeof getAddonById>>; quantity: number }[];

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>
        Order summary
      </Typography>

      <Stack spacing={1} sx={{ mt: 1.5 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">{tier.name}</Typography>
          <Typography variant="body2" fontWeight={700}>{formatCents(tier.priceCents)}/mo</Typography>
        </Stack>

        {lineItems.map(({ addon, quantity }) => (
          <Stack key={addon.id} direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {addon.name}
              {addon.maxQuantity > 1 ? ` × ${quantity}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {addon.recurringPriceCents != null && `${formatCents(addon.recurringPriceCents * quantity)}/mo`}
              {addon.recurringPriceCents != null && addon.oneTimePriceCents != null && ' + '}
              {addon.oneTimePriceCents != null && `${formatCents(addon.oneTimePriceCents * quantity)} one-time`}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={0.75}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="body1" fontWeight={800}>{dueNowLabel}</Typography>
          <Typography variant="h5" fontWeight={800} color="primary.main">{formatCents(breakdown.dueNowCents)}</Typography>
        </Stack>
        {breakdown.addonsOneTimeCents > 0 && (
          <Typography variant="caption" color="text.secondary">
            Includes {formatCents(breakdown.addonsOneTimeCents)} in one-time setup fees.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Then {formatCents(breakdown.monthlyCents)}/month.
        </Typography>
      </Stack>
    </Paper>
  );
}
