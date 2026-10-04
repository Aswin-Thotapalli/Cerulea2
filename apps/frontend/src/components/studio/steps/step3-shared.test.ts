// apps/frontend/src/components/studio/steps/step3-shared.test.ts
// The rules of the Economics step, read without a screen.

import { describe, expect, it } from 'vitest';

import type { Blueprint, Collection } from '@/lib/blueprint/types';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import {
  CLASS_THRESHOLDS,
  type SolverProfile,
  answersComplete,
  answersFromBuildState,
  applyEconomicsToBlueprint,
  buildStateAnswers,
  changeProcessFor,
  describeFinality,
  economicsSectionFor,
  emptyEconomics,
  proposeAccountsCollection,
  quorumFor,
  readEconomicsDocument,
} from './step3-shared';

function collection(id: string): Collection {
  return {
    id,
    record_type: `${id}_record`,
    primary_key: 'id',
    indexes: [],
    privacy: 'Open',
    retention: { period_days: 365, on_expiry: 'Delete' },
    purpose: { statement: 'Holds records.', lawful_basis: 'Contract' },
    description: '',
  };
}

function blueprint(): Blueprint {
  return readBlueprintDocument(
    {
      name: 'Land registry',
      collections: [collection('parcel'), collection('customer_account')],
      identities: {
        units: [],
        roles: [
          { id: 'owner', name: 'Owner', credentials: [] },
          { id: 'registrar', name: 'Registrar', credentials: [] },
        ],
        credentials: [],
        delegations: [],
      },
      governance: {
        authority: ['owner'],
        quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 },
        constitutional_delay_blocks: 28800,
        change_process: 'The owner agrees.',
      },
    },
    'Land registry',
  );
}

const profile: SolverProfile = {
  profileId: 'v7-r60-c95-halt',
  point: {
    validatorCount: 7,
    toleratedFailures: 2,
    routinePercent: 60,
    constitutionalPercent: 95,
    partitionChoice: 'HaltToStayConsistent',
    partitionChoiceStated: true,
  },
  routineFinalityBlocks: 2,
  constitutionalFinalityBlocks: 4,
  retentionBlocks: 1000,
  consequences: ['Seven validators tolerate two failing at once.'],
};

describe('the class thresholds', () => {
  it('never drop under the figures the architecture fixes', () => {
    expect(quorumFor(null)).toEqual({ routine: 51, financial: 67, structural: 80, constitutional: 90 });
    const low: SolverProfile = {
      ...profile,
      point: { ...profile.point, routinePercent: 40, constitutionalPercent: 70 },
    };
    expect(quorumFor(low)).toEqual(CLASS_THRESHOLDS);
  });

  it('rise with the chosen profile and carry routine up through the classes', () => {
    expect(quorumFor(profile)).toEqual({ routine: 60, financial: 67, structural: 80, constitutional: 95 });
    const strict: SolverProfile = {
      ...profile,
      point: { ...profile.point, routinePercent: 85, constitutionalPercent: 90 },
    };
    expect(quorumFor(strict)).toEqual({ routine: 85, financial: 85, structural: 85, constitutional: 90 });
  });
});

describe('the Economics section', () => {
  it('is absent while the builder charges nobody', () => {
    const document = emptyEconomics({ track: 'dapp', application: 'dapps', blockSeconds: 3 });
    expect(economicsSectionFor(document.revenue, blueprint().collections)).toBeNull();
  });

  it('names the fiat unit of account and the accounts collection while the builder charges', () => {
    const document = emptyEconomics({ track: 'dapp', application: 'dapps', blockSeconds: 3 });
    document.revenue.charges = true;
    document.revenue.currency = 'INR';
    document.revenue.accountsCollection = 'customer_account';
    expect(economicsSectionFor(document.revenue, blueprint().collections)).toEqual({
      unit_of_account: { name: 'Indian rupee', symbol: 'INR', scale: 2 },
      issuance: { kind: 'External', initial_supply: '0' },
      accounts_collection: 'customer_account',
    });
  });

  it('stays absent while the named collection is missing', () => {
    const document = emptyEconomics({ track: 'dapp', application: 'dapps', blockSeconds: 3 });
    document.revenue.charges = true;
    document.revenue.accountsCollection = 'absent';
    expect(economicsSectionFor(document.revenue, blueprint().collections)).toBeNull();
  });

  it('proposes the collection named for accounts', () => {
    expect(proposeAccountsCollection(blueprint().collections)).toBe('customer_account');
    expect(proposeAccountsCollection([collection('parcel')])).toBe('parcel');
    expect(proposeAccountsCollection([])).toBe('');
  });
});

