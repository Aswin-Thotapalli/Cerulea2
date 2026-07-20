'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, FormControlLabel, Switch,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import TokenIcon from "@mui/icons-material/Token";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { SectionCard, OPAQUE_MENU_PROPS, safeNum, DappAssets } from './step3-shared';

interface Props {
  dappAssets: DappAssets;
  setDappAssets: React.Dispatch<React.SetStateAction<DappAssets>>;
  hasErc20: boolean;
  hasNft: boolean;
}

export default function DappAssetsPanel({ dappAssets, setDappAssets, hasErc20, hasNft }: Props) {
  return (
    <Stack spacing={2}>
      {hasErc20 && (
        <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TokenIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>ERC-20 Identity & Supply</Typography>
                <Typography variant="caption" color="text.secondary">Token name, symbol, and maximum supply</Typography>
              </Box>
              <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5', fontSize: '0.62rem', fontWeight: 700 }}>
                {dappAssets.erc20.symbol}
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
              <TextField label="Token Name" size="small" fullWidth value={dappAssets.erc20.name} onChange={e => setDappAssets(p => ({ ...p, erc20: { ...p.erc20, name: e.target.value } }))} />
              <TextField label="Symbol" size="small" fullWidth value={dappAssets.erc20.symbol} onChange={e => setDappAssets(p => ({ ...p, erc20: { ...p.erc20, symbol: e.target.value } }))} />
              <TextField label="Max Supply" type="number" size="small" fullWidth value={dappAssets.erc20.supply} onChange={e => setDappAssets(p => ({ ...p, erc20: { ...p.erc20, supply: safeNum(e.target.value) } }))} />
            </Box>
          </Box>
        </SectionCard>
      )}

      {hasErc20 && (
        <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShowChartIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Token Rules</Typography>
                <Typography variant="caption" color="text.secondary">Minting, burning, and access control</Typography>
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
              <FormControlLabel control={<Switch size="small" checked={dappAssets.erc20.mintable} onChange={e => setDappAssets(p => ({ ...p, erc20: { ...p.erc20, mintable: e.target.checked } }))} />} label={<Typography variant="body2">Mintable (owner can mint)</Typography>} sx={{ display: 'flex', alignItems: 'center', m: 0 }} />
              <FormControlLabel control={<Switch size="small" checked={dappAssets.erc20.burnable} onChange={e => setDappAssets(p => ({ ...p, erc20: { ...p.erc20, burnable: e.target.checked } }))} />} label={<Typography variant="body2">Burnable (user can burn)</Typography>} sx={{ display: 'flex', alignItems: 'center', m: 0 }} />
              <FormControlLabel control={<Switch size="small" checked={dappAssets.erc20.blacklist} onChange={e => setDappAssets(p => ({ ...p, erc20: { ...p.erc20, blacklist: e.target.checked } }))} />} label={<Typography variant="body2">Blocklist Support</Typography>} sx={{ display: 'flex', alignItems: 'center', m: 0 }} />
            </Stack>
          </Box>
        </SectionCard>
      )}

      {hasNft && (
        <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03), borderRadius: '12px 12px 0 0' }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <VerifiedUserIcon sx={{ fontSize: 15, color: '#8b5cf6' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>NFT Collection Settings</Typography>
                <Typography variant="caption" color="text.secondary">Collection identity, minting, and royalties</Typography>
              </Box>
              <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.08), color: '#8b5cf6', fontSize: '0.62rem', fontWeight: 700 }}>
                {dappAssets.nft.symbol}
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <TextField label="Collection Name" size="small" fullWidth value={dappAssets.nft.name} onChange={e => setDappAssets(p => ({ ...p, nft: { ...p.nft, name: e.target.value } }))} />
              <TextField label="Symbol" size="small" fullWidth value={dappAssets.nft.symbol} onChange={e => setDappAssets(p => ({ ...p, nft: { ...p.nft, symbol: e.target.value } }))} />
              <TextField label="Mint Price (ETH)" type="number" size="small" fullWidth value={dappAssets.nft.price} onChange={e => setDappAssets(p => ({ ...p, nft: { ...p.nft, price: safeNum(e.target.value) } }))} />
              <FormControl fullWidth size="small">
                <InputLabel>Royalty Enforcement</InputLabel>
                <Select value={dappAssets.nft.royaltyEnforcement} label="Royalty Enforcement" onChange={e => setDappAssets(p => ({ ...p, nft: { ...p.nft, royaltyEnforcement: e.target.value } }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                  <MenuItem value="standard">EIP-2981 Standard</MenuItem>
                  <MenuItem value="marketplace">Marketplace Registry</MenuItem>
                  <MenuItem value="hard">Hard Enforcement</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Metadata Storage</InputLabel>
                <Select value={dappAssets.nft.metadataStorage} label="Metadata Storage" onChange={e => setDappAssets(p => ({ ...p, nft: { ...p.nft, metadataStorage: e.target.value } }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                  <MenuItem value="ipfs">IPFS (Decentralized)</MenuItem>
                  <MenuItem value="arweave">Arweave (Permanent)</MenuItem>
                  <MenuItem value="centralized">Centralized Server</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControlLabel control={<Switch size="small" checked={dappAssets.nft.soulbound} onChange={e => setDappAssets(p => ({ ...p, nft: { ...p.nft, soulbound: e.target.checked } }))} />} label={<Typography variant="body2">Soulbound (Non-Transferable)</Typography>} sx={{ display: 'flex', alignItems: 'center', m: 0 }} />
              <FormControlLabel control={<Switch size="small" checked={dappAssets.nft.reveal} onChange={e => setDappAssets(p => ({ ...p, nft: { ...p.nft, reveal: e.target.checked } }))} />} label={<Typography variant="body2">Delayed Reveal</Typography>} sx={{ display: 'flex', alignItems: 'center', m: 0 }} />
            </Stack>
          </Box>
        </SectionCard>
      )}
    </Stack>
  );
}
