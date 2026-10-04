// apps/frontend/src/components/billing/PriceSummary.tsx
// The running total of a tier with its chosen add-ons, read from the priced
// catalogue: the amount due now (every one time part and the first period)
// and the amount due every period after. The pricing screen and the billing
// screen both render it.

'use client';

import * as React from 'react';
import { Box, Paper, Stack, Typography, Divider } from '@mui/material';
import {
  type AddonSelection,
  type CatalogueAddon,
  formatCents,
  useCatalogue,
} from '@/components/billing/CatalogueProvider';

export interface PriceSummaryProps {
  tierId: string | null;
  selections: AddonSelection[];
  /** Label for the primary action button area below the summary, e.g. "Due today" */
  dueNowLabel?: string;
}

export default function PriceSummary({ tierId, selections, dueNowLabel = 'Due today' }: PriceSummaryProps) {
  const { tierById, addonById, breakdown: priceBreakdown } = useCatalogue();
  const tier = tierById(tierId);
  const breakdown = priceBreakdown(tierId, selections);

  if (!tier) return null;

  const lineItems = selections
    .map((s) => ({ addon: addonById(s.addonId), quantity: s.quantity }))
    .filter((x) => !!x.addon) as { addon: CatalogueAddon; quantity: number }[];

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>
        Order summary
      </Typography>

      <Stack spacing={1} sx={{ mt: 1.5 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">{tier.name}</Typography>
          <Typography variant="body2" fontWeight={700}>{formatCents(tier.priceCents)}{tier.billing === 'one_time' ? ' one-time' : '/mo'}</Typography>
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
          {tier.billing === 'one_time'
            ? `Then ${formatCents(breakdown.addonsRecurringCents)}/month for the recurring add-ons.`
            : `Then ${formatCents(breakdown.monthlyCents)}/month.`}
        </Typography>
      </Stack>
    </Paper>
  );
}
