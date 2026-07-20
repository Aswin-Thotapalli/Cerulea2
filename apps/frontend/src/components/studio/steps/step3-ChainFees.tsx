'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, FormControlLabel, Switch,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { SectionCard, OPAQUE_MENU_PROPS, safeNum, ChainFees } from './step3-shared';

interface Props {
  chainFees: ChainFees;
  setChainFees: React.Dispatch<React.SetStateAction<ChainFees>>;
}

export default function ChainFeesPanel({ chainFees, setChainFees }: Props) {
  const GAS_COLOR = '#10b981';

  return (
    <Stack spacing={2}>
      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(GAS_COLOR, 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha(GAS_COLOR, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShowChartIcon sx={{ fontSize: 15, color: GAS_COLOR }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Gas Model</Typography>
              <Typography variant="caption" color="text.secondary">Base fee and EIP-1559 dynamic pricing</Typography>
            </Box>
            <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha(GAS_COLOR, 0.08), color: GAS_COLOR, fontSize: '0.62rem', fontWeight: 700 }}>
              {chainFees.dynamic ? 'EIP-1559' : 'FIXED'}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 2 }}>
            <TextField label="Base Fee (Gwei)" type="number" size="small" fullWidth value={chainFees.baseFee} onChange={e => setChainFees(p => ({ ...p, baseFee: safeNum(e.target.value) }))} />
            <Box />
          </Box>
          <Stack spacing={1}>
            <FormControlLabel
              control={<Switch size="small" checked={chainFees.dynamic} onChange={e => setChainFees(p => ({ ...p, dynamic: e.target.checked }))} />}
              label={<Typography variant="body2">Dynamic EIP-1559 Pricing</Typography>}
              sx={{ display: 'flex', alignItems: 'center', m: 0 }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={chainFees.priorityTip} onChange={e => setChainFees(p => ({ ...p, priorityTip: e.target.checked }))} />}
              label={<Typography variant="body2">Enable Priority Tips (MEV-style)</Typography>}
              sx={{ display: 'flex', alignItems: 'center', m: 0 }}
            />
          </Stack>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AccountBalanceIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Block Economics</Typography>
              <Typography variant="caption" color="text.secondary">Gas limit, elasticity, and target fullness</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Block Gas Limit" type="number" size="small" fullWidth value={chainFees.blockGasLimit} onChange={e => setChainFees(p => ({ ...p, blockGasLimit: safeNum(e.target.value) }))} />
            <TextField label="Elasticity Multiplier" type="number" size="small" fullWidth value={chainFees.elasticity} onChange={e => setChainFees(p => ({ ...p, elasticity: safeNum(e.target.value) }))} helperText="Max gas price spike" />
            <TextField label="Target Fullness %" type="number" size="small" fullWidth value={chainFees.targetBlockFullness} onChange={e => setChainFees(p => ({ ...p, targetBlockFullness: safeNum(e.target.value) }))} />
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
              <Typography variant="subtitle2" fontWeight={800}>Fee Distribution</Typography>
              <Typography variant="caption" color="text.secondary">Burn percentage and remainder recipient</Typography>
            </Box>
            <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha('#f59e0b', 0.08), color: '#f59e0b', fontSize: '0.62rem', fontWeight: 700 }}>
              {chainFees.burnPct}% BURN
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Burn % (Deflationary)" type="number" size="small" fullWidth value={chainFees.burnPct} onChange={e => setChainFees(p => ({ ...p, burnPct: safeNum(e.target.value) }))} />
            <FormControl fullWidth size="small">
              <InputLabel>Remainder Recipient</InputLabel>
              <Select value={chainFees.feeRecipient} label="Remainder Recipient" onChange={e => setChainFees(p => ({ ...p, feeRecipient: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="validator">Block Proposer (Validator)</MenuItem>
                <MenuItem value="treasury">Community Treasury</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </SectionCard>
    </Stack>
  );
}
