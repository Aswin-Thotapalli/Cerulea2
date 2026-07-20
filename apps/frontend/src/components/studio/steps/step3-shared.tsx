'use client';

import { Paper, styled } from "@mui/material";
import { alpha } from "@mui/material/styles";

export const SectionCard = styled(Paper)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  marginBottom: theme.spacing(2),
  overflow: 'visible',
}));

export const OPAQUE_MENU_PROPS = {
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

export function safeNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export const COUNTRIES = [
  { code: 'US', label: 'United States' }, { code: 'CN', label: 'China' },
  { code: 'RU', label: 'Russia' }, { code: 'KP', label: 'North Korea' },
  { code: 'GB', label: 'United Kingdom' }, { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' }, { code: 'FR', label: 'France' },
];

/* ------------------------------------------------------------------ */
/* State shape types                                                   */
/* ------------------------------------------------------------------ */
export type DappRevenue = {
  modes: string[];
  currency: string;
  billingModel: string;
  trialDays: number;
  meteredRate: number;
  meteredUnit: string;
  meteredCap: number;
  tiers: Array<{ name: string; monthly: number; annual: number; limit: string }>;
};

export type DappAssets = {
  erc20: { name: string; symbol: string; supply: number; mintable: boolean; burnable: boolean; blacklist: boolean };
  nft: { name: string; symbol: string; supply: number; price: number; metadataStorage: string; soulbound: boolean; royaltyEnforcement: string; reveal: boolean };
};

export type DappFees = {
  platformFee: number;
  referralFee: number;
  minPayout: number;
  payoutSchedule: string;
  chargebackMode: string;
  splits: Array<{ label: string; address: string; pct: number }>;
};

export type DappPayments = {
  fiatEnabled: boolean;
  cryptoEnabled: boolean;
  fiatProvider: string;
  cryptoTokens: string[];
  treasury: string;
  settlementTime: string;
  checkoutTheme: string;
  successUrl: string;
  cancelUrl: string;
};

export type DappCompliance = {
  kycProvider: string;
  kycLevel: string;
  geoBlock: any[];
  gdprCompliant: boolean;
  apiKey: string;
  termsUrl: string;
  privacyUrl: string;
};

export type ChainToken = {
  name: string;
  symbol: string;
  supply: number;
  dist: { validators: number; treasury: number; community: number };
  inflation: number;
  vestingCliff: number;
  vestingDuration: number;
  model: string;
};

export type ChainFees = {
  baseFee: number;
  dynamic: boolean;
  burnPct: number;
  priorityTip: boolean;
  blockGasLimit: number;
  elasticity: number;
  targetBlockFullness: number;
  feeRecipient: string;
};

export type ChainStaking = {
  minStake: number;
  unbondTime: number;
  slashing: boolean;
  jailTime: number;
  maxValidators: number;
  delegationEnabled: boolean;
  minDelegation: number;
  rewardsCycle: number;
  doubleSignSlash: number;
  downtimeSlash: number;
};

export type ChainGov = {
  model: string;
  quorum: number;
  passThreshold: number;
  votingPeriod: number;
  emergencyDao: string;
  vetoEnabled: boolean;
  timelockDelay: number;
  proposalThreshold: number;
  cancelThreshold: number;
};
