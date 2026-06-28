'use client';

import React, { useEffect, useMemo, useState } from "react";
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Box, Button, Divider, IconButton, Stack, Typography, TextField,
  Select, MenuItem, Chip, FormControlLabel, Switch, Paper,
  Tooltip, Fade,  FormControl, InputLabel, Slider, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent
} from "@mui/material";
import Grid from '@mui/material/GridLegacy';
import { useTheme, styled, alpha } from "@mui/material/styles";
import { useRouter, useSearchParams } from "next/navigation";

// Icons
import ArrowBackIcon from "@mui/icons-material/KeyboardArrowLeft";
import ArrowForwardIcon from "@mui/icons-material/KeyboardArrowRight";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import TokenIcon from "@mui/icons-material/Token";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import GavelIcon from "@mui/icons-material/Gavel";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/* ------------------ Styled Components ------------------ */

// 1. Navigation Dock
const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(13,21,53,0.97)',
  backdropFilter: 'blur(16px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
  boxShadow: '0 20px 40px -8px rgba(0,0,0,0.4)',
  borderRadius: 100,
  padding: '8px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  zIndex: 1000,
  pointerEvents: 'auto',
}));

// Section Card
const SectionCard = styled(Paper)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  marginBottom: theme.spacing(2),
  overflow: 'hidden',
}));

// Opaque Menu
const OPAQUE_MENU_PROPS = {
  PaperProps: {
    sx: {
      backgroundImage: 'none',
      backgroundColor: (t: any) => t.palette.mode === 'light' ? '#ffffff' : '#0D1535',
      border: '1px solid',
      borderColor: (t: any) => alpha(t.palette.primary.main, 0.15),
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      borderRadius: 2,
    }
  }
};

