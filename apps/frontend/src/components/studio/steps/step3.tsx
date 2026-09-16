'use client';

import React, { useEffect, useMemo, useState } from "react";
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Box, Button, Divider, IconButton, Paper, Typography, Tooltip, Fade,
  Dialog, DialogTitle, DialogContent,
} from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import { useRouter, useSearchParams } from "next/navigation";

// Icons
import ArrowBackIcon from "@mui/icons-material/KeyboardArrowLeft";
import ArrowForwardIcon from "@mui/icons-material/KeyboardArrowRight";
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

// Panel components
import DappRevenuePanel from './step3-DappRevenue';
import DappAssetsPanel from './step3-DappAssets';
import DappFeesPanel from './step3-DappFees';
import DappPaymentsPanel from './step3-DappPayments';
import DappCompliancePanel from './step3-DappCompliance';
import ChainTokenomicsPanel from './step3-ChainTokenomics';
import ChainFeesPanel from './step3-ChainFees';
import ChainStakingPanel from './step3-ChainStaking';
import ChainGovPanel from './step3-ChainGov';

// Shared types
import {
  DappRevenue, DappAssets, DappFees, DappPayments, DappCompliance,
  ChainToken, ChainFees, ChainStaking, ChainGov,
} from './step3-shared';

/* ------------------------------------------------------------------ */
/* Styled components                                                   */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function Step3({ goPrev, goNext, projectId }: { goPrev?: () => void; goNext?: () => void; projectId: string | null }) {
  const theme = useTheme();
  const router = useRouter();
  const sp = useSearchParams();

  const [resolvedId, setResolvedId] = useState<string | null>(projectId);
  useEffect(() => {
    if (!resolvedId) {
      const ls = typeof window !== 'undefined' ? localStorage.getItem('cerulea.activeProjectId') : null;
      setResolvedId(sp?.get('projectId') || ls);
    }
  }, [projectId, sp, resolvedId]);

  const [projectType, setProjectType] = useState<"dapp" | "blockchain">("dapp");
  const [dappVisibility, setDappVisibility] = useState<"public" | "private">("public");
  const [legacyMode, setLegacyMode] = useState<"none" | "existing">("none");
  const [activeTab, setActiveTab] = useState("rev");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // dApp state
  const [dappRevenue, setDappRevenue] = useState<DappRevenue>({
    modes: [], currency: 'USD',
    billingModel: "hybrid", trialDays: 14,
    meteredRate: 0.05, meteredUnit: 'request', meteredCap: 0,
    tiers: [
      { name: 'Starter', monthly: 0, annual: 0, limit: '1k req/mo' },
      { name: 'Pro', monthly: 29, annual: 290, limit: '100k req/mo' }
    ]
  });
  const [dappAssets, setDappAssets] = useState<DappAssets>({
    erc20: { name: "Governance Token", symbol: "GOV", supply: 10000000, mintable: true, burnable: true, blacklist: false },
    nft: { name: "Membership Pass", symbol: "PASS", supply: 5000, price: 0.1, metadataStorage: "ipfs", soulbound: false, royaltyEnforcement: "standard", reveal: false }
  });
  const [dappFees, setDappFees] = useState<DappFees>({
    platformFee: 2.5, referralFee: 1.0,
    minPayout: 50, payoutSchedule: 'weekly', chargebackMode: 'manual',
    splits: [{ label: 'Treasury', address: '', pct: 90 }, { label: 'Dev Fund', address: '', pct: 10 }]
  });
  const [dappPayments, setDappPayments] = useState<DappPayments>({
    fiatEnabled: true, cryptoEnabled: true,
    fiatProvider: 'Stripe', cryptoTokens: ['USDC', 'ETH'],
    treasury: '', settlementTime: 'T+2',
    checkoutTheme: 'dark', successUrl: '', cancelUrl: ''
  });
  const [dappCompliance, setDappCompliance] = useState<DappCompliance>({
    kycProvider: 'Sumsub', kycLevel: 'basic',
    geoBlock: [], gdprCompliant: true,
    apiKey: '', termsUrl: '', privacyUrl: ''
  });

  // Chain state
  const [chainToken, setChainToken] = useState<ChainToken>({
    name: "Network Token", symbol: "NET", supply: 100000000,
    dist: { validators: 40, treasury: 30, community: 30 },
    inflation: 5, vestingCliff: 12, vestingDuration: 48,
    model: 'inflationary'
  });
  const [chainFees, setChainFees] = useState<ChainFees>({
    baseFee: 10, dynamic: true, burnPct: 50, priorityTip: true,
    blockGasLimit: 30000000, elasticity: 2, targetBlockFullness: 50,
    feeRecipient: 'validator'
  });
  const [chainStaking, setChainStaking] = useState<ChainStaking>({
    minStake: 3200, unbondTime: 21, slashing: true,
    jailTime: 24, maxValidators: 100,
    delegationEnabled: true, minDelegation: 1, rewardsCycle: 24,
    doubleSignSlash: 5, downtimeSlash: 0.1
  });
  const [chainGov, setChainGov] = useState<ChainGov>({
    model: 'token', quorum: 4, passThreshold: 66,
    votingPeriod: 5, emergencyDao: '', vetoEnabled: true,
    timelockDelay: 48, proposalThreshold: 10000, cancelThreshold: 50000
  });

  const [hasErc20, setHasErc20] = useState(false);
  const [hasNft, setHasNft] = useState(false);

  useEffect(() => {
    const lsType = typeof window !== 'undefined' ? localStorage.getItem('cerulea.projectType') : null;
    if (lsType) setProjectType(lsType as any);
    const lsVis = typeof window !== 'undefined' ? localStorage.getItem('cerulea.dappVisibility') : null;
    if (lsVis) setDappVisibility(lsVis as any);
    const lsLegacy = typeof window !== 'undefined' ? localStorage.getItem('cerulea.legacyMode') : null;
    if (lsLegacy === 'existing') setLegacyMode('existing');

    const econRaw = typeof window !== 'undefined' ? localStorage.getItem('cerulea.economics') : null;
    if (econRaw) {
      try {
        const econ = JSON.parse(econRaw);
        // Permissioned / no-native-token networks (e.g. an internal audit ledger):
        // no cryptocurrency, no gas. Honoured by the tokenomics + fees panels.
        if (econ.nativeToken === false || econ.tokenomics?.enabled === false) {
          setChainToken((prev) => ({ ...prev, nativeToken: false }));
        }
        if (econ.gasPolicy?.gasless === true) {
          setChainFees((prev) => ({ ...prev, gasless: true, baseFee: 0, dynamic: false, burnPct: 0 }));
        }
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
      } catch { /* ignore */ }
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
    }
    return [
      { key: 'tok', label: 'Tokenomics', icon: <PieChartIcon fontSize="small" /> },
      { key: 'fees', label: 'Gas Policy', icon: <ShowChartIcon fontSize="small" /> },
      { key: 'stk', label: 'Staking', icon: <VerifiedUserIcon fontSize="small" /> },
      { key: 'gov', label: 'Governance', icon: <AccountBalanceIcon fontSize="small" /> },
    ];
  }, [projectType, hasErc20, hasNft]);

  useEffect(() => {
    if (!tabs.find(t => t.key === activeTab)) setActiveTab(tabs[0]?.key || 'rev');
  }, [tabs, activeTab]);

  const helpContent = useMemo(() => {
    if (projectType === 'dapp') {
      const map: Record<string, { title: string; text: string }> = {
        rev: { title: 'dApp Monetization', text: 'Configure how you make money. Set up recurring subscriptions, metered usage (API calls), or one-time license fees.' },
        pay: { title: 'Payment Gateways', text: 'Connect real-world payment rails. Fiat requires a provider like Stripe. Crypto requires a wallet address for settlements.' },
        assets: { title: 'Token Configuration', text: 'Define the properties of your digital assets. Mintable tokens allow supply growth. Soulbound NFTs are permanently locked to a wallet.' },
        fees: { title: 'Revenue Splits', text: 'Automate your cash flow. Platform fees are deducted from every transaction. Splits route funds to team/treasury wallets instantly.' },
        comp: { title: 'Legal & Compliance', text: 'Manage regulatory requirements. Geo-blocking prevents access from sanctioned regions. KYC ensures user identity verification.' },
      };
      return map[activeTab] ?? { title: 'Economics', text: 'Configure the financial engine.' };
    }
    const map: Record<string, { title: string; text: string }> = {
      tok: { title: 'Network Tokenomics', text: 'The lifeblood of your chain. Inflation incentivizes security. Vesting locks tokens for early backers. Distribution balances power.' },
      fees: { title: 'Gas & Fees', text: 'Control the cost of blockspace. EIP-1559 burns base fees to counter inflation. Elasticity manages congestion spikes.' },
      stk: { title: 'PoS Staking', text: 'Security parameters. Bonding locks capital to prevent attacks. Slashing punishes bad behavior. Jailing removes offline nodes.' },
      gov: { title: 'On-Chain Governance', text: 'Decentralized decision making. Timelocks prevent flash attacks. Emergency DAOs provide a safety halt switch.' },
    };
    return map[activeTab] ?? { title: 'Economics', text: 'Configure the financial engine.' };
  }, [projectType, activeTab]);

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(79,70,229,0.10) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

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

        {/* Tab rail */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 3, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0, overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Box key={tab.key} onClick={() => setActiveTab(tab.key)} sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2.5, py: 1, borderRadius: 1, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                color: isActive ? 'primary.main' : 'text.secondary',
                border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent'}`,
                fontWeight: isActive ? 700 : 500, fontSize: '0.825rem',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: isActive ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.05), color: isActive ? 'primary.main' : 'text.primary' },
              }}>
                {tab.icon}
                <span>{tab.label}</span>
              </Box>
            );
          })}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Help">
            <IconButton size="small" onClick={() => setIsHelpOpen(true)} sx={{ color: 'text.secondary' }}>
              <QuestionMarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tab content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 4, py: 3 }}>
          <Fade in key={activeTab}>
            <Box>
              {activeTab === 'rev' && <DappRevenuePanel dappRevenue={dappRevenue} setDappRevenue={setDappRevenue} dappVisibility={dappVisibility} />}
              {activeTab === 'assets' && <DappAssetsPanel dappAssets={dappAssets} setDappAssets={setDappAssets} hasErc20={hasErc20} hasNft={hasNft} />}
              {activeTab === 'fees' && projectType === 'dapp' && <DappFeesPanel dappFees={dappFees} setDappFees={setDappFees} />}
              {activeTab === 'pay' && <DappPaymentsPanel dappPayments={dappPayments} setDappPayments={setDappPayments} />}
              {activeTab === 'comp' && <DappCompliancePanel dappCompliance={dappCompliance} setDappCompliance={setDappCompliance} dappVisibility={dappVisibility} />}
              {activeTab === 'tok' && (chainToken.nativeToken === false ? (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: alpha('#10b981', 0.4), bgcolor: alpha('#10b981', 0.05) }}>
                  <Typography variant="subtitle1" fontWeight={800}>Permissioned network — no native token</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    This chain runs without a cryptocurrency: no token, no gas, no external wallets. Participants receive
                    deterministic wallet addresses used only to sign their actions, and validator consensus replaces token economics.
                  </Typography>
                  <Button size="small" sx={{ mt: 2, textTransform: 'none' }} onClick={() => setChainToken((p) => ({ ...p, nativeToken: true }))}>
                    Enable a native token instead
                  </Button>
                </Paper>
              ) : (
                <Box>
                  {projectType === 'blockchain' && (
                    <Button size="small" sx={{ mb: 1.5, textTransform: 'none' }} onClick={() => setChainToken((p) => ({ ...p, nativeToken: false }))}>
                      Switch to a permissioned network (no native token)
                    </Button>
                  )}
                  <ChainTokenomicsPanel chainToken={chainToken} setChainToken={setChainToken} legacyMode={legacyMode} />
                </Box>
              ))}
              {activeTab === 'fees' && projectType === 'blockchain' && (
                <Box>
                  {chainFees.gasless && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, borderColor: alpha('#10b981', 0.4), bgcolor: alpha('#10b981', 0.05) }}>
                      <Typography variant="body2" fontWeight={700}>Gasless network</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Transactions carry no fee and users never pay gas. The values below are inert for a permissioned chain.
                      </Typography>
                    </Paper>
                  )}
                  <ChainFeesPanel chainFees={chainFees} setChainFees={setChainFees} />
                </Box>
              )}
              {activeTab === 'stk' && <ChainStakingPanel chainStaking={chainStaking} setChainStaking={setChainStaking} />}
              {activeTab === 'gov' && <ChainGovPanel chainGov={chainGov} setChainGov={setChainGov} />}
            </Box>
          </Fade>
        </Box>

        {/* Dock */}
        <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', py: 2, borderTop: `1px solid ${alpha('#4F46E5', 0.12)}`, bgcolor: 'background.paper' }}>
          <FloatingIsland elevation={6}>
            <Tooltip title="Back">
              <IconButton onClick={goPrev || (() => router.back())} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
            <Button variant="contained" onClick={() => goNext && goNext()} endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 1, px: 3, fontWeight: 700 }}>
              Save & Continue
            </Button>
          </FloatingIsland>
        </Box>
      </Box>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Typography variant="h6" fontWeight={800}>{helpContent.title}</Typography>
          <IconButton onClick={() => setIsHelpOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" fontWeight={500} paragraph>{helpContent.text}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
