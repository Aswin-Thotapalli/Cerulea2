'use client';

// apps/frontend/src/components/studio/steps/step3-DappPayments.tsx
// The Payments tab of the Economics step.
// Fiat payments alone. The provider is connected with its credentials on the
// Integrations step, where Cerulea APIs holds the keys in key custody. This
// tab chooses the provider, the settlement time and the checkout look.
// Without this tab a charge has no provider to settle through.

import React from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import { FIAT_PROVIDERS, OPAQUE_MENU_PROPS, type Payments, SectionCard } from './step3-shared';

interface Props {
  payments: Payments;
  setPayments: (change: (previous: Payments) => Payments) => void;
}

const GREEN = '#10b981';
const ACCENT = '#4F46E5';

export default function DappPaymentsPanel({ payments, setPayments }: Props) {
  return (
    <Stack spacing={2} data-testid="payments-panel">
      <SectionCard>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(GREEN, 0.03),
            borderRadius: '12px 12px 0 0',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                bgcolor: alpha(GREEN, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 15, color: GREEN }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                Fiat payments
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Provider and settlement time
              </Typography>
            </Box>
            <Switch
              size="small"
              checked={payments.fiatEnabled}
              onChange={(e) => setPayments((p) => ({ ...p, fiatEnabled: e.target.checked }))}
              slotProps={{ input: { 'aria-label': 'Accept fiat payments' } }}
              sx={{ ml: 'auto' }}
            />
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth size="small" disabled={!payments.fiatEnabled}>
              <InputLabel id="payments-provider">Provider</InputLabel>
              <Select
                labelId="payments-provider"
                value={payments.fiatProvider}
                label="Provider"
                onChange={(e) =>
                  setPayments((p) => ({ ...p, fiatProvider: e.target.value as Payments['fiatProvider'] }))
                }
                MenuProps={OPAQUE_MENU_PROPS}
              >
                {FIAT_PROVIDERS.map((provider) => (
                  <MenuItem key={provider} value={provider}>
                    {provider}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Settlement time"
              fullWidth
              size="small"
              value={payments.settlementTime}
              onChange={(e) => setPayments((p) => ({ ...p, settlementTime: e.target.value }))}
              disabled={!payments.fiatEnabled}
              helperText="The days between a charge and the money arriving, as the provider states it."
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }} data-mirror="payments.provider">
            {payments.fiatEnabled
              ? `${payments.fiatProvider} settles each charge. Its keys are entered on the Integrations step, where Cerulea APIs holds them in key custody. The browser never keeps a key.`
              : 'No fiat provider is connected. A customer can be charged only once one is, so the Revenue tab stays informational until then.'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Cerulea runs with no token. A customer meets no wallet, no gas and no fee inside the
            deployment, and every settlement is a fiat settlement.
          </Typography>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(ACCENT, 0.03),
            borderRadius: '12px 12px 0 0',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                bgcolor: alpha(ACCENT, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShowChartIcon sx={{ fontSize: 15, color: ACCENT }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                Checkout
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Theme, success address and cancel address
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="payments-theme">Theme</InputLabel>
              <Select
                labelId="payments-theme"
                value={payments.checkoutTheme}
                label="Theme"
                onChange={(e) =>
                  setPayments((p) => ({ ...p, checkoutTheme: e.target.value as Payments['checkoutTheme'] }))
                }
                MenuProps={OPAQUE_MENU_PROPS}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Follow the device</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Success address"
              fullWidth
              size="small"
              value={payments.successUrl}
              onChange={(e) => setPayments((p) => ({ ...p, successUrl: e.target.value }))}
              helperText="Where a customer lands after a completed payment."
            />
            <TextField
              label="Cancel address"
              fullWidth
              size="small"
              value={payments.cancelUrl}
              onChange={(e) => setPayments((p) => ({ ...p, cancelUrl: e.target.value }))}
              helperText="Where a customer lands after leaving the checkout."
            />
          </Box>
        </Box>
      </SectionCard>
    </Stack>
  );
}
