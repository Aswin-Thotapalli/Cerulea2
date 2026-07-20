'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, Switch,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SectionCard, safeNum, ChainStaking } from './step3-shared';

interface Props {
  chainStaking: ChainStaking;
  setChainStaking: React.Dispatch<React.SetStateAction<ChainStaking>>;
}

export default function ChainStakingPanel({ chainStaking, setChainStaking }: Props) {
  const STK_COLOR = '#8b5cf6';

  return (
    <Stack spacing={2}>
      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(STK_COLOR, 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha(STK_COLOR, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <VerifiedUserIcon sx={{ fontSize: 15, color: STK_COLOR }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Validator Requirements</Typography>
              <Typography variant="caption" color="text.secondary">Minimum stake and validator count limits</Typography>
            </Box>
            <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha(STK_COLOR, 0.08), color: STK_COLOR, fontSize: '0.62rem', fontWeight: 700 }}>
              MAX {chainStaking.maxValidators}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Min Self-Stake (tokens)" type="number" size="small" fullWidth value={chainStaking.minStake} onChange={e => setChainStaking(p => ({ ...p, minStake: safeNum(e.target.value) }))} />
            <TextField label="Max Validator Count" type="number" size="small" fullWidth value={chainStaking.maxValidators} onChange={e => setChainStaking(p => ({ ...p, maxValidators: safeNum(e.target.value) }))} />
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
              <Typography variant="subtitle2" fontWeight={800}>Delegation Rules</Typography>
              <Typography variant="caption" color="text.secondary">Whether stakers can delegate to validators</Typography>
            </Box>
            <Switch size="small" checked={chainStaking.delegationEnabled} onChange={e => setChainStaking(p => ({ ...p, delegationEnabled: e.target.checked }))} sx={{ ml: 'auto' }} />
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Min Delegation (tokens)" type="number" size="small" fullWidth value={chainStaking.minDelegation} onChange={e => setChainStaking(p => ({ ...p, minDelegation: safeNum(e.target.value) }))} disabled={!chainStaking.delegationEnabled} />
            <TextField label="Unbonding Period (Days)" type="number" size="small" fullWidth value={chainStaking.unbondTime} onChange={e => setChainStaking(p => ({ ...p, unbondTime: safeNum(e.target.value) }))} disabled={!chainStaking.delegationEnabled} />
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
              <Typography variant="subtitle2" fontWeight={800}>Slashing & Penalties</Typography>
              <Typography variant="caption" color="text.secondary">Punishment parameters for misbehaving validators</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Double Sign Slash %" type="number" size="small" fullWidth value={chainStaking.doubleSignSlash} onChange={e => setChainStaking(p => ({ ...p, doubleSignSlash: safeNum(e.target.value) }))} />
            <TextField label="Downtime Slash %" type="number" size="small" fullWidth value={chainStaking.downtimeSlash} onChange={e => setChainStaking(p => ({ ...p, downtimeSlash: safeNum(e.target.value) }))} />
            <TextField label="Jail Time (Hours)" type="number" size="small" fullWidth value={chainStaking.jailTime} onChange={e => setChainStaking(p => ({ ...p, jailTime: safeNum(e.target.value) }))} helperText="Ban duration after slash" />
          </Box>
        </Box>
      </SectionCard>
    </Stack>
  );
}
