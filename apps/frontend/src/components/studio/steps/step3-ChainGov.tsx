'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, FormControlLabel, Switch,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import GavelIcon from "@mui/icons-material/Gavel";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SectionCard, OPAQUE_MENU_PROPS, safeNum, ChainGov } from './step3-shared';

interface Props {
  chainGov: ChainGov;
  setChainGov: React.Dispatch<React.SetStateAction<ChainGov>>;
}

export default function ChainGovPanel({ chainGov, setChainGov }: Props) {
  const GOV_COLOR = '#4F46E5';

  return (
    <Stack spacing={2}>
      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(GOV_COLOR, 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha(GOV_COLOR, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AccountBalanceIcon sx={{ fontSize: 15, color: GOV_COLOR }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Voting Config</Typography>
              <Typography variant="caption" color="text.secondary">Voting model, quorum, and period</Typography>
            </Box>
            <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha(GOV_COLOR, 0.08), color: GOV_COLOR, fontSize: '0.62rem', fontWeight: 700 }}>
              {chainGov.model.toUpperCase()}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Voting Model</InputLabel>
              <Select value={chainGov.model} label="Voting Model" onChange={e => setChainGov(p => ({ ...p, model: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                <MenuItem value="token">Token Weighted</MenuItem>
                <MenuItem value="quadratic">Quadratic Voting</MenuItem>
                <MenuItem value="council">Council Multisig</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Voting Period (Days)" type="number" size="small" fullWidth value={chainGov.votingPeriod} onChange={e => setChainGov(p => ({ ...p, votingPeriod: safeNum(e.target.value) }))} />
            <TextField label="Quorum Required %" type="number" size="small" fullWidth value={chainGov.quorum} onChange={e => setChainGov(p => ({ ...p, quorum: safeNum(e.target.value) }))} />
            <TextField label="Pass Threshold %" type="number" size="small" fullWidth value={chainGov.passThreshold} onChange={e => setChainGov(p => ({ ...p, passThreshold: safeNum(e.target.value) }))} />
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#f59e0b', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#f59e0b', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GavelIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Proposal Safety</Typography>
              <Typography variant="caption" color="text.secondary">Thresholds and timelock for proposals</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Proposal Threshold (tokens)" type="number" size="small" fullWidth value={chainGov.proposalThreshold} onChange={e => setChainGov(p => ({ ...p, proposalThreshold: safeNum(e.target.value) }))} helperText="Min tokens to propose" />
            <TextField label="Timelock Delay (Hours)" type="number" size="small" fullWidth value={chainGov.timelockDelay} onChange={e => setChainGov(p => ({ ...p, timelockDelay: safeNum(e.target.value) }))} helperText="Execution delay after vote" />
            <TextField label="Cancel Threshold (tokens)" type="number" size="small" fullWidth value={chainGov.cancelThreshold} onChange={e => setChainGov(p => ({ ...p, cancelThreshold: safeNum(e.target.value) }))} helperText="Force-cancel a proposal" />
          </Box>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#ef4444', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#ef4444', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WarningAmberIcon sx={{ fontSize: 15, color: '#ef4444' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Emergency Controls</Typography>
              <Typography variant="caption" color="text.secondary">Safety halt and veto mechanisms</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <TextField label="Emergency DAO Address" size="small" fullWidth value={chainGov.emergencyDao} onChange={e => setChainGov(p => ({ ...p, emergencyDao: e.target.value }))} placeholder="0x..." helperText="Can pause the chain during exploits" sx={{ mb: 2 }} />
          <FormControlLabel
            control={<Switch size="small" checked={chainGov.vetoEnabled} onChange={e => setChainGov(p => ({ ...p, vetoEnabled: e.target.checked }))} />}
            label={<Typography variant="body2">Enable Security Council Veto</Typography>}
            sx={{ display: 'flex', alignItems: 'center', m: 0 }}
          />
        </Box>
      </SectionCard>
    </Stack>
  );
}