describe('applying the document to a Blueprint', () => {
  it('writes the thresholds, the authority, the delay, the change process, the retention and the economics', () => {
    const document = emptyEconomics({ track: 'blockchain', application: 'enterprise', blockSeconds: 3 });
    document.chosenProfile = profile;
    document.governance.chosenProfileId = profile.profileId;
    document.governance.authority = ['registrar', 'absent_role'];
    document.governance.constitutionalDelayBlocks = 1200;
    document.compliance.retention = { days: 3650, onExpiry: 'Archive' };
    document.compliance.collectionRetention = { parcel: { days: 36500, onExpiry: 'Anonymise' } };
    document.revenue.charges = true;
    document.revenue.accountsCollection = 'customer_account';

    const next = applyEconomicsToBlueprint(blueprint(), document, { blockSeconds: 3, government: false });

    expect(next.governance.quorum).toEqual({ routine: 60, financial: 67, structural: 80, constitutional: 95 });
    expect(next.governance.authority).toEqual(['registrar']);
    expect(next.governance.constitutional_delay_blocks).toBe(1200);
    expect(next.governance.change_process).toContain('Registrar agree');
    expect(next.governance.change_process).toContain('waits 1 hours');
    expect(next.collections.find((entry) => entry.id === 'parcel')?.retention).toEqual({
      period_days: 36500,
      on_expiry: 'Anonymise',
    });
    expect(next.collections.find((entry) => entry.id === 'customer_account')?.retention).toEqual({
      period_days: 3650,
      on_expiry: 'Archive',
    });
    expect(next.economics?.accounts_collection).toBe('customer_account');
    // The other sections stay untouched.
    expect(next.identities).toEqual(blueprint().identities);
    expect(next.types).toEqual([]);
  });

  it('keeps the authority the Blueprint holds when the document names no role, and the first role when neither does', () => {
    const document = emptyEconomics({ track: 'dapp', application: 'dapps', blockSeconds: 3 });
    expect(applyEconomicsToBlueprint(blueprint(), document, { blockSeconds: 3, government: false }).governance.authority).toEqual(['owner']);
    const bare = blueprint();
    bare.governance.authority = [];
    bare.identities.roles = [{ id: 'clerk', name: 'Clerk', credentials: [] }];
    expect(applyEconomicsToBlueprint(bare, document, { blockSeconds: 3, government: false }).governance.authority).toEqual(['clerk']);
  });

  it('names the organisations of a Government deployment in the change process', () => {
    const document = emptyEconomics({ track: 'blockchain', application: 'government', blockSeconds: 3 });
    document.governance.organisations = ['Court Service', 'Evidence Office'];
    const next = applyEconomicsToBlueprint(blueprint(), document, { blockSeconds: 3, government: true });
    expect(next.governance.change_process).toContain('across Court Service, Evidence Office');
    expect(next.collections[0].retention.period_days).toBe(30 * 365);
  });

  it('keeps the change process inside the length the Blueprint accepts', () => {
    const sentence = changeProcessFor({
      choice: {
        ...emptyEconomics({ track: 'dapp', application: 'dapps', blockSeconds: 3 }).governance,
        organisations: Array.from({ length: 60 }, (_, i) => `Organisation number ${i} with a long name`),
      },
      roleNames: ['Owner'],
      blockSeconds: 3,
      government: true,
    });
    expect(sentence.length).toBeLessThanOrEqual(800);
  });
});