/* ------------------ Domain Helpers ------------------ */
function safeNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// Country list for Compliance
const COUNTRIES = [
  { code: 'US', label: 'United States' }, { code: 'CN', label: 'China' },
  { code: 'RU', label: 'Russia' }, { code: 'KP', label: 'North Korea' },
  { code: 'GB', label: 'United Kingdom' }, { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' }, { code: 'FR', label: 'France' },
];

/* ------------------ Component ------------------ */
export default function Step3({ goPrev, goNext, projectId }: { goPrev?: () => void; goNext?: () => void; projectId: string | null }) {
  const theme = useTheme();
  const router = useRouter();
  const sp = useSearchParams();

  // Resolution
  const [resolvedId, setResolvedId] = useState<string | null>(projectId);
  useEffect(() => {
    if (!resolvedId) {
       const ls = typeof window !== 'undefined' ? localStorage.getItem('cerulea.activeProjectId') : null;
       setResolvedId(sp?.get('projectId') || ls);
    }
  }, [projectId, sp, resolvedId]);

  // State
  const [projectType, setProjectType] = useState<"dapp" | "blockchain">("dapp");
  const [activeTab, setActiveTab] = useState("rev");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // --- DAPP DATA ---
  const [dappRevenue, setDappRevenue] = useState({
    modes: [] as string[], currency: 'USD',
    billingModel: "hybrid", trialDays: 14,
    meteredRate: 0.05, meteredUnit: 'request', meteredCap: 0,
    tiers: [
       { name: 'Starter', monthly: 0, annual: 0, limit: '1k req/mo' },
       { name: 'Pro', monthly: 29, annual: 290, limit: '100k req/mo' }
    ]
  });
  const [dappAssets, setDappAssets] = useState({
    erc20: { name: "Governance Token", symbol: "GOV", supply: 10000000, mintable: true, burnable: true, blacklist: false },
    nft: { 
       name: "Membership Pass", symbol: "PASS", supply: 5000, price: 0.1, 
       metadataStorage: "ipfs", soulbound: false, royaltyEnforcement: "standard", reveal: false 
    }
  });
  const [dappFees, setDappFees] = useState({
    platformFee: 2.5, referralFee: 1.0,
    minPayout: 50, payoutSchedule: 'weekly', chargebackMode: 'manual',
    splits: [{ label: 'Treasury', address: '', pct: 90 }, { label: 'Dev Fund', address: '', pct: 10 }]
  });
  const [dappPayments, setDappPayments] = useState({
    fiatEnabled: true, cryptoEnabled: true,
    fiatProvider: 'Stripe', cryptoTokens: ['USDC', 'ETH'],
    treasury: '', settlementTime: 'T+2',
    checkoutTheme: 'dark', successUrl: '', cancelUrl: ''
  });
  const [dappCompliance, setDappCompliance] = useState({
    kycProvider: 'Sumsub', kycLevel: 'basic',
    geoBlock: [] as any[], gdprCompliant: true,
    apiKey: '', termsUrl: '', privacyUrl: ''
  });

  // --- CHAIN DATA ---
  const [chainToken, setChainToken] = useState({
    name: "Network Token", symbol: "NET", supply: 100000000,
    dist: { validators: 40, treasury: 30, community: 30 },
    inflation: 5, vestingCliff: 12, vestingDuration: 48,
    model: 'inflationary'
  });
  const [chainFees, setChainFees] = useState({
    baseFee: 10, dynamic: true, burnPct: 50, priorityTip: true,
    blockGasLimit: 30000000, elasticity: 2, targetBlockFullness: 50,
    feeRecipient: 'validator'
  });
  const [chainStaking, setChainStaking] = useState({
    minStake: 3200, unbondTime: 21, slashing: true, 
    jailTime: 24, maxValidators: 100,
    delegationEnabled: true, minDelegation: 1, rewardsCycle: 24,
    doubleSignSlash: 5, downtimeSlash: 0.1
  });
  const [chainGov, setChainGov] = useState({
    model: 'token', quorum: 4, passThreshold: 66,
    votingPeriod: 5, emergencyDao: '', vetoEnabled: true,
    timelockDelay: 48, proposalThreshold: 10000, cancelThreshold: 50000
  });

  // Module Detection
  const [hasErc20, setHasErc20] = useState(false);
  const [hasNft, setHasNft] = useState(false);

  useEffect(() => {
    const lsType = typeof window !== 'undefined' ? localStorage.getItem('cerulea.projectType') : null;
    if (lsType) setProjectType(lsType as any);

    // Load pre-populated economics (set by StudioEntry from DB)
    const econRaw = typeof window !== 'undefined' ? localStorage.getItem('cerulea.economics') : null;
    if (econRaw) {
      try {
        const econ = JSON.parse(econRaw);
        if (econ.tokenomics) {
          const t = econ.tokenomics;
          const dist = t.distribution ?? {};
          const validatorPct = dist.validators?.percent ?? 40;
          const treasuryPct = dist.platformTreasury?.percent ?? 30;
          const communityPct = Math.max(0, 100 - validatorPct - treasuryPct);
          setChainToken((prev) => ({
            ...prev,
            symbol: t.symbol ?? prev.symbol,
            name: t.name ?? prev.name,
            supply: t.totalSupply ?? prev.supply,
            inflation: t.inflationRate ?? prev.inflation,
            dist: { validators: validatorPct, treasury: treasuryPct, community: communityPct },
            model: (t.inflationRate ?? 0) > 0 ? 'inflationary' : 'fixed',
          }));
        }
        if (econ.gasPolicy) {
          const g = econ.gasPolicy;
          setChainFees((prev) => ({
            ...prev,
            baseFee: g.baseFee ?? prev.baseFee,
            burnPct: g.burnPercent ?? prev.burnPct,
            blockGasLimit: g.blockGasLimit ?? prev.blockGasLimit,
            elasticity: g.elasticityMultiplier ?? prev.elasticity,
          }));
        }
        if (econ.staking) {
          const s = econ.staking;
          const slash = s.slashingConditions ?? {};
          setChainStaking((prev) => ({
            ...prev,
            minStake: s.minValidatorStake ?? prev.minStake,
            unbondTime: s.unbondingPeriodDays ?? prev.unbondTime,
            maxValidators: s.maxValidatorCount ?? prev.maxValidators,
            delegationEnabled: s.delegationEnabled ?? prev.delegationEnabled,
            minDelegation: s.minDelegationAmount ?? prev.minDelegation,
            doubleSignSlash: slash.doubleSigning?.slashPercent ?? prev.doubleSignSlash,
            downtimeSlash: slash.downtime?.slashPercent ?? prev.downtimeSlash,
          }));
        }
        if (econ.governance) {
          const gov = econ.governance;
          setChainGov((prev) => ({
            ...prev,
            model: gov.model === 'token-weighted-voting' ? 'token' : (gov.model ?? prev.model),
            quorum: gov.quorumPercent ?? prev.quorum,
            passThreshold: gov.passThresholdPercent ?? prev.passThreshold,
            votingPeriod: gov.votingPeriodDays ?? prev.votingPeriod,
            timelockDelay: gov.timelockDelayHours ?? prev.timelockDelay,
            vetoEnabled: (gov.vetoThresholdPercent ?? 0) > 0,
          }));
        }
      } catch {}
    }

    const mods = typeof window !== 'undefined' ? localStorage.getItem('cerulea.templateModules') : null;
    if (mods) {
       setHasErc20(mods.includes('erc20') || mods.includes('token'));
       setHasNft(mods.includes('nft') || mods.includes('erc721'));
    } else {
       setHasErc20(true);
       setHasNft(true);
    }
  }, []);

  // Tabs
  const tabs = useMemo(() => {
    if (projectType === 'dapp') {
       const list = [
          { key: 'rev', label: 'Monetization', icon: <MonetizationOnIcon fontSize="small" /> },
          { key: 'pay', label: 'Payments', icon: <AccountBalanceWalletIcon fontSize="small" /> },
          { key: 'assets', label: 'Assets', icon: <TokenIcon fontSize="small" />, hidden: !hasErc20 && !hasNft },
          { key: 'fees', label: 'Fees & Splits', icon: <ReceiptLongIcon fontSize="small" /> },
          { key: 'comp', label: 'Compliance', icon: <GavelIcon fontSize="small" /> },
       ];
       return list.filter(x => !x.hidden);
    } else {
       return [
          { key: 'tok', label: 'Tokenomics', icon: <PieChartIcon fontSize="small" /> },
          { key: 'fees', label: 'Gas Policy', icon: <ShowChartIcon fontSize="small" /> },
          { key: 'stk', label: 'Staking', icon: <VerifiedUserIcon fontSize="small" /> },
          { key: 'gov', label: 'Governance', icon: <AccountBalanceIcon fontSize="small" /> },
       ];
    }
  }, [projectType, hasErc20, hasNft]);

  useEffect(() => {
     if (!tabs.find(t => t.key === activeTab)) setActiveTab(tabs[0]?.key || 'rev');
  }, [tabs, activeTab]);

  const handleSave = () => {
     if (goNext) goNext();
  };

  /* --- HELP CONTENT --- */
  const getHelpContent = () => {
    if (projectType === 'dapp') {
      switch(activeTab) {
        case 'rev': return { title: 'dApp Monetization', text: 'Configure how you make money. Set up recurring subscriptions, metered usage (API calls), or one-time license fees.' };
        case 'pay': return { title: 'Payment Gateways', text: 'Connect real-world payment rails. Fiat requires a provider like Stripe. Crypto requires a wallet address for settlements.' };
        case 'assets': return { title: 'Token Configuration', text: 'Define the properties of your digital assets. Mintable tokens allow supply growth. Soulbound NFTs are permanently locked to a wallet.' };
        case 'fees': return { title: 'Revenue Splits', text: 'Automate your cash flow. Platform fees are deducted from every transaction. Splits route funds to team/treasury wallets instantly.' };
        case 'comp': return { title: 'Legal & Compliance', text: 'Manage regulatory requirements. Geo-blocking prevents access from sanctioned regions. KYC ensures user identity verification.' };
        default: return { title: 'Economics', text: 'Configure the financial engine.' };
      }
    } else {
      switch(activeTab) {
        case 'tok': return { title: 'Network Tokenomics', text: 'The lifeblood of your chain. Inflation incentivizes security. Vesting locks tokens for early backers. Distribution balances power.' };
        case 'fees': return { title: 'Gas & Fees', text: 'Control the cost of blockspace. EIP-1559 burns base fees to counter inflation. Elasticity manages congestion spikes.' };
        case 'stk': return { title: 'PoS Staking', text: 'Security parameters. Bonding locks capital to prevent attacks. Slashing punishes bad behavior. Jailing removes offline nodes.' };
        case 'gov': return { title: 'On-Chain Governance', text: 'Decentralized decision making. Timelocks prevent flash attacks. Emergency DAOs provide a safety halt switch.' };
        default: return { title: 'Economics', text: 'Configure the financial engine.' };
      }
    }
  };

  const helpContent = getHelpContent();

  /* --- RENDERERS --- */

  const renderDappRevenue = () => (
    <Stack spacing={2}>
       {/* Section 1: Core Pricing */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
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
            <Grid container spacing={2.5}>
               <Grid xs={12} md={4}>
                  <FormControl fullWidth size="small">
                     <InputLabel>Billing Model</InputLabel>
                     <Select value={dappRevenue.billingModel} label="Billing Model" onChange={e => setDappRevenue(p => ({...p, billingModel: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="subscription">Subscription (SaaS)</MenuItem>
                        <MenuItem value="usage">Usage Based (Metered)</MenuItem>
                        <MenuItem value="hybrid">Hybrid</MenuItem>
                        <MenuItem value="one-time">One-Time License</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
               <Grid xs={12} md={4}>
                  <FormControl fullWidth size="small">
                     <InputLabel>Base Currency</InputLabel>
                     <Select value={dappRevenue.currency} label="Base Currency" onChange={e => setDappRevenue(p => ({...p, currency: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="USD">USD ($)</MenuItem>
                        <MenuItem value="EUR">EUR (€)</MenuItem>
                        <MenuItem value="ETH">ETH (Ξ)</MenuItem>
                        <MenuItem value="USDC">USDC</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
               <Grid xs={12} md={4}>
                  <TextField label="Trial Period (days)" type="number" fullWidth size="small" value={dappRevenue.trialDays} onChange={e => setDappRevenue(p => ({...p, trialDays: safeNum(e.target.value)}))} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Section 2: Metering */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
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
            <Grid container spacing={2.5}>
               <Grid xs={12} md={4}>
                  <TextField label="Metered Rate (per unit)" type="number" fullWidth size="small" value={dappRevenue.meteredRate} onChange={e => setDappRevenue(p => ({...p, meteredRate: safeNum(e.target.value)}))} disabled={dappRevenue.billingModel === 'subscription'} />
               </Grid>
               <Grid xs={12} md={4}>
                  <TextField label="Unit Name" placeholder="e.g. Requests, GB" fullWidth size="small" value={dappRevenue.meteredUnit} onChange={e => setDappRevenue(p => ({...p, meteredUnit: e.target.value}))} disabled={dappRevenue.billingModel === 'subscription'} />
               </Grid>
               <Grid xs={12} md={4}>
                  <TextField label="Monthly Cap (0 = Unlimited)" type="number" fullWidth size="small" value={dappRevenue.meteredCap} onChange={e => setDappRevenue(p => ({...p, meteredCap: safeNum(e.target.value)}))} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Section 3: Tiers */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ReceiptLongIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Subscription Tiers</Typography>
                <Typography variant="caption" color="text.secondary">{dappRevenue.tiers.length} tier{dappRevenue.tiers.length !== 1 ? 's' : ''} configured</Typography>
              </Box>
              <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setDappRevenue(p => ({...p, tiers: [...p.tiers, {name:'New Tier', monthly:0, annual:0, limit:''}]}))}
                sx={{ ml: 'auto', borderRadius: 1, fontSize: '0.72rem', borderColor: alpha('#4F46E5', 0.35), color: '#4F46E5' }}>
                Add Tier
              </Button>
            </Stack>
          </Box>
          <Box>
            {/* Column headers */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 120px 120px 1.5fr 44px', gap: 1, px: 3, py: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: `1px solid ${theme.palette.divider}` }}>
              {['Tier Name', 'Monthly ($)', 'Annual ($)', 'Usage Limit', ''].map((h, i) => (
                <Typography key={i} variant="caption" fontWeight={800} sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled' }}>{h}</Typography>
              ))}
            </Box>
            {dappRevenue.tiers.map((t, i) => (
               <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 120px 120px 1.5fr 44px', gap: 1, px: 3, py: 1.25, alignItems: 'center', borderBottom: i < dappRevenue.tiers.length - 1 ? `1px solid ${theme.palette.divider}` : 'none', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }, transition: 'background 0.1s' }}>
                  <TextField size="small" variant="standard" value={t.name} onChange={e => { const n = [...dappRevenue.tiers]; n[i].name = e.target.value; setDappRevenue(p => ({...p, tiers: n}))}} InputProps={{ disableUnderline: true, style: { fontWeight: 700, fontSize: '0.85rem' } }} />
                  <TextField size="small" type="number" variant="standard" value={t.monthly} onChange={e => { const n = [...dappRevenue.tiers]; n[i].monthly = safeNum(e.target.value); setDappRevenue(p => ({...p, tiers: n}))}} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
                  <TextField size="small" type="number" variant="standard" value={t.annual} onChange={e => { const n = [...dappRevenue.tiers]; n[i].annual = safeNum(e.target.value); setDappRevenue(p => ({...p, tiers: n}))}} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
                  <TextField size="small" variant="standard" placeholder="e.g. 100k req/mo" value={t.limit} onChange={e => { const n = [...dappRevenue.tiers]; n[i].limit = e.target.value; setDappRevenue(p => ({...p, tiers: n}))}} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
                  <IconButton size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }} onClick={() => setDappRevenue(p => ({...p, tiers: p.tiers.filter((_, idx) => idx !== i)}))}>
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

  const renderDappAssets = () => (
    <Stack spacing={4}>
       <Box>
          <Stack direction="row" alignItems="center" spacing={2} mb={1}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TokenIcon sx={{ color: 'secondary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={800}>Asset Configuration</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Manage token standards, supplies, and metadata storage.</Typography>
       </Box>

       {/* Set 1: Token Identity */}
       {hasErc20 && (
          <SectionCard>
             <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <TokenIcon color="primary" />
                <Typography variant="h6" fontWeight={800}>1. ERC-20 Identity & Supply</Typography>
             </Stack>
             <Grid container spacing={3}>
                <Grid xs={12} md={4}>
                   <TextField label="Token Name" fullWidth value={dappAssets.erc20.name} onChange={e => setDappAssets(p => ({...p, erc20: {...p.erc20, name: e.target.value}}))} />
                </Grid>
                <Grid xs={12} md={4}>
                   <TextField label="Symbol" fullWidth value={dappAssets.erc20.symbol} onChange={e => setDappAssets(p => ({...p, erc20: {...p.erc20, symbol: e.target.value}}))} />
                </Grid>
                <Grid xs={12} md={4}>
                   <TextField label="Max Supply" type="number" fullWidth value={dappAssets.erc20.supply} onChange={e => setDappAssets(p => ({...p, erc20: {...p.erc20, supply: safeNum(e.target.value)}}))} />
                </Grid>
             </Grid>
          </SectionCard>
       )}

       {/* Set 2: Token Rules */}
       {hasErc20 && (
          <SectionCard>
             <Typography variant="h6" fontWeight={800} mb={3}>2. Token Rules</Typography>
             <Stack direction="row" spacing={4}>
                <FormControlLabel control={<Switch checked={dappAssets.erc20.mintable} onChange={e => setDappAssets(p => ({...p, erc20: {...p.erc20, mintable: e.target.checked}}))} />} label="Mintable (Owner can mint)" />
                <FormControlLabel control={<Switch checked={dappAssets.erc20.burnable} onChange={e => setDappAssets(p => ({...p, erc20: {...p.erc20, burnable: e.target.checked}}))} />} label="Burnable (User can burn)" />
                <FormControlLabel control={<Switch checked={dappAssets.erc20.blacklist} onChange={e => setDappAssets(p => ({...p, erc20: {...p.erc20, blacklist: e.target.checked}}))} />} label="Blacklist Support" />
             </Stack>
          </SectionCard>
       )}

       {/* Set 3: NFT Config */}
       {hasNft && (
          <SectionCard>
             <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <VerifiedUserIcon color="secondary" />
                <Typography variant="h6" fontWeight={800}>3. NFT Collection Settings</Typography>
             </Stack>
             <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                   <TextField label="Collection Name" fullWidth value={dappAssets.nft.name} onChange={e => setDappAssets(p => ({...p, nft: {...p.nft, name: e.target.value}}))} />
                </Grid>
                <Grid xs={12} md={3}>
                   <TextField label="Symbol" fullWidth value={dappAssets.nft.symbol} onChange={e => setDappAssets(p => ({...p, nft: {...p.nft, symbol: e.target.value}}))} />
                </Grid>
                <Grid xs={12} md={3}>
                   <TextField label="Mint Price (ETH)" type="number" fullWidth value={dappAssets.nft.price} onChange={e => setDappAssets(p => ({...p, nft: {...p.nft, price: safeNum(e.target.value)}}))} />
                </Grid>
                
                <Grid xs={12} md={6}>
                   <FormControl fullWidth>
                      <InputLabel>Metadata Storage</InputLabel>
                      <Select value={dappAssets.nft.metadataStorage} label="Metadata Storage" onChange={e => setDappAssets(p => ({...p, nft: {...p.nft, metadataStorage: e.target.value}}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                         <MenuItem value="ipfs">IPFS (Decentralized)</MenuItem>
                         <MenuItem value="arweave">Arweave (Permanent)</MenuItem>
                         <MenuItem value="centralized">Centralized Server</MenuItem>
                      </Select>
                   </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                   <FormControl fullWidth>
                      <InputLabel>Royalty Enforcement</InputLabel>
                      <Select value={dappAssets.nft.royaltyEnforcement} label="Royalty Enforcement" onChange={e => setDappAssets(p => ({...p, nft: {...p.nft, royaltyEnforcement: e.target.value}}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                         <MenuItem value="standard">EIP-2981 Standard</MenuItem>
                         <MenuItem value="marketplace">Marketplace Registry</MenuItem>
                         <MenuItem value="hard">Hard Enforcement</MenuItem>
                      </Select>
                   </FormControl>
                </Grid>
                <Grid xs={12}>
                   <Stack direction="row" spacing={3}>
                      <FormControlLabel control={<Switch checked={dappAssets.nft.soulbound} onChange={e => setDappAssets(p => ({...p, nft: {...p.nft, soulbound: e.target.checked}}))} />} label="Soulbound (Non-Transferable)" />
                      <FormControlLabel control={<Switch checked={dappAssets.nft.reveal} onChange={e => setDappAssets(p => ({...p, nft: {...p.nft, reveal: e.target.checked}}))} />} label="Delayed Reveal" />
                   </Stack>
                </Grid>
             </Grid>
          </SectionCard>
       )}
    </Stack>
  );

  const renderDappFees = () => (
    <Stack spacing={2}>
       {/* Platform Fees */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
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
            <Grid container spacing={2.5}>
               <Grid xs={12} md={6}>
                  <TextField label="Platform Fee %" type="number" fullWidth size="small" value={dappFees.platformFee} onChange={e => setDappFees(p => ({...p, platformFee: safeNum(e.target.value)}))} />
               </Grid>
               <Grid xs={12} md={6}>
                  <TextField label="Referral Reward %" type="number" fullWidth size="small" value={dappFees.referralFee} onChange={e => setDappFees(p => ({...p, referralFee: safeNum(e.target.value)}))} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Payout Logic */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
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
            <Grid container spacing={2.5}>
               <Grid xs={12} md={4}>
                  <TextField label="Min Payout Amount ($)" type="number" fullWidth size="small" value={dappFees.minPayout} onChange={e => setDappFees(p => ({...p, minPayout: safeNum(e.target.value)}))} />
               </Grid>
               <Grid xs={12} md={4}>
                  <FormControl fullWidth size="small">
                     <InputLabel>Schedule</InputLabel>
                     <Select value={dappFees.payoutSchedule} label="Schedule" onChange={e => setDappFees(p => ({...p, payoutSchedule: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
               <Grid xs={12} md={4}>
                  <FormControl fullWidth size="small">
                     <InputLabel>Chargeback Mode</InputLabel>
                     <Select value={dappFees.chargebackMode} label="Chargeback Mode" onChange={e => setDappFees(p => ({...p, chargebackMode: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="manual">Manual Review</MenuItem>
                        <MenuItem value="deduct">Auto-Deduct</MenuItem>
                        <MenuItem value="block">Block User</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Split Recipients */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MonetizationOnIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Split Recipients</Typography>
                <Typography variant="caption" color="text.secondary">{dappFees.splits.length} recipient{dappFees.splits.length !== 1 ? 's' : ''}</Typography>
              </Box>
              <Button startIcon={<AddIcon />} size="small" variant="outlined" onClick={() => setDappFees(p => ({...p, splits: [...p.splits, {label:'New', address:'', pct:0}]}))}
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
                 <TextField size="small" variant="standard" value={s.label} onChange={e => { const n = [...dappFees.splits]; n[i].label = e.target.value; setDappFees(p => ({...p, splits: n}))}} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem', fontWeight: 600 } }} />
                 <TextField size="small" variant="standard" value={s.address} placeholder="0x..." onChange={e => { const n = [...dappFees.splits]; n[i].address = e.target.value; setDappFees(p => ({...p, splits: n}))}} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem', fontFamily: 'monospace' } }} />
                 <TextField size="small" type="number" variant="standard" value={s.pct} onChange={e => { const n = [...dappFees.splits]; n[i].pct = safeNum(e.target.value); setDappFees(p => ({...p, splits: n}))}} InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }} />
                 <IconButton size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }} onClick={() => setDappFees(p => ({...p, splits: p.splits.filter((_, idx) => idx !== i)}))}>
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

  const renderDappPayments = () => (
    <Stack spacing={2}>
       {/* Fiat Payments */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#10b981', 0.03) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#10b981', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 15, color: '#10b981' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Fiat Payments</Typography>
                <Typography variant="caption" color="text.secondary">Provider, settlement time</Typography>
              </Box>
              <Switch size="small" checked={dappPayments.fiatEnabled} onChange={e => setDappPayments(p => ({...p, fiatEnabled: e.target.checked}))} sx={{ ml: 'auto' }} />
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
               <Grid xs={12} md={6}>
                  <FormControl fullWidth size="small" disabled={!dappPayments.fiatEnabled}>
                     <InputLabel>Provider</InputLabel>
                     <Select value={dappPayments.fiatProvider} label="Provider" onChange={e => setDappPayments(p => ({...p, fiatProvider: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="Stripe">Stripe</MenuItem>
                        <MenuItem value="Razorpay">Razorpay</MenuItem>
                        <MenuItem value="Paddle">Paddle</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
               <Grid xs={12} md={6}>
                  <TextField label="Settlement Time" fullWidth size="small" value={dappPayments.settlementTime} onChange={e => setDappPayments(p => ({...p, settlementTime: e.target.value}))} disabled={!dappPayments.fiatEnabled} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Crypto Payments */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#f59e0b', 0.03) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#f59e0b', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MonetizationOnIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Crypto Payments</Typography>
                <Typography variant="caption" color="text.secondary">Treasury wallet and accepted tokens</Typography>
              </Box>
              <Switch size="small" checked={dappPayments.cryptoEnabled} onChange={e => setDappPayments(p => ({...p, cryptoEnabled: e.target.checked}))} sx={{ ml: 'auto' }} />
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
               <Grid xs={12}>
                  <TextField label="Treasury Wallet Address" fullWidth size="small" value={dappPayments.treasury} onChange={e => setDappPayments(p => ({...p, treasury: e.target.value}))} disabled={!dappPayments.cryptoEnabled} />
               </Grid>
               <Grid xs={12}>
                  <Autocomplete multiple options={['USDC','ETH','USDT','DAI']} freeSolo value={dappPayments.cryptoTokens} onChange={(_, v) => setDappPayments(p => ({...p, cryptoTokens: v}))} renderInput={(p) => <TextField {...p} size="small" label="Accepted Tokens" />} disabled={!dappPayments.cryptoEnabled} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Checkout UX */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
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
            <Grid container spacing={2.5}>
               <Grid xs={12} md={4}>
                  <FormControl fullWidth size="small">
                     <InputLabel>Theme</InputLabel>
                     <Select value={dappPayments.checkoutTheme} label="Theme" onChange={e => setDappPayments(p => ({...p, checkoutTheme: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="auto">Auto</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
               <Grid xs={12} md={4}>
                  <TextField label="Success URL" fullWidth size="small" value={dappPayments.successUrl} onChange={e => setDappPayments(p => ({...p, successUrl: e.target.value}))} />
               </Grid>
               <Grid xs={12} md={4}>
                  <TextField label="Cancel URL" fullWidth size="small" value={dappPayments.cancelUrl} onChange={e => setDappPayments(p => ({...p, cancelUrl: e.target.value}))} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>
    </Stack>
  );

  const renderDappCompliance = () => (
    <Stack spacing={2}>
       {/* Identity Verification */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GavelIcon sx={{ fontSize: 15, color: '#8b5cf6' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Identity Verification</Typography>
                <Typography variant="caption" color="text.secondary">KYC provider and verification level</Typography>
              </Box>
              <Box sx={{ ml: 'auto', px: 1.25, py: 0.3, borderRadius: 1, bgcolor: alpha('#8b5cf6', 0.08), color: '#8b5cf6', fontSize: '0.62rem', fontWeight: 700 }}>
                {dappCompliance.kycLevel.toUpperCase()}
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
               <Grid xs={12} md={6}>
                  <FormControl fullWidth size="small">
                     <InputLabel>KYC Provider</InputLabel>
                     <Select value={dappCompliance.kycProvider} label="KYC Provider" onChange={e => setDappCompliance(p => ({...p, kycProvider: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="Sumsub">Sumsub</MenuItem>
                        <MenuItem value="Persona">Persona</MenuItem>
                        <MenuItem value="Parallel">Parallel Markets</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
               <Grid xs={12} md={6}>
                  <FormControl fullWidth size="small">
                     <InputLabel>Verification Level</InputLabel>
                     <Select value={dappCompliance.kycLevel} label="Verification Level" onChange={e => setDappCompliance(p => ({...p, kycLevel: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                        <MenuItem value="basic">Basic (ID Only)</MenuItem>
                        <MenuItem value="liveness">Liveness Check</MenuItem>
                        <MenuItem value="strict">Strict (Proof of Address)</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
               <Grid xs={12}>
                  <TextField label="Provider API Key" type="password" fullWidth size="small" value={dappCompliance.apiKey} onChange={e => setDappCompliance(p => ({...p, apiKey: e.target.value}))} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Geographic Restrictions */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#ef4444', 0.03) }}>
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
            <Grid container spacing={2.5}>
               <Grid xs={12}>
                  <Autocomplete
                     multiple
                     options={COUNTRIES}
                     getOptionLabel={(option) => option.label}
                     value={dappCompliance.geoBlock}
                     onChange={(_, val) => setDappCompliance(p => ({...p, geoBlock: val}))}
                     renderInput={(params) => <TextField {...params} size="small" label="Geo-Blocked Regions" placeholder="Select countries" />}
                  />
               </Grid>
               <Grid xs={12}>
                  <FormControlLabel control={<Switch size="small" checked={dappCompliance.gdprCompliant} onChange={e => setDappCompliance(p => ({...p, gdprCompliant: e.target.checked}))} />} label={<Typography variant="body2">Enforce GDPR Consent Flow</Typography>} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>

       {/* Legal Links */}
       <SectionCard>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.03) }}>
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
            <Grid container spacing={2.5}>
               <Grid xs={12} md={6}>
                  <TextField label="Terms of Service URL" fullWidth size="small" value={dappCompliance.termsUrl} onChange={e => setDappCompliance(p => ({...p, termsUrl: e.target.value}))} />
               </Grid>
               <Grid xs={12} md={6}>
                  <TextField label="Privacy Policy URL" fullWidth size="small" value={dappCompliance.privacyUrl} onChange={e => setDappCompliance(p => ({...p, privacyUrl: e.target.value}))} />
               </Grid>
            </Grid>
          </Box>
       </SectionCard>
    </Stack>
  );

  // --- CHAIN RENDERERS ---

  const renderChainTokenomics = () => {
    const total = chainToken.dist.validators + chainToken.dist.treasury + chainToken.dist.community;
    const isError = total !== 100;

    return (
      <Stack spacing={4}>
         <Box>
          <Stack direction="row" alignItems="center" spacing={2} mb={1}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PieChartIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={800}>Tokenomics Engine</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Configure supply, distribution, and vesting schedules.</Typography>
         </Box>

         {/* Set 1: Core Asset */}
         <SectionCard>
            <Typography variant="h6" fontWeight={800} mb={3}>1. Core Asset</Typography>
            <Stack direction="row" spacing={3}>
               <TextField label="Token Name" fullWidth value={chainToken.name} onChange={e => setChainToken(p => ({...p, name: e.target.value}))} />
               <TextField label="Symbol" value={chainToken.symbol} onChange={e => setChainToken(p => ({...p, symbol: e.target.value}))} />
               <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Supply Model</InputLabel>
                  <Select value={chainToken.model} label="Supply Model" onChange={e => setChainToken(p => ({...p, model: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                     <MenuItem value="inflationary">Inflationary</MenuItem>
                     <MenuItem value="deflationary">Deflationary</MenuItem>
                     <MenuItem value="fixed">Fixed</MenuItem>
                  </Select>
               </FormControl>
            </Stack>
         </SectionCard>

         {/* Set 2: Genesis Distribution */}
         <SectionCard>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
               <Typography variant="h6" fontWeight={800}>2. Genesis Distribution</Typography>
               {isError && <Chip icon={<WarningAmberIcon />} label={`Total: ${total}% (Must be 100%)`} color="error" variant="outlined" />}
            </Stack>
            
            <Stack spacing={4}>
               <Box>
                  <Typography variant="caption" gutterBottom>VALIDATORS ({chainToken.dist.validators}%)</Typography>
                  <Slider value={chainToken.dist.validators} onChange={(_, v) => setChainToken(p => ({...p, dist: {...p.dist, validators: v as number}}))} />
               </Box>
               <Box>
                  <Typography variant="caption" gutterBottom>TREASURY ({chainToken.dist.treasury}%)</Typography>
                  <Slider value={chainToken.dist.treasury} onChange={(_, v) => setChainToken(p => ({...p, dist: {...p.dist, treasury: v as number}}))} color="secondary" />
               </Box>
               <Box>
                  <Typography variant="caption" gutterBottom>COMMUNITY / AIRDROP ({chainToken.dist.community}%)</Typography>
                  <Slider value={chainToken.dist.community} onChange={(_, v) => setChainToken(p => ({...p, dist: {...p.dist, community: v as number}}))} sx={{ color: 'success.main' }} />
               </Box>
            </Stack>
         </SectionCard>

         {/* Set 3: Vesting Rules */}
         <SectionCard>
            <Typography variant="h6" fontWeight={800} mb={3}>3. Vesting & Inflation</Typography>
            <Grid container spacing={3}>
               <Grid xs={12} md={6}>
                  <TextField label="Cliff Period (Months)" type="number" fullWidth value={chainToken.vestingCliff} onChange={e => setChainToken(p => ({...p, vestingCliff: safeNum(e.target.value)}))} />
               </Grid>
               <Grid xs={12} md={6}>
                  <TextField label="Vesting Duration (Months)" type="number" fullWidth value={chainToken.vestingDuration} onChange={e => setChainToken(p => ({...p, vestingDuration: safeNum(e.target.value)}))} />
               </Grid>
               <Grid xs={12}>
                  <TextField label="Annual Inflation %" type="number" fullWidth value={chainToken.inflation} onChange={e => setChainToken(p => ({...p, inflation: safeNum(e.target.value)}))} helperText="New tokens minted annually for staking rewards" />
               </Grid>
            </Grid>
         </SectionCard>
      </Stack>
    );
  };

  const renderChainFees = () => (
    <Stack spacing={4}>
       <Box>
          <Stack direction="row" alignItems="center" spacing={2} mb={1}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShowChartIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={800}>Gas & Fees</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Configure transaction costs and burn mechanisms.</Typography>
       </Box>

       {/* Set 1: Gas Model */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>1. Gas Model</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={6}>
                <TextField label="Base Fee (Gwei)" type="number" fullWidth value={chainFees.baseFee} onChange={e => setChainFees(p => ({...p, baseFee: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={6}>
                <FormControlLabel control={<Switch checked={chainFees.dynamic} onChange={e => setChainFees(p => ({...p, dynamic: e.target.checked}))} />} label="Dynamic EIP-1559" />
             </Grid>
             <Grid xs={12} md={6}>
                <FormControlLabel control={<Switch checked={chainFees.priorityTip} onChange={e => setChainFees(p => ({...p, priorityTip: e.target.checked}))} />} label="Enable Priority Tips" />
             </Grid>
          </Grid>
       </SectionCard>

       {/* Set 2: Block Economics */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>2. Block Economics</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={4}>
                <TextField label="Block Gas Limit" type="number" fullWidth value={chainFees.blockGasLimit} onChange={e => setChainFees(p => ({...p, blockGasLimit: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Elasticity Multiplier" type="number" fullWidth value={chainFees.elasticity} onChange={e => setChainFees(p => ({...p, elasticity: safeNum(e.target.value)}))} helperText="Max gas price spike" />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Target Fullness %" type="number" fullWidth value={chainFees.targetBlockFullness} onChange={e => setChainFees(p => ({...p, targetBlockFullness: safeNum(e.target.value)}))} />
             </Grid>
          </Grid>
       </SectionCard>

       {/* Set 3: Fee Distribution */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>3. Fee Distribution</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={6}>
                <TextField label="Burn % (Deflationary)" type="number" fullWidth value={chainFees.burnPct} onChange={e => setChainFees(p => ({...p, burnPct: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={6}>
                <FormControl fullWidth>
                   <InputLabel>Remainder Recipient</InputLabel>
                   <Select value={chainFees.feeRecipient} label="Remainder Recipient" onChange={e => setChainFees(p => ({...p, feeRecipient: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                      <MenuItem value="validator">Block Proposer (Validator)</MenuItem>
                      <MenuItem value="treasury">Community Treasury</MenuItem>
                   </Select>
                </FormControl>
             </Grid>
          </Grid>
       </SectionCard>
    </Stack>
  );

  const renderChainStaking = () => (
    <Stack spacing={4}>
       <Box>
          <Stack direction="row" alignItems="center" spacing={2} mb={1}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: alpha('#8b5cf6', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VerifiedUserIcon sx={{ color: '#8b5cf6' }} />
            </Box>
            <Typography variant="h5" fontWeight={800}>Staking & Security</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Set validator requirements and slashing conditions.</Typography>
       </Box>

       {/* Set 1: Requirements */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>1. Validator Requirements</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={6}>
                <TextField label="Min Self-Stake" type="number" fullWidth value={chainStaking.minStake} onChange={e => setChainStaking(p => ({...p, minStake: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={6}>
                <TextField label="Max Validator Count" type="number" fullWidth value={chainStaking.maxValidators} onChange={e => setChainStaking(p => ({...p, maxValidators: safeNum(e.target.value)}))} />
             </Grid>
          </Grid>
       </SectionCard>

       {/* Set 2: Delegation */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>2. Delegation Rules</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={4}>
                <FormControlLabel control={<Switch checked={chainStaking.delegationEnabled} onChange={e => setChainStaking(p => ({...p, delegationEnabled: e.target.checked}))} />} label="Delegation Enabled" />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Min Delegation" type="number" fullWidth value={chainStaking.minDelegation} onChange={e => setChainStaking(p => ({...p, minDelegation: safeNum(e.target.value)}))} disabled={!chainStaking.delegationEnabled} />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Unbonding Period (Days)" type="number" fullWidth value={chainStaking.unbondTime} onChange={e => setChainStaking(p => ({...p, unbondTime: safeNum(e.target.value)}))} disabled={!chainStaking.delegationEnabled} />
             </Grid>
          </Grid>
       </SectionCard>

       {/* Set 3: Slashing */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>3. Slashing & Penalties</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={4}>
                <TextField label="Double Sign Slash %" type="number" fullWidth value={chainStaking.doubleSignSlash} onChange={e => setChainStaking(p => ({...p, doubleSignSlash: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Downtime Slash %" type="number" fullWidth value={chainStaking.downtimeSlash} onChange={e => setChainStaking(p => ({...p, downtimeSlash: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Jail Time (Hours)" type="number" fullWidth value={chainStaking.jailTime} onChange={e => setChainStaking(p => ({...p, jailTime: safeNum(e.target.value)}))} helperText="Ban duration" />
             </Grid>
          </Grid>
       </SectionCard>
    </Stack>
  );

  const renderChainGov = () => (
    <Stack spacing={4}>
       <Box>
          <Stack direction="row" alignItems="center" spacing={2} mb={1}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccountBalanceIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={800}>On-Chain Governance</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Set the rules for protocol upgrades and treasury spending.</Typography>
       </Box>

       {/* Set 1: Voting Config */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>1. Voting Config</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={6}>
                <FormControl fullWidth>
                   <InputLabel>Voting Model</InputLabel>
                   <Select value={chainGov.model} label="Voting Model" onChange={e => setChainGov(p => ({...p, model: e.target.value}))} MenuProps={OPAQUE_MENU_PROPS as any}>
                      <MenuItem value="token">Token Weighted</MenuItem>
                      <MenuItem value="quadratic">Quadratic Voting</MenuItem>
                      <MenuItem value="council">Council Multisig</MenuItem>
                   </Select>
                </FormControl>
             </Grid>
             <Grid xs={12} md={6}>
                <TextField label="Quorum Required %" type="number" fullWidth value={chainGov.quorum} onChange={e => setChainGov(p => ({...p, quorum: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={6}>
                <TextField label="Pass Threshold %" type="number" fullWidth value={chainGov.passThreshold} onChange={e => setChainGov(p => ({...p, passThreshold: safeNum(e.target.value)}))} />
             </Grid>
             <Grid xs={12} md={6}>
                <TextField label="Voting Period (Days)" type="number" fullWidth value={chainGov.votingPeriod} onChange={e => setChainGov(p => ({...p, votingPeriod: safeNum(e.target.value)}))} />
             </Grid>
          </Grid>
       </SectionCard>

       {/* Set 2: Proposal Safety */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>2. Proposal Safety</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={4}>
                <TextField label="Proposal Threshold (Tokens)" type="number" fullWidth value={chainGov.proposalThreshold} onChange={e => setChainGov(p => ({...p, proposalThreshold: safeNum(e.target.value)}))} helperText="Min tokens to propose" />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Timelock Delay (Hours)" type="number" fullWidth value={chainGov.timelockDelay} onChange={e => setChainGov(p => ({...p, timelockDelay: safeNum(e.target.value)}))} helperText="Execution delay" />
             </Grid>
             <Grid xs={12} md={4}>
                <TextField label="Cancel Threshold (Tokens)" type="number" fullWidth value={chainGov.cancelThreshold} onChange={e => setChainGov(p => ({...p, cancelThreshold: safeNum(e.target.value)}))} helperText="Tokens needed to force cancel" />
             </Grid>
          </Grid>
       </SectionCard>

       {/* Set 3: Emergency */}
       <SectionCard>
          <Typography variant="h6" fontWeight={800} mb={3}>3. Emergency Controls</Typography>
          <Grid container spacing={3}>
             <Grid xs={12} md={8}>
                <TextField label="Emergency DAO Address" fullWidth value={chainGov.emergencyDao} onChange={e => setChainGov(p => ({...p, emergencyDao: e.target.value}))} placeholder="0x..." helperText="Can pause chain in exploits" />
             </Grid>
             <Grid xs={12} md={4}>
                <FormControlLabel control={<Switch checked={chainGov.vetoEnabled} onChange={e => setChainGov(p => ({...p, vetoEnabled: e.target.checked}))} />} label="Enable Security Council Veto" />
             </Grid>
          </Grid>
       </SectionCard>
    </Stack>
  );

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Background dot grid */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(79,70,229,0.10) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Content sits above dot grid */}
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <StepGuidance
          stepKey="step3"
          title="Token Economics"
          subtitle="Step 4 of 6"
          description="Configure the economic model for your application: token supply, staking rules, governance parameters, and fee structures. These settings define how value flows through your system."
          steps={[
            { first: 'Set up your token', next: 'Configure name, symbol, total supply, and whether the token is mintable or has a burn mechanism.' },
            { first: 'Configure staking', next: 'Set APY rates, lock-up periods, and slashing conditions if your app involves validators or stakers.' },
            { first: 'Set governance rules', next: 'Define quorum percentages, voting periods, and proposal thresholds for on-chain governance.' },
          ]}
          tip="If you're not sure about exact numbers, use the suggested defaults. These can be adjusted before deployment via a governance proposal."
        />

        {/* Horizontal tab rail */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 3,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Box
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 2.5, py: 1, borderRadius: 1, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent'}`,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.825rem',
                  transition: 'all 0.15s',
                  '&:hover': {
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.05),
                    color: isActive ? 'primary.main' : 'text.primary',
                  },
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Box>
            );
          })}

          {/* Help button pushed to right */}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Help">
            <IconButton size="small" onClick={() => setIsHelpOpen(true)} sx={{ color: 'text.secondary' }}>
              <QuestionMarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tab content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 4, py: 3 }}>
          <Fade in={true} key={activeTab}>
            <Box>
              {activeTab === 'rev' && renderDappRevenue()}
              {activeTab === 'assets' && renderDappAssets()}
              {activeTab === 'fees' && projectType === 'dapp' && renderDappFees()}
              {activeTab === 'pay' && renderDappPayments()}
              {activeTab === 'comp' && renderDappCompliance()}

              {activeTab === 'tok' && renderChainTokenomics()}
              {activeTab === 'fees' && projectType === 'blockchain' && renderChainFees()}
              {activeTab === 'stk' && renderChainStaking()}
              {activeTab === 'gov' && renderChainGov()}
            </Box>
          </Fade>
        </Box>

        {/* Dock — flex footer, never overlaps content */}
        <Box sx={{
          flexShrink: 0, display: 'flex', justifyContent: 'center', py: 2,
          borderTop: `1px solid ${alpha('#4F46E5', 0.12)}`,
          bgcolor: 'background.paper',
        }}>
          <FloatingIsland elevation={6}>
            <Tooltip title="Back">
              <IconButton onClick={goPrev ? goPrev : () => router.back()} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
            <Button variant="contained" onClick={handleSave} endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 1, px: 3, fontWeight: 700 }}>
              Save & Continue
            </Button>
          </FloatingIsland>
        </Box>
      </Box>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1, bgcolor: 'background.paper', color: 'text.primary' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Typography variant="h6" fontWeight={800}>{helpContent.title}</Typography>
          <IconButton onClick={() => setIsHelpOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }} paragraph>
            {helpContent.text}
          </Typography>
        </DialogContent>
      </Dialog>

    </Box>
  );
}