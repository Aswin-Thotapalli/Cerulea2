'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, Chip, Slider,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import TokenIcon from "@mui/icons-material/Token";
import PieChartIcon from "@mui/icons-material/PieChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SectionCard, OPAQUE_MENU_PROPS, safeNum, ChainToken } from './step3-shared';

interface Props {
  chainToken: ChainToken;
  setChainToken: React.Dispatch<React.SetStateAction<ChainToken>>;
  legacyMode: "none" | "existing";
}

export default function ChainTokenomicsPanel({ chainToken, setChainToken, legacyMode }: Props) {
  const total = chainToken.dist.validators + chainToken.dist.treasury + chainToken.dist.community;
  const isError = total !== 100;
  const TOK_COLOR = '#8b5cf6';

  return (
    <Stack spacing={2}>
      {legacyMode === 'existing' && (
        <Box sx={{ px: 2.5, py: 1.5, borderRadius: 2, bgcolor: alpha(TOK_COLOR, 0.07), border: `1px solid ${alpha(TOK_COLOR, 0.2)}` }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningAmberIcon sx={{ fontSize: 15, color: TOK_COLOR }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: TOK_COLOR }}>
              Existing network — these values will be imported from your current chain genesis. Adjust only what needs to change.
            </Typography>
          </Stack>
        </Box>
      )}

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(TOK_COLOR, 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha(TOK_COLOR, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TokenIcon sx={{ fontSize: 15, color: TOK_COLOR }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Core Asset</Typography>
              <Typography variant="caption" color="text.secondary">Token name, symbol, and supply model</Typography>
            </Box>
            <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha(TOK_COLOR, 0.08), color: TOK_COLOR, fontSize: '0.62rem', fontWeight: 700 }}>
              {chainToken.symbol}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Token Name" size="small" fullWidth value={chainToken.name} onChange={e => setChainToken(p => ({ ...p, name: e.target.value }))} />
            <TextField label="Symbol" size="small" fullWidth value={chainToken.symbol} onChange={e => setChainToken(p => ({ ...p, symbol: e.target.value }))} />
            <FormControl fullWidth size="small">
              <InputLabel>Supply Model</InputLabel>
              <Select value={chainToken.model} label="Supply Model" onChange={e => setChainToken(p => ({ ...p, model: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="inflationary">Inflationary</MenuItem>
                <MenuItem value="deflationary">Deflationary</MenuItem>
                <MenuItem value="fixed">Fixed Supply</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(TOK_COLOR, 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha(TOK_COLOR, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PieChartIcon sx={{ fontSize: 15, color: TOK_COLOR }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Genesis Distribution</Typography>
              <Typography variant="caption" color="text.secondary">How the initial token supply is allocated</Typography>
            </Box>
            {isError && (
              <Chip icon={<WarningAmberIcon sx={{ fontSize: 12 }} />} label={`${total}% — must equal 100%`} size="small" color="error" variant="outlined"
                sx={{ ml: 'auto', height: 20, fontSize: '0.62rem' }} />
            )}
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.75}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">VALIDATORS</Typography>
                <Typography variant="caption" fontWeight={800} sx={{ color: TOK_COLOR }}>{chainToken.dist.validators}%</Typography>
              </Stack>
              <Slider value={chainToken.dist.validators} onChange={(_, v) => setChainToken(p => ({ ...p, dist: { ...p.dist, validators: v as number } }))} sx={{ color: TOK_COLOR }} />
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.75}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">TREASURY</Typography>
                <Typography variant="caption" fontWeight={800} sx={{ color: '#4F46E5' }}>{chainToken.dist.treasury}%</Typography>
              </Stack>
              <Slider value={chainToken.dist.treasury} onChange={(_, v) => setChainToken(p => ({ ...p, dist: { ...p.dist, treasury: v as number } }))} color="secondary" />
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.75}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">COMMUNITY / AIRDROP</Typography>
                <Typography variant="caption" fontWeight={800} sx={{ color: '#10b981' }}>{chainToken.dist.community}%</Typography>
              </Stack>
              <Slider value={chainToken.dist.community} onChange={(_, v) => setChainToken(p => ({ ...p, dist: { ...p.dist, community: v as number } }))} sx={{ color: '#10b981' }} />
            </Box>
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
              <Typography variant="subtitle2" fontWeight={800}>Vesting & Inflation</Typography>
              <Typography variant="caption" color="text.secondary">Lock-up schedule and annual emission rate</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Cliff Period (Months)" type="number" size="small" fullWidth value={chainToken.vestingCliff} onChange={e => setChainToken(p => ({ ...p, vestingCliff: safeNum(e.target.value) }))} />
            <TextField label="Vesting Duration (Months)" type="number" size="small" fullWidth value={chainToken.vestingDuration} onChange={e => setChainToken(p => ({ ...p, vestingDuration: safeNum(e.target.value) }))} />
            <TextField label="Annual Inflation %" type="number" size="small" fullWidth value={chainToken.inflation} onChange={e => setChainToken(p => ({ ...p, inflation: safeNum(e.target.value) }))} helperText="Minted annually for staking" />
          </Box>
        </Box>
      </SectionCard>
    </Stack>
  );
}
