'use client';

// apps/frontend/src/components/studio/steps/step3-shared.tsx
// The shapes and the pure rules of the Economics step.
// The step keeps one economics document in the drafts area of the Studio
// build state and derives the Governance section, the Economics section and
// the retention of every collection from it. Every rule that turns a choice
// into Blueprint content lives here, so a test reads it without a screen.
// Cerulea runs with no token. Validators settle in fiat through the
// subscription arrangement, and an end user meets no gas, no wallet and no
// fee. The document therefore carries fiat revenue alone.
// Without this module each panel would keep its own copy of the rules.

import { Paper, styled } from '@mui/material';
import { alpha } from '@mui/material/styles';

import type { Blueprint, Collection, Economics, Governance } from '@/lib/blueprint/types';

/* ------------------------------------------------------------------ */
/* Shared visual pieces                                                */
/* ------------------------------------------------------------------ */

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
      backgroundColor: (t: { palette: { mode: string } }) =>
        t.palette.mode === 'light' ? '#ffffff' : '#0D1535',
      border: '1px solid',
      borderColor: (t: { palette: { primary: { main: string } } }) =>
        alpha(t.palette.primary.main, 0.15),
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      borderRadius: 2,
    },
  },
};

/** Reads a number from a text field, falling back when the text holds none. */
export function safeNum(x: unknown, fallback = 0): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CN', label: 'China' },
  { code: 'RU', label: 'Russia' },
  { code: 'KP', label: 'North Korea' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'IN', label: 'India' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'AU', label: 'Australia' },
];

export type Country = (typeof COUNTRIES)[number];

/* ------------------------------------------------------------------ */
/* Fiat currencies                                                     */
/* ------------------------------------------------------------------ */

