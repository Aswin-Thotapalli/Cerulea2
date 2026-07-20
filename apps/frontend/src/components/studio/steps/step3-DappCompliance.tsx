'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, Chip, FormControlLabel, Switch, Autocomplete,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import GavelIcon from "@mui/icons-material/Gavel";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PieChartIcon from "@mui/icons-material/PieChart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { SectionCard, OPAQUE_MENU_PROPS, COUNTRIES, DappCompliance } from './step3-shared';

interface Props {
  dappCompliance: DappCompliance;
  setDappCompliance: React.Dispatch<React.SetStateAction<DappCompliance>>;
  dappVisibility: "public" | "private";
}

export default function DappCompliancePanel({ dappCompliance, setDappCompliance, dappVisibility }: Props) {
  return (
    <Stack spacing={2}>
      {dappVisibility === 'private' && (
        <Box sx={{ px: 2.5, py: 1.5, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.07), border: `1px solid ${alpha('#8b5cf6', 0.2)}` }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <VerifiedUserIcon sx={{ fontSize: 15, color: '#8b5cf6' }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#8b5cf6' }}>
              Private dApp — access is gated by invite or wallet allowlist. Full public KYC is not required.
            </Typography>
          </Stack>
        </Box>
      )}

      {dappVisibility === 'public' ? (
        <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03), borderRadius: '12px 12px 0 0' }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GavelIcon sx={{ fontSize: 15, color: '#8b5cf6' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Identity Verification (KYC)</Typography>
                <Typography variant="caption" color="text.secondary">Provider and verification level for public users</Typography>
              </Box>
              <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.08), color: '#8b5cf6', fontSize: '0.62rem', fontWeight: 700 }}>
                {dappCompliance.kycLevel.toUpperCase()}
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>KYC Provider</InputLabel>
                <Select value={dappCompliance.kycProvider} label="KYC Provider" onChange={e => setDappCompliance(p => ({ ...p, kycProvider: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                  <MenuItem value="Sumsub">Sumsub</MenuItem>
                  <MenuItem value="Persona">Persona</MenuItem>
                  <MenuItem value="Parallel">Parallel Markets</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Verification Level</InputLabel>
                <Select value={dappCompliance.kycLevel} label="Verification Level" onChange={e => setDappCompliance(p => ({ ...p, kycLevel: e.target.value }))} MenuProps={OPAQUE_MENU_PROPS as any}>
                  <MenuItem value="basic">Basic (ID Only)</MenuItem>
                  <MenuItem value="liveness">Liveness Check</MenuItem>
                  <MenuItem value="strict">Strict (Proof of Address)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField label="Provider API Key" type="password" fullWidth size="small" value={dappCompliance.apiKey} onChange={e => setDappCompliance(p => ({ ...p, apiKey: e.target.value }))} />
          </Box>
        </SectionCard>
      ) : (
        <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03), borderRadius: '12px 12px 0 0' }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <VerifiedUserIcon sx={{ fontSize: 15, color: '#8b5cf6' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Access Control</Typography>
                <Typography variant="caption" color="text.secondary">Wallet allowlist and invite-based gating</Typography>
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Access Mode</InputLabel>
                <Select defaultValue="allowlist" label="Access Mode" MenuProps={OPAQUE_MENU_PROPS as any}>
                  <MenuItem value="allowlist">Wallet Allowlist</MenuItem>
                  <MenuItem value="invite">Invite Link</MenuItem>
                  <MenuItem value="nft-gate">NFT-Gated</MenuItem>
                  <MenuItem value="token-gate">Token-Gated</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Approval Flow</InputLabel>
                <Select defaultValue="manual" label="Approval Flow" MenuProps={OPAQUE_MENU_PROPS as any}>
                  <MenuItem value="auto">Auto-approve wallets</MenuItem>
                  <MenuItem value="manual">Manual review</MenuItem>
                  <MenuItem value="admin">Admin whitelist only</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControlLabel
              control={<Switch size="small" defaultChecked />}
              label={<Typography variant="body2">Require wallet signature on first access</Typography>}
              sx={{ display: 'flex', alignItems: 'center' }}
            />
          </Box>
        </SectionCard>
      )}

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#ef4444', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#ef4444', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PieChartIcon sx={{ fontSize: 15, color: '#ef4444' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Geographic Restrictions</Typography>
              <Typography variant="caption" color="text.secondary">
                {dappCompliance.geoBlock.length > 0 ? `${dappCompliance.geoBlock.length} region${dappCompliance.geoBlock.length !== 1 ? 's' : ''} blocked` : 'No geo restrictions'}
              </Typography>
            </Box>
            {dappCompliance.gdprCompliant && (
              <Chip label="GDPR" size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.6rem', bgcolor: alpha('#10b981', 0.1), color: '#10b981', fontWeight: 700 }} />
            )}
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Autocomplete
              multiple
              options={COUNTRIES}
              getOptionLabel={(option) => option.label}
              value={dappCompliance.geoBlock}
              onChange={(_, val) => setDappCompliance(p => ({ ...p, geoBlock: val }))}
              renderInput={(params) => <TextField {...params} size="small" label="Geo-Blocked Regions" placeholder="Select countries" />}
            />
            <FormControlLabel
              control={<Switch size="small" checked={dappCompliance.gdprCompliant} onChange={e => setDappCompliance(p => ({ ...p, gdprCompliant: e.target.checked }))} />}
              label={<Typography variant="body2">Enforce GDPR Consent Flow</Typography>}
              sx={{ display: 'flex', alignItems: 'center', m: 0 }}
            />
          </Stack>
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03), borderRadius: '12px 12px 0 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ReceiptLongIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>Legal Links</Typography>
              <Typography variant="caption" color="text.secondary">Terms of service and privacy policy URLs</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Terms of Service URL" fullWidth size="small" value={dappCompliance.termsUrl} onChange={e => setDappCompliance(p => ({ ...p, termsUrl: e.target.value }))} />
            <TextField label="Privacy Policy URL" fullWidth size="small" value={dappCompliance.privacyUrl} onChange={e => setDappCompliance(p => ({ ...p, privacyUrl: e.target.value }))} />
          </Box>
        </Box>
      </SectionCard>
    </Stack>
  );
}
