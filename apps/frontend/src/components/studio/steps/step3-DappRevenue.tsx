'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, Button, IconButton, Chip,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { SectionCard, OPAQUE_MENU_PROPS, safeNum, DappRevenue } from './step3-shared';

interface Props {
  dappRevenue: DappRevenue;
  setDappRevenue: React.Dispatch<React.SetStateAction<DappRevenue>>;
  dappVisibility: "public" | "private";
}

export default function DappRevenuePanel({ dappRevenue, setDappRevenue, dappVisibility }: Props) {
  const theme = useTheme();

  return (
    <Stack spacing={2}>
      <Box sx={{ px: 2.5, py: 1.5, borderRadius: 2, bgcolor: alpha(dappVisibility === 'private' ? '#8b5cf6' : '#4F46E5', 0.06), border: `1px solid ${alpha(dappVisibility === 'private' ? '#8b5cf6' : '#4F46E5', 0.18)}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <MonetizationOnIcon sx={{ fontSize: 15, color: dappVisibility === 'private' ? '#8b5cf6' : '#4F46E5' }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: dappVisibility === 'private' ? '#8b5cf6' : '#4F46E5' }}>
            {dappVisibility === 'private'
              ? 'Private dApp — monetise through seat-based billing, internal credits, or direct invoicing rather than public subscriptions.'
              : 'Public dApp — configure your public-facing subscription tiers, usage metering, and trial settings.'}
          </Typography>
        </Stack>
      </Box>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MonetizationOnIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Pricing Strategy</Typography>
              <Typography variant="caption" color="text.secondary">Billing model, currency, and trial period</Typography>
            </Box>
            <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5', fontSize: '0.62rem', fontWeight: 700 }}>
              {dappRevenue.billingModel.toUpperCase()}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Billing Model</InputLabel>
              <Select value={dappRevenue.billingModel} label="Billing Model" onChange={e => setDappRevenue(p => ({ ...p, billingModel: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="subscription">Subscription (SaaS)</MenuItem>
                <MenuItem value="usage">Usage Based (Metered)</MenuItem>
                <MenuItem value="hybrid">Hybrid</MenuItem>
                <MenuItem value="one-time">One-Time License</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Base Currency</InputLabel>
              <Select value={dappRevenue.currency} label="Base Currency" onChange={e => setDappRevenue(p => ({ ...p, currency: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
                <MenuItem value="ETH">ETH (Ξ)</MenuItem>
                <MenuItem value="USDC">USDC</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Trial Period (days)" type="number" fullWidth size="small" value={dappRevenue.trialDays} onChange={e => setDappRevenue(p => ({ ...p, trialDays: safeNum(e.target.value) }))} />
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShowChartIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Usage & Metering</Typography>
              <Typography variant="caption" color="text.secondary">Per-unit rate, unit name, and monthly cap</Typography>
            </Box>
            {dappRevenue.billingModel === 'subscription' && (
              <Chip label="N/A for subscription" size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.6rem' }} />
            )}
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Metered Rate (per unit)" type="number" fullWidth size="small" value={dappRevenue.meteredRate} onChange={e => setDappRevenue(p => ({ ...p, meteredRate: safeNum(e.target.value) }))} disabled={dappRevenue.billingModel === 'subscription'} />
            <TextField label="Unit Name" placeholder="e.g. Requests, GB" fullWidth size="small" value={dappRevenue.meteredUnit} onChange={e => setDappRevenue(p => ({ ...p, meteredUnit: e.target.value }))} disabled={dappRevenue.billingModel === 'subscription'} />
            <TextField label="Monthly Cap (0 = Unlimited)" type="number" fullWidth size="small" value={dappRevenue.meteredCap} onChange={e => setDappRevenue(p => ({ ...p, meteredCap: safeNum(e.target.value) }))} />
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ReceiptLongIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Subscription Tiers</Typography>
              <Typography variant="caption" color="text.secondary">{dappRevenue.tiers.length} tier{dappRevenue.tiers.length !== 1 ? 's' : ''} configured</Typography>
            </Box>
            <Button startIcon={<AddIcon />} variant="outlined" size="small"
              onClick={() => setDappRevenue(p => ({ ...p, tiers: [...p.tiers, { name: 'New Tier', monthly: 0, annual: 0, limit: '' }] }))}
              sx={{ ml: 'auto', borderRadius: 1, fontSize: '0.72rem', borderColor: alpha('#4F46E5', 0.35), color: '#4F46E5' }}>
              Add Tier
            </Button>
          </Stack>
        </Box>
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 120px 120px 1.5fr 44px', gap: 1, px: 3, py: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: `1px solid ${theme.palette.divider}` }}>
            {['Tier Name', 'Monthly ($)', 'Annual ($)', 'Usage Limit', ''].map((h, i) => (
              <Typography key={i} variant="caption" fontWeight={800} sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled' }}>{h}</Typography>
            ))}
          </Box>
          {dappRevenue.tiers.map((t, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 120px 120px 1.5fr 44px', gap: 1, px: 3, py: 1.25, alignItems: 'center', borderBottom: i < dappRevenue.tiers.length - 1 ? `1px solid ${theme.palette.divider}` : 'none', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }, transition: 'background 0.1s' }}>
              <TextField size="small" variant="standard" value={t.name} onChange={e => { const n = [...dappRevenue.tiers]; n[i] = { ...n[i], name: e.target.value }; setDappRevenue(p => ({ ...p, tiers: n })) }} InputProps={{ disableUnderline: true, style: { fontWeight: 700, fontSize: '0.85rem' } }} />
              <TextField size="small" type="number" variant="standard" value={t.monthly} onChange={e => { const n = [...dappRevenue.tiers]; n[i] = { ...n[i], monthly: safeNum(e.target.value) }; setDappRevenue(p => ({ ...p, tiers: n })) }} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
              <TextField size="small" type="number" variant="standard" value={t.annual} onChange={e => { const n = [...dappRevenue.tiers]; n[i] = { ...n[i], annual: safeNum(e.target.value) }; setDappRevenue(p => ({ ...p, tiers: n })) }} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
              <TextField size="small" variant="standard" placeholder="e.g. 100k req/mo" value={t.limit} onChange={e => { const n = [...dappRevenue.tiers]; n[i] = { ...n[i], limit: e.target.value }; setDappRevenue(p => ({ ...p, tiers: n })) }} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
              <IconButton size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }} onClick={() => setDappRevenue(p => ({ ...p, tiers: p.tiers.filter((_, idx) => idx !== i) }))}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
          {dappRevenue.tiers.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled">No tiers yet. Click "Add Tier" above to create one.</Typography>
            </Box>
          )}
        </Box>
      </SectionCard>
    </Stack>
  );
}