/** The fiat currencies a builder may price in. Each carries its minor unit scale. */
export const FIAT_CURRENCIES = [
  { code: 'USD', name: 'US dollar', symbol: '$', scale: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', scale: 2 },
  { code: 'GBP', name: 'Pound sterling', symbol: '£', scale: 2 },
  { code: 'INR', name: 'Indian rupee', symbol: '₹', scale: 2 },
  { code: 'AED', name: 'United Arab Emirates dirham', symbol: 'AED', scale: 2 },
  { code: 'SGD', name: 'Singapore dollar', symbol: 'S$', scale: 2 },
  { code: 'AUD', name: 'Australian dollar', symbol: 'A$', scale: 2 },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', scale: 0 },
] as const;

export type FiatCurrencyCode = (typeof FIAT_CURRENCIES)[number]['code'];

export function fiatCurrency(code: string) {
  return FIAT_CURRENCIES.find((entry) => entry.code === code) ?? FIAT_CURRENCIES[0];
}

/* ------------------------------------------------------------------ */
/* The economics document                                              */
/* ------------------------------------------------------------------ */

export type BillingModel = 'subscription' | 'usage' | 'hybrid' | 'one-time';

export type RevenueTier = { name: string; monthly: number; annual: number; limit: string };

/** What the builder charges its own customers, in fiat. */
export type Revenue = {
  /** True while the builder charges its own customers at all. */
  charges: boolean;
  billingModel: BillingModel;
  currency: FiatCurrencyCode;
  trialDays: number;
  meteredRate: number;
  meteredUnit: string;
  meteredCap: number;
  tiers: RevenueTier[];
  /** The Blueprint collection holding the paying accounts. Empty until chosen. */
  accountsCollection: string;
};

/** The payment providers the Integrations step connects for the payments kind. */
export const FIAT_PROVIDERS = ['Stripe', 'Razorpay', 'Paddle', 'PayPal', 'Lemon Squeezy'] as const;
export type FiatProvider = (typeof FIAT_PROVIDERS)[number];

export type Payments = {
  fiatEnabled: boolean;
  fiatProvider: FiatProvider;
  settlementTime: string;
  checkoutTheme: 'light' | 'dark' | 'auto';
  successUrl: string;
  cancelUrl: string;
};

export const IDENTITY_PROVIDERS = ['None', 'Sumsub', 'Persona', 'Parallel Markets'] as const;
export type IdentityProvider = (typeof IDENTITY_PROVIDERS)[number];
export type IdentityLevel = 'basic' | 'liveness' | 'strict';

/** How a private deployment admits a person. Every option works on a Cerulea account. */
export type AccessMode = 'invite' | 'allowlist' | 'credential';
export type ApprovalFlow = 'auto' | 'manual' | 'admin';

export type RetentionChoice = {
  /** The days a record stays before the expiry rule runs. */
  days: number;
  onExpiry: 'Delete' | 'Anonymise' | 'Archive';
};

export type Compliance = {
  identityProvider: IdentityProvider;
  identityLevel: IdentityLevel;
  accessMode: AccessMode;
  approvalFlow: ApprovalFlow;
  regionBlock: Country[];
  consentFlow: boolean;
  termsUrl: string;
  privacyUrl: string;
  /** The default retention every collection takes unless its own row says otherwise. */
  retention: RetentionChoice;
  /** Retention per collection, keyed by collection id. Absent rows take the default. */
  collectionRetention: Record<string, RetentionChoice>;
};

/** The five answers, in the words the solver reads. */
export type PolicyAnswers = Partial<
  Record<'confirmation' | 'operators' | 'errorCost' | 'split' | 'retention', string>
>;

export type GovernanceChoice = {
  answers: PolicyAnswers;
  chosenProfileId: string;
  /** The role ids whose agreement a change needs. */
  authority: string[];
  /** The blocks a constitutional change waits before it takes effect. */
  constitutionalDelayBlocks: number;
  /** Government: the organisations that agree to a structural change. */
  organisations: string[];
  /** Government: the jurisdiction storage and processing stay inside. */
  jurisdiction: string;
};

export type EconomicsDocument = {
  version: 2;
  track: 'dapp' | 'blockchain';
  revenue: Revenue;
  payments: Payments;
  compliance: Compliance;
  governance: GovernanceChoice;
  /** The profile the person chose, kept so the step reopens with its consequences. */
  chosenProfile: SolverProfile | null;
};

/** One profile the solver answers with. */
export type SolverProfile = {
  profileId: string;
  point: {
    validatorCount: number;
    toleratedFailures: number;
    routinePercent: number;
    constitutionalPercent: number;
    partitionChoice: 'HaltToStayConsistent' | 'KeepServing';
    partitionChoiceStated?: boolean;
  };
  routineFinalityBlocks: number;
  constitutionalFinalityBlocks: number;
  retentionBlocks: number;
  consequences: string[];
};

/** The class thresholds the architecture fixes. A profile raises them and never lowers them. */
export const CLASS_THRESHOLDS = {
  routine: 51,
  financial: 67,
  structural: 80,
  constitutional: 90,
} as const;

/** The four classes in plain words, shown beside the thresholds. */
export const CLASS_LINES: { key: keyof typeof CLASS_THRESHOLDS; title: string; covers: string }[] = [
  { key: 'routine', title: 'Routine', covers: 'Scans, readings and log entries.' },
  { key: 'financial', title: 'Financial', covers: 'Transfers, settlements and payments.' },
  { key: 'structural', title: 'Structural', covers: 'Schema, permission and validator changes.' },
  {
    key: 'constitutional',
    title: 'Constitutional',
    covers: 'Policy amendments and upgrade authority. A mandatory delay follows the vote.',
  },
];

/** The blocks one day holds at the block time given. */
export function blocksPerDay(blockSeconds: number): number {
  const seconds = blockSeconds > 0 ? blockSeconds : 3;
  return Math.max(1, Math.round(86400 / seconds));
}

/** The Government retention default, thirty years in days. */
export const GOVERNMENT_RETENTION_DAYS = 30 * 365;

/** The commercial retention default, seven years in days. */
export const COMMERCIAL_RETENTION_DAYS = 7 * 365;

export function emptyRevenue(): Revenue {
  return {
    charges: false,
    billingModel: 'subscription',
    currency: 'USD',
    trialDays: 14,
    meteredRate: 0.05,
    meteredUnit: 'request',
    meteredCap: 0,
    tiers: [
      { name: 'Starter', monthly: 0, annual: 0, limit: '1k requests a month' },
      { name: 'Pro', monthly: 29, annual: 290, limit: '100k requests a month' },
    ],
    accountsCollection: '',
  };
}

export function emptyPayments(): Payments {
  return {
    fiatEnabled: false,
    fiatProvider: 'Stripe',
    settlementTime: 'T+2',
    checkoutTheme: 'auto',
    successUrl: '',
    cancelUrl: '',
  };
}

export function emptyCompliance(application: 'dapps' | 'enterprise' | 'government'): Compliance {
  return {
    identityProvider: 'None',
    identityLevel: 'basic',
    accessMode: 'invite',
    approvalFlow: 'manual',
    regionBlock: [],
    consentFlow: true,
    termsUrl: '',
    privacyUrl: '',
    retention: {
      days: application === 'government' ? GOVERNMENT_RETENTION_DAYS : COMMERCIAL_RETENTION_DAYS,
      onExpiry: 'Archive',
    },
    collectionRetention: {},
  };
}

export function emptyGovernance(blockSeconds: number): GovernanceChoice {
  return {
    answers: {},
    chosenProfileId: '',
    authority: [],
    constitutionalDelayBlocks: blocksPerDay(blockSeconds),
    organisations: [],
    jurisdiction: '',
  };
}

export function emptyEconomics(input: {
  track: 'dapp' | 'blockchain';
  application: 'dapps' | 'enterprise' | 'government';
  blockSeconds: number;
}): EconomicsDocument {
  return {
    version: 2,
    track: input.track,
    revenue: emptyRevenue(),
    payments: emptyPayments(),
    compliance: emptyCompliance(input.application),
    governance: emptyGovernance(input.blockSeconds),
    chosenProfile: null,
  };
}

/* ------------------------------------------------------------------ */
/* Reading a held draft                                                */
/* ------------------------------------------------------------------ */

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function whole(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function tiers(value: unknown, fallback: RevenueTier[]): RevenueTier[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((entry) => {
    const held = record(entry);
    return {
      name: text(held.name, 'Tier'),
      monthly: whole(held.monthly, 0),
      annual: whole(held.annual, 0),
      limit: text(held.limit, ''),
    };
  });
}

function countries(value: unknown): Country[] {
  if (!Array.isArray(value)) return [];
  const found: Country[] = [];
  for (const entry of value) {
    const code = typeof entry === 'string' ? entry : text(record(entry).code, '');
    const match = COUNTRIES.find((country) => country.code === code);
    if (match && !found.includes(match)) found.push(match);
  }
  return found;
}

function retentionChoice(value: unknown, fallback: RetentionChoice): RetentionChoice {
  const held = record(value);
  return {
    days: Math.max(1, Math.min(36500, Math.round(whole(held.days, fallback.days)))),
    onExpiry: oneOf(held.onExpiry, ['Delete', 'Anonymise', 'Archive'] as const, fallback.onExpiry),
  };
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function profile(value: unknown): SolverProfile | null {
  const held = record(value);
  const point = record(held.point);
  if (typeof held.profileId !== 'string' || typeof point.validatorCount !== 'number') return null;
  return {
    profileId: held.profileId,
    point: {
      validatorCount: whole(point.validatorCount, 4),
      toleratedFailures: whole(point.toleratedFailures, 1),
      routinePercent: whole(point.routinePercent, CLASS_THRESHOLDS.routine),
      constitutionalPercent: whole(point.constitutionalPercent, CLASS_THRESHOLDS.constitutional),
      partitionChoice: oneOf(
        point.partitionChoice,
        ['HaltToStayConsistent', 'KeepServing'] as const,
        'HaltToStayConsistent',
      ),
      partitionChoiceStated: flag(point.partitionChoiceStated, true),
    },
    routineFinalityBlocks: whole(held.routineFinalityBlocks, 1),
    constitutionalFinalityBlocks: whole(held.constitutionalFinalityBlocks, 1),
    retentionBlocks: whole(held.retentionBlocks, 0),
    consequences: strings(held.consequences),
  };
}

/**
 * Reads the economics draft a project holds.
 * The current draft carries version 2. A production draft carried the token,
 * gas, staking and wallet panels beside fiat revenue, payments and compliance;
 * the fiat parts are read and the rest is left behind under the no token rule.
 */
export function readEconomicsDocument(
  held: unknown,
  base: EconomicsDocument,
): EconomicsDocument {
  const draft = record(held);
  if (Object.keys(draft).length === 0) return base;
  if (draft.version === 2) {
    const revenue = record(draft.revenue);
    const payments = record(draft.payments);
    const compliance = record(draft.compliance);
    const governance = record(draft.governance);
    const answers = record(governance.answers);
    const collectionRetention: Record<string, RetentionChoice> = {};
    for (const [key, value] of Object.entries(record(compliance.collectionRetention))) {
      collectionRetention[key] = retentionChoice(value, base.compliance.retention);
    }
    return {
      version: 2,
      track: oneOf(draft.track, ['dapp', 'blockchain'] as const, base.track),
      revenue: {
        charges: flag(revenue.charges, base.revenue.charges),
        billingModel: oneOf(
          revenue.billingModel,
          ['subscription', 'usage', 'hybrid', 'one-time'] as const,
          base.revenue.billingModel,
        ),
        currency: fiatCurrency(text(revenue.currency, base.revenue.currency)).code,
        trialDays: whole(revenue.trialDays, base.revenue.trialDays),
        meteredRate: whole(revenue.meteredRate, base.revenue.meteredRate),
        meteredUnit: text(revenue.meteredUnit, base.revenue.meteredUnit),
        meteredCap: whole(revenue.meteredCap, base.revenue.meteredCap),
        tiers: tiers(revenue.tiers, base.revenue.tiers),
        accountsCollection: text(revenue.accountsCollection, ''),
      },
      payments: {
        fiatEnabled: flag(payments.fiatEnabled, base.payments.fiatEnabled),
        fiatProvider: oneOf(payments.fiatProvider, FIAT_PROVIDERS, base.payments.fiatProvider),
        settlementTime: text(payments.settlementTime, base.payments.settlementTime),
        checkoutTheme: oneOf(
          payments.checkoutTheme,
          ['light', 'dark', 'auto'] as const,
          base.payments.checkoutTheme,
        ),
        successUrl: text(payments.successUrl, ''),
        cancelUrl: text(payments.cancelUrl, ''),
      },
      compliance: {
        identityProvider: oneOf(
          compliance.identityProvider,
          IDENTITY_PROVIDERS,
          base.compliance.identityProvider,
        ),
        identityLevel: oneOf(
          compliance.identityLevel,
          ['basic', 'liveness', 'strict'] as const,
          base.compliance.identityLevel,
        ),
        accessMode: oneOf(
          compliance.accessMode,
          ['invite', 'allowlist', 'credential'] as const,
          base.compliance.accessMode,
        ),
        approvalFlow: oneOf(
          compliance.approvalFlow,
          ['auto', 'manual', 'admin'] as const,
          base.compliance.approvalFlow,
        ),
        regionBlock: countries(compliance.regionBlock),
        consentFlow: flag(compliance.consentFlow, base.compliance.consentFlow),
        termsUrl: text(compliance.termsUrl, ''),
        privacyUrl: text(compliance.privacyUrl, ''),
        retention: retentionChoice(compliance.retention, base.compliance.retention),
        collectionRetention,
      },
      governance: {
        answers: {
          confirmation: typeof answers.confirmation === 'string' ? answers.confirmation : undefined,
          operators: typeof answers.operators === 'string' ? answers.operators : undefined,
          errorCost: typeof answers.errorCost === 'string' ? answers.errorCost : undefined,
          split: typeof answers.split === 'string' ? answers.split : undefined,
          retention: typeof answers.retention === 'string' ? answers.retention : undefined,
        },
        chosenProfileId: text(governance.chosenProfileId, ''),
        authority: strings(governance.authority),
        constitutionalDelayBlocks: Math.max(
          1,
          Math.round(whole(governance.constitutionalDelayBlocks, base.governance.constitutionalDelayBlocks)),
        ),
        organisations: strings(governance.organisations),
        jurisdiction: text(governance.jurisdiction, ''),
      },
      chosenProfile: profile(draft.chosenProfile),
    };
  }

  // A production draft. The fiat parts carry over and the token parts stay behind.
  const dapp = record(draft.dapp);
  const revenue = record(dapp.revenue);
  const payments = record(dapp.payments);
  const compliance = record(dapp.compliance);
  const governance = record(draft.governance);
  const currency = text(revenue.currency, 'USD');
  const fiat = FIAT_CURRENCIES.some((entry) => entry.code === currency) ? currency : 'USD';
  const timelockHours = whole(governance.timelockDelayHours, 0);
  return {
    ...base,
    revenue: {
      ...base.revenue,
      charges: Object.keys(revenue).length > 0,
      billingModel: oneOf(
        revenue.billingModel,
        ['subscription', 'usage', 'hybrid', 'one-time'] as const,
        base.revenue.billingModel,
      ),
      currency: fiatCurrency(fiat).code,
      trialDays: whole(revenue.trialDays, base.revenue.trialDays),
      meteredRate: whole(revenue.meteredRate, base.revenue.meteredRate),
      meteredUnit: text(revenue.meteredUnit, base.revenue.meteredUnit),
      meteredCap: whole(revenue.meteredCap, base.revenue.meteredCap),
      tiers: tiers(revenue.tiers, base.revenue.tiers),
    },
    payments: {
      ...base.payments,
      fiatEnabled: flag(payments.fiatEnabled, base.payments.fiatEnabled),
      fiatProvider: oneOf(payments.fiatProvider, FIAT_PROVIDERS, base.payments.fiatProvider),
      settlementTime: text(payments.settlementTime, base.payments.settlementTime),
      checkoutTheme: oneOf(
        payments.checkoutTheme,
        ['light', 'dark', 'auto'] as const,
        base.payments.checkoutTheme,
      ),
      successUrl: text(payments.successUrl, ''),
      cancelUrl: text(payments.cancelUrl, ''),
    },
    compliance: {
      ...base.compliance,
      identityProvider: oneOf(
        compliance.kycProvider === 'Parallel' ? 'Parallel Markets' : compliance.kycProvider,
        IDENTITY_PROVIDERS,
        base.compliance.identityProvider,
      ),
      identityLevel: oneOf(
        compliance.kycLevel,
        ['basic', 'liveness', 'strict'] as const,
        base.compliance.identityLevel,
      ),
      regionBlock: countries(compliance.geoBlock),
      consentFlow: flag(compliance.gdprCompliant, base.compliance.consentFlow),
      termsUrl: text(compliance.termsUrl, ''),
      privacyUrl: text(compliance.privacyUrl, ''),
    },
    governance: {
      ...base.governance,
      constitutionalDelayBlocks:
        timelockHours > 0
          ? Math.max(1, Math.round((timelockHours * 3600) / 3))
          : base.governance.constitutionalDelayBlocks,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Writing the Blueprint                                               */
/* ------------------------------------------------------------------ */

/** The thresholds a profile sets. A class never drops under the figure the architecture fixes. */
export function quorumFor(profile: SolverProfile | null): Governance['quorum'] {
  const routine = Math.max(CLASS_THRESHOLDS.routine, profile?.point.routinePercent ?? 0);
  const constitutional = Math.max(
    CLASS_THRESHOLDS.constitutional,
    profile?.point.constitutionalPercent ?? 0,
  );
  return {
    routine: Math.min(100, Math.round(routine)),
    financial: Math.min(100, Math.round(Math.max(CLASS_THRESHOLDS.financial, routine))),
    structural: Math.min(100, Math.round(Math.max(CLASS_THRESHOLDS.structural, routine))),
    constitutional: Math.min(100, Math.round(constitutional)),
  };
}

/** The change process sentence the Governance section carries. */
export function changeProcessFor(input: {
  choice: GovernanceChoice;
  roleNames: string[];
  blockSeconds: number;
  government: boolean;
}): string {
  const roles = input.roleNames.length > 0 ? input.roleNames.join(', ') : 'the owner role';
  const delayHours = Math.round((input.choice.constitutionalDelayBlocks * input.blockSeconds) / 3600);
  const lines = [
    `A proposal passes once ${roles} agree at the threshold of its class.`,
    `A constitutional change waits ${delayHours > 0 ? `${delayHours} hours` : 'one block'} after the vote before it takes effect.`,
  ];
  if (input.government) {
    const organisations =
      input.choice.organisations.length > 0
        ? input.choice.organisations.join(', ')
        : 'the named organisations';
    lines.push(`Every structural change requires agreement across ${organisations}.`);
  }
  return lines.join(' ').slice(0, 800);
}

/** The Economics section, present only while the builder charges in fiat. */
export function economicsSectionFor(revenue: Revenue, collections: Collection[]): Economics {
  if (!revenue.charges) return null;
  const held = collections.find((collection) => collection.id === revenue.accountsCollection);
  if (!held) return null;
  const currency = fiatCurrency(revenue.currency);
  return {
    unit_of_account: { name: currency.name, symbol: currency.code, scale: currency.scale },
    issuance: { kind: 'External', initial_supply: '0' },
    accounts_collection: held.id,
  };
}

/** The retention one collection takes from the compliance choices. */
export function retentionFor(compliance: Compliance, collectionId: string): RetentionChoice {
  return compliance.collectionRetention[collectionId] ?? compliance.retention;
}

/**
 * Applies the economics document to a Blueprint.
 * The Governance section takes the thresholds of the chosen profile, the
 * authority roles, the delay and the change process. The Economics section
 * appears while the builder charges in fiat and names the accounts collection.
 * Every collection takes the retention the compliance tab set for it.
 */
export function applyEconomicsToBlueprint(
  blueprint: Blueprint,
  document: EconomicsDocument,
  input: { blockSeconds: number; government: boolean },
): Blueprint {
  const roles = blueprint.identities.roles;
  const roleIds = new Set(roles.map((role) => role.id));
  const authority = document.governance.authority.filter((id) => roleIds.has(id));
  const heldAuthority =
    authority.length > 0
      ? authority
      : blueprint.governance.authority.filter((id) => roleIds.has(id));
  const finalAuthority =
    heldAuthority.length > 0 ? heldAuthority : roles.length > 0 ? [roles[0].id] : ['owner'];
  const roleNames = finalAuthority.map(
    (id) => roles.find((role) => role.id === id)?.name ?? id,
  );
  const governance: Governance = {
    authority: finalAuthority,
    quorum: quorumFor(document.chosenProfile),
    constitutional_delay_blocks: Math.max(1, Math.round(document.governance.constitutionalDelayBlocks)),
    change_process: changeProcessFor({
      choice: document.governance,
      roleNames,
      blockSeconds: input.blockSeconds,
      government: input.government,
    }),
  };
  const collections = blueprint.collections.map((collection) => {
    const retention = retentionFor(document.compliance, collection.id);
    return {
      ...collection,
      retention: { period_days: retention.days, on_expiry: retention.onExpiry },
    };
  });
  return {
    ...blueprint,
    collections,
    governance,
    economics: economicsSectionFor(document.revenue, blueprint.collections),
  };
}

/** States the finality of one profile in the words a person reads. */
export function describeFinality(profile: SolverProfile, blockSeconds: number): string {
  const routine = profile.routineFinalityBlocks * blockSeconds;
  const constitutional = profile.constitutionalFinalityBlocks * blockSeconds;
  return `Everyday work becomes irreversible in about ${routine} seconds. A change to the rules waits about ${constitutional} seconds on top of its delay.`;
}

/** The solver answers the build state carries, so the readiness checklist and the manifest read them. */
export function buildStateAnswers(answers: PolicyAnswers): {
  confirmationPreference?: 'instant' | 'balanced' | 'certain';
  organisationCount?: number;
  wrongRecordCost?: 'low' | 'moderate' | 'high' | 'severe';
  serveDuringSplit?: boolean;
  provableYears?: number;
} {
  return {
    ...(answers.confirmation
      ? { confirmationPreference: answers.confirmation === 'MaximumCertainty' ? 'certain' : 'instant' }
      : {}),
    ...(answers.operators
      ? {
          organisationCount:
            answers.operators === 'SingleOrganisation'
              ? 1
              : answers.operators === 'ManyOrganisations'
                ? 50
                : 10,
        }
      : {}),
    ...(answers.errorCost
      ? {
          wrongRecordCost:
            answers.errorCost === 'Recoverable'
              ? 'low'
              : answers.errorCost === 'Irreversible'
                ? 'severe'
                : 'high',
        }
      : {}),
    ...(answers.split ? { serveDuringSplit: answers.split === 'KeepServing' } : {}),
    ...(answers.retention
      ? {
          provableYears:
            answers.retention === 'RecentOnly' ? 1 : answers.retention === 'SeveralYears' ? 3 : 100,
        }
      : {}),
  };
}

/** Turns held build state answers back into the solver words, for a project saved by an earlier Studio. */
export function answersFromBuildState(policies: {
  answers: {
    confirmationPreference?: 'instant' | 'balanced' | 'certain';
    organisationCount?: number;
    wrongRecordCost?: 'low' | 'moderate' | 'high' | 'severe';
    serveDuringSplit?: boolean;
    provableYears?: number;
  };
}): PolicyAnswers {
  const held: PolicyAnswers = {};
  const answers = policies.answers;
  if (answers.confirmationPreference === 'instant') held.confirmation = 'InstantConfirmation';
  if (answers.confirmationPreference === 'certain') held.confirmation = 'MaximumCertainty';
  if (answers.organisationCount !== undefined) {
    held.operators =
      answers.organisationCount <= 1
        ? 'SingleOrganisation'
        : answers.organisationCount <= 10
          ? 'SeveralOrganisations'
          : 'ManyOrganisations';
  }
  if (answers.wrongRecordCost === 'low') held.errorCost = 'Recoverable';
  if (answers.wrongRecordCost === 'moderate' || answers.wrongRecordCost === 'high') {
    held.errorCost = 'Expensive';
  }
  if (answers.wrongRecordCost === 'severe') held.errorCost = 'Irreversible';
  if (answers.serveDuringSplit !== undefined) {
    held.split = answers.serveDuringSplit ? 'KeepServing' : 'HaltToStayConsistent';
  }
  if (answers.provableYears !== undefined) {
    held.retention =
      answers.provableYears <= 1 ? 'RecentOnly' : answers.provableYears <= 5 ? 'SeveralYears' : 'Permanent';
  }
  return held;
}

/** True once all five questions carry an answer. */
export function answersComplete(answers: PolicyAnswers): boolean {
  return ['confirmation', 'operators', 'errorCost', 'split', 'retention'].every(
    (key) => typeof answers[key as keyof PolicyAnswers] === 'string',
  );
}

/** The accounts collection a fresh revenue tab proposes: one named for accounts, else the first. */
export function proposeAccountsCollection(collections: Collection[]): string {
  const named = collections.find((collection) =>
    /account|customer|subscri|member|tenant|organisation|user/i.test(collection.id),
  );
  return (named ?? collections[0])?.id ?? '';
}
