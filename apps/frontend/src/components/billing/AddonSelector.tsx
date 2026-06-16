// apps/frontend/src/components/billing/AddonSelector.tsx
//
// ONE add-on selector, driven entirely by the billing catalog and
// filtered by the currently selected tier. Rendered in two places:
//   - inline on the signup/checkout screen (mode="signup"), feeding the
//     initial Checkout Session
//   - on the dashboard billing page (mode="dashboard"), pre-filled with
//     the customer's current active add-ons, feeding the update flow
//
// Add-ons with a one-time price component (Custom domain, Dedicated
// branded block explorer) behave differently by mode:
//   - signup: just added to the local selection — they ride along in the
//     same Checkout Session as everything else.
//   - dashboard: turning one ON for the first time requires an actual
//     card charge, so instead of mutating local state we call
//     onRequestOneTimeCheckout(addonId) and let the parent redirect to
//     Stripe Checkout. Already-purchased/active ones can be toggled off
//     normally (no charge for removal).

'use client';

import * as React from 'react';
import {
  Box, Stack, Paper, Typography, Switch, IconButton, Divider, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { alpha, useTheme } from '@mui/material/styles';
import {
  getEligibleAddons,
  formatCents,
  type TierId,
  type Addon,
  type AddonSelection,
} from '@/config/billing-catalog';

export interface AddonSelectorProps {
  tierId: TierId | null;
  selections: AddonSelection[];
  onChange: (selections: AddonSelection[]) => void;
  mode: 'signup' | 'dashboard';
  /** Dashboard only: addon ids whose one-time component has already been purchased. */
  purchasedOneTimeAddonIds?: string[];
  /** Dashboard only: fired when the user turns on an addon that needs a paid checkout first. */
  onRequestOneTimeCheckout?: (addonId: string) => void;
  disabled?: boolean;
}

function priceLabel(addon: Addon): string {
  if (addon.billingType === 'recurring') {
    return `${formatCents(addon.recurringPriceCents!)}/mo`;
  }
  if (addon.billingType === 'one_time') {
    return `${formatCents(addon.oneTimePriceCents!)} one-time`;
  }
  // recurring_plus_one_time
  return `${formatCents(addon.oneTimePriceCents!)} one-time + ${formatCents(addon.recurringPriceCents!)}/mo`;
}

export default function AddonSelector({
  tierId,
  selections,
  onChange,
  mode,
  purchasedOneTimeAddonIds = [],
  onRequestOneTimeCheckout,
  disabled = false,
}: AddonSelectorProps) {
  const theme = useTheme();
  const eligible = getEligibleAddons(tierId);
  const selectedMap = React.useMemo(() => new Map(selections.map((s) => [s.addonId, s.quantity])), [selections]);

  if (!tierId) return null;

  if (eligible.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No add-ons are available for this tier.
        </Typography>
      </Paper>
    );
  }

  const setQuantity = (addonId: string, quantity: number) => {
    const next = selections.filter((s) => s.addonId !== addonId);
    next.push({ addonId, quantity });
    onChange(next);
  };

  const removeAddon = (addonId: string) => {
    onChange(selections.filter((s) => s.addonId !== addonId));
  };

  const handleToggle = (addon: Addon, checked: boolean) => {
    if (!checked) {
      removeAddon(addon.id);
      return;
    }

    const needsCheckoutFirst =
      mode === 'dashboard' &&
      addon.oneTimePriceCents != null &&
      !purchasedOneTimeAddonIds.includes(addon.id);

    if (needsCheckoutFirst) {
      onRequestOneTimeCheckout?.(addon.id);
      return; // don't mutate local selection — wait for checkout to complete
    }

    setQuantity(addon.id, 1);
  };

  return (
    <Stack spacing={1.5}>
      {eligible.map((addon) => {
        const isOn = selectedMap.has(addon.id);
        const quantity = selectedMap.get(addon.id) ?? 1;
        const isStepper = addon.maxQuantity > 1;
        const purchased = purchasedOneTimeAddonIds.includes(addon.id);

        return (
          <Paper
            key={addon.id}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              borderColor: isOn ? 'primary.main' : 'divider',
              bgcolor: isOn ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Switch
                checked={isOn}
                disabled={disabled}
                onChange={(e) => handleToggle(addon, e.target.checked)}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography variant="subtitle2" fontWeight={700}>
                    {addon.name}
                  </Typography>
                  {purchased && addon.billingType === 'recurring_plus_one_time' && (
                    <Chip label="Setup fee paid" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {addon.blurb}
                </Typography>
              </Box>

              {isOn && isStepper && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <IconButton
                    size="small"
                    disabled={disabled || quantity <= 1}
                    onClick={() => setQuantity(addon.id, Math.max(1, quantity - 1))}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" fontWeight={700} sx={{ width: 24, textAlign: 'center' }}>
                    {quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={disabled || quantity >= addon.maxQuantity}
                    onClick={() => setQuantity(addon.id, Math.min(addon.maxQuantity, quantity + 1))}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}

              <Divider orientation="vertical" flexItem sx={{ height: 28, my: 'auto' }} />

              <Typography variant="body2" fontWeight={700} sx={{ minWidth: 120, textAlign: 'right', color: isOn ? 'primary.main' : 'text.secondary' }}>
                {priceLabel(addon)}
              </Typography>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