describe('reading a held draft', () => {
  const base = emptyEconomics({ track: 'dapp', application: 'dapps', blockSeconds: 3 });

  it('answers the base when nothing is held', () => {
    expect(readEconomicsDocument(null, base)).toEqual(base);
    expect(readEconomicsDocument({}, base)).toEqual(base);
  });

  it('reads a version two document back as it was written', () => {
    const written = emptyEconomics({ track: 'blockchain', application: 'government', blockSeconds: 6 });
    written.revenue.charges = true;
    written.revenue.currency = 'EUR';
    written.revenue.tiers = [{ name: 'Seat', monthly: 12, annual: 120, limit: 'one person' }];
    written.compliance.regionBlock = [{ code: 'KP', label: 'North Korea' }];
    written.compliance.collectionRetention = { parcel: { days: 100, onExpiry: 'Delete' } };
    written.governance.answers = {
      confirmation: 'MaximumCertainty',
      operators: 'ManyOrganisations',
      errorCost: 'Irreversible',
      split: 'HaltToStayConsistent',
      retention: 'Permanent',
    };
    written.governance.organisations = ['Court Service'];
    written.chosenProfile = profile;
    expect(readEconomicsDocument(JSON.parse(JSON.stringify(written)), base)).toEqual(written);
  });

  it('reads the fiat parts of a production draft and leaves the token parts behind', () => {
    const production = {
      track: 'dapp',
      dapp: {
        revenue: { modes: [], currency: 'ETH', billingModel: 'usage', trialDays: 7, meteredRate: 1, meteredUnit: 'call', meteredCap: 10, tiers: [] },
        assets: { erc20: { name: 'Governance Token' } },
        fees: { platformFee: 2.5, splits: [{ label: 'Treasury', address: '0xabc', pct: 90 }] },
        payments: { fiatEnabled: true, cryptoEnabled: true, fiatProvider: 'Razorpay', cryptoTokens: ['USDC'], treasury: '0xabc', settlementTime: 'T+3', checkoutTheme: 'dark', successUrl: 'https://a', cancelUrl: '' },
        compliance: { kycProvider: 'Parallel', kycLevel: 'strict', geoBlock: [{ code: 'RU', label: 'Russia' }], gdprCompliant: false, apiKey: 'secret', termsUrl: 'https://t', privacyUrl: '' },
      },
      governance: { model: 'token-weighted-voting', timelockDelayHours: 48 },
    };
    const read = readEconomicsDocument(production, base);
    expect(read.revenue.currency).toBe('USD');
    expect(read.revenue.billingModel).toBe('usage');
    expect(read.revenue.trialDays).toBe(7);
    expect(read.payments.fiatProvider).toBe('Razorpay');
    expect(read.payments.settlementTime).toBe('T+3');
    expect(read.compliance.identityProvider).toBe('Parallel Markets');
    expect(read.compliance.identityLevel).toBe('strict');
    expect(read.compliance.regionBlock.map((entry) => entry.code)).toEqual(['RU']);
    expect(read.compliance.consentFlow).toBe(false);
    expect(read.governance.constitutionalDelayBlocks).toBe(57600);
    expect(JSON.stringify(read)).not.toContain('0xabc');
    expect(JSON.stringify(read)).not.toContain('secret');
    expect(JSON.stringify(read)).not.toContain('Governance Token');
  });
});

describe('the five answers', () => {
  it('round trip through the build state form', () => {
    const answers = {
      confirmation: 'InstantConfirmation',
      operators: 'SeveralOrganisations',
      errorCost: 'Expensive',
      split: 'KeepServing',
      retention: 'SeveralYears',
    };
    expect(answersFromBuildState({ answers: buildStateAnswers(answers) })).toEqual(answers);
    expect(buildStateAnswers({})).toEqual({});
    expect(answersComplete(answers)).toBe(true);
    expect(answersComplete({ confirmation: 'InstantConfirmation' })).toBe(false);
  });

  it('states finality in seconds at the block time', () => {
    expect(describeFinality(profile, 3)).toBe(
      'Everyday work becomes irreversible in about 6 seconds. A change to the rules waits about 12 seconds on top of its delay.',
    );
  });
});
