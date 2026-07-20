'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, Button, IconButton,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { SectionCard, OPAQUE_MENU_PROPS, safeNum, DappFees } from './step3-shared';

interface Props {
  dappFees: DappFees;
  setDappFees: React.Dispatch<React.SetStateAction<DappFees>>;
}

export default function DappFeesPanel({ dappFees, setDappFees }: Props) {
  const theme = useTheme();

  return (
    <Stack spacing={2}>
      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ReceiptLongIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Platform Fees</Typography>
              <Typography variant="caption" color="text.secondary">Fee percentages for platform and referrals</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Platform Fee %" type="number" fullWidth size="small" value={dappFees.platformFee} onChange={e => setDappFees(p => ({ ...p, platformFee: safeNum(e.target.value) }))} />
            <TextField label="Referral Reward %" type="number" fullWidth size="small" value={dappFees.referralFee} onChange={e => setDappFees(p => ({ ...p, referralFee: safeNum(e.target.value) }))} />
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Payout Logic</Typography>
              <Typography variant="caption" color="text.secondary">Minimum amount, schedule, and chargeback handling</Typography>
            </Box>
            <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5', fontSize: '0.62rem', fontWeight: 700 }}>
              {dappFees.payoutSchedule.toUpperCase()}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Min Payout Amount ($)" type="number" fullWidth size="small" value={dappFees.minPayout} onChange={e => setDappFees(p => ({ ...p, minPayout: safeNum(e.target.value) }))} />
            <FormControl fullWidth size="small">
              <InputLabel>Schedule</InputLabel>
              <Select value={dappFees.payoutSchedule} label="Schedule" onChange={e => setDappFees(p => ({ ...p, payoutSchedule: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Chargeback Mode</InputLabel>
              <Select value={dappFees.chargebackMode} label="Chargeback Mode" onChange={e => setDappFees(p => ({ ...p, chargebackMode: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="manual">Manual Review</MenuItem>
                <MenuItem value="deduct">Auto-Deduct</MenuItem>
                <MenuItem value="block">Block User</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MonetizationOnIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Split Recipients</Typography>
              <Typography variant="caption" color="text.secondary">{dappFees.splits.length} recipient{dappFees.splits.length !== 1 ? 's' : ''}</Typography>
            </Box>
            <Button startIcon={<AddIcon />} size="small" variant="outlined"
              onClick={() => setDappFees(p => ({ ...p, splits: [...p.splits, { label: 'New', address: '', pct: 0 }] }))}
              sx={{ ml: 'auto', borderRadius: 1, fontSize: '0.72rem', borderColor: alpha('#4F46E5', 0.35), color: '#4F46E5' }}>
              Add
            </Button>
          </Stack>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px 44px', gap: 1, px: 3, py: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: `1px solid ${theme.palette.divider}` }}>
            {['Label', 'Wallet Address', 'Share (%)', ''].map((h, i) => (
              <Typography key={i} variant="caption" fontWeight={800} sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled' }}>{h}</Typography>
            ))}
          </Box>
          {dappFees.splits.map((s, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px 44px', gap: 1, px: 3, py: 1.25, alignItems: 'center', borderBottom: i < dappFees.splits.length - 1 ? `1px solid ${theme.palette.divider}` : 'none', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
              <TextField size="small" variant="standard" value={s.label} onChange={e => { const n = [...dappFees.splits]; n[i] = { ...n[i], label: e.target.value }; setDappFees(p => ({ ...p, splits: n })) }} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem', fontWeight: 600 } }} />
              <TextField size="small" variant="standard" value={s.address} placeholder="0x..." onChange={e => { const n = [...dappFees.splits]; n[i] = { ...n[i], address: e.target.value }; setDappFees(p => ({ ...p, splits: n })) }} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem', fontFamily: 'monospace' } }} />
              <TextField size="small" type="number" variant="standard" value={s.pct} onChange={e => { const n = [...dappFees.splits]; n[i] = { ...n[i], pct: safeNum(e.target.value) }; setDappFees(p => ({ ...p, splits: n })) }} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
              <IconButton size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }} onClick={() => setDappFees(p => ({ ...p, splits: p.splits.filter((_, idx) => idx !== i) }))}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
          {dappFees.splits.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled">No recipients. Click "Add" to create one.</Typography>
            </Box>
          )}
        </Box>
      </SectionCard>
    </Stack>
  );
}
