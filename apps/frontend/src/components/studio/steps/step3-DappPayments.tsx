'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, Switch, Autocomplete,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { SectionCard, OPAQUE_MENU_PROPS, DappPayments } from './step3-shared';

interface Props {
  dappPayments: DappPayments;
  setDappPayments: React.Dispatch<React.SetStateAction<DappPayments>>;
}

export default function DappPaymentsPanel({ dappPayments, setDappPayments }: Props) {
  return (
    <Stack spacing={2}>
      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#10b981', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#10b981', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 15, color: '#10b981' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Fiat Payments</Typography>
              <Typography variant="caption" color="text.secondary">Provider, settlement time</Typography>
            </Box>
            <Switch size="small" checked={dappPayments.fiatEnabled} onChange={e => setDappPayments(p => ({ ...p, fiatEnabled: e.target.checked }))} sx={{ ml: 'auto' }} />
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth size="small" disabled={!dappPayments.fiatEnabled}>
              <InputLabel>Provider</InputLabel>
              <Select value={dappPayments.fiatProvider} label="Provider" onChange={e => setDappPayments(p => ({ ...p, fiatProvider: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="Stripe">Stripe</MenuItem>
                <MenuItem value="Razorpay">Razorpay</MenuItem>
                <MenuItem value="Paddle">Paddle</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Settlement Time" fullWidth size="small" value={dappPayments.settlementTime} onChange={e => setDappPayments(p => ({ ...p, settlementTime: e.target.value }))} disabled={!dappPayments.fiatEnabled} />
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#f59e0b', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#f59e0b', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MonetizationOnIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Crypto Payments</Typography>
              <Typography variant="caption" color="text.secondary">Treasury wallet and accepted tokens</Typography>
            </Box>
            <Switch size="small" checked={dappPayments.cryptoEnabled} onChange={e => setDappPayments(p => ({ ...p, cryptoEnabled: e.target.checked }))} sx={{ ml: 'auto' }} />
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <TextField label="Treasury Wallet Address" fullWidth size="small" value={dappPayments.treasury} onChange={e => setDappPayments(p => ({ ...p, treasury: e.target.value }))} disabled={!dappPayments.cryptoEnabled} />
            <Autocomplete multiple options={['USDC', 'ETH', 'USDT', 'DAI']} freeSolo value={dappPayments.cryptoTokens} onChange={(_, v) => setDappPayments(p => ({ ...p, cryptoTokens: v }))} renderInput={(p) => <TextField {...p} size="small" label="Accepted Tokens" />} disabled={!dappPayments.cryptoEnabled} />
          </Stack>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShowChartIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Checkout UX</Typography>
              <Typography variant="caption" color="text.secondary">Theme, success, and cancel URLs</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Theme</InputLabel>
              <Select value={dappPayments.checkoutTheme} label="Theme" onChange={e => setDappPayments(p => ({ ...p, checkoutTheme: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Success URL" fullWidth size="small" value={dappPayments.successUrl} onChange={e => setDappPayments(p => ({ ...p, successUrl: e.target.value }))} />
            <TextField label="Cancel URL" fullWidth size="small" value={dappPayments.cancelUrl} onChange={e => setDappPayments(p => ({ ...p, cancelUrl: e.target.value }))} />
          </Box>
        </Box>
      </SectionCard>
    </Stack>
  );
}
