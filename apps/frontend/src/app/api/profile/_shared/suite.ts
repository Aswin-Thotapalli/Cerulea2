// apps/frontend/src/app/api/profile/_shared/suite.ts
// A fake Cerulea APIs for the account route tests.
// Each test tells the fake how to answer one call. The fake records every
// call, so a test checks the path, the method, the body and the token a
// handler sent. Without this module every route test would spell the same stub.
import { vi } from 'vitest';

export const APIS_BASE = 'http://cerulea-apis.test';

export type RecordedCall = {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
};

type Answer = { method: string; path: string; status: number; body: unknown; unreachable: boolean };

export type FakeApis = {
  calls: RecordedCall[];
  answer: (method: string, path: string, body: unknown, status?: number) => void;
  unreachable: (method: string, path: string) => void;
  sent: (method: string, path: string) => RecordedCall | undefined;
};

/** The failure body Cerulea APIs answers. */
export function refusal(code: string, message: string, fix: string) {
  return { error: { code, message, fix, details: { field: 'suite' } } };
}

/** Stubs fetch with a fake Cerulea APIs and returns its controls. */
export function fakeApis(): FakeApis {
  const calls: RecordedCall[] = [];
  const answers: Answer[] = [];
  process.env.CERULEA_API_URL = APIS_BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const path = `${url.pathname}${url.search}`;
      const method = init.method ?? 'GET';
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({
        method,
        path,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
        authorization: headers.authorization ?? null,
      });
      const match = answers.find((entry) => entry.method === method && entry.path === path);
      if (!match) {
        return Response.json(
          refusal('suite.unanswered', `The suite holds no answer for ${method} ${path}.`, 'Add one.'),
          { status: 404 },
        );
      }
      if (match.unreachable) throw new TypeError('fetch failed');
      return Response.json(match.body, { status: match.status });
    }),
  );
  return {
    calls,
    answer: (method, path, body, status = 200) =>
      answers.push({ method, path, status, body, unreachable: false }),
    unreachable: (method, path) =>
      answers.push({ method, path, status: 0, body: null, unreachable: true }),
    sent: (method, path) => calls.find((call) => call.method === method && call.path === path),
  };
}

/** The account every suite signs in as. */
export const SUITE_ACTOR = {
  accountId: 'act_settings_suite',
  email: 'settings@cerulea.test',
  displayName: 'Dana Mehta',
  accessToken: 'tok_settings_suite',
};

export const suiteAccount = {
  accountId: SUITE_ACTOR.accountId,
  email: SUITE_ACTOR.email,
  displayName: SUITE_ACTOR.displayName,
  state: 'active',
  multiFactorActive: true,
  lastSignInAt: '2026-10-03T07:00:00.000Z',
  createdAt: '2026-01-04T09:00:00.000Z',
};

export const suiteProfile = {
  user: {
    id: SUITE_ACTOR.accountId,
    email: SUITE_ACTOR.email,
    name: SUITE_ACTOR.displayName,
    createdAt: '2026-01-04T09:00:00.000Z',
  },
  profile: { displayName: null, avatarUrl: null, company: 'Port authority', role: 'Registrar' },
};

export const suiteWorkspaces = [
  {
    workspaceId: 'wsp_registry',
    name: 'Registry office',
    slug: 'registry-office',
    application: 'government',
    tier: 'govt_standard',
    state: 'active',
    ownerAccountId: SUITE_ACTOR.accountId,
    role: 'owner',
    createdAt: '2026-01-04T09:00:00.000Z',
  },
  {
    workspaceId: 'wsp_shop',
    name: 'Shop chain',
    slug: 'shop-chain',
    application: 'dapps',
    tier: 'private_dapps',
    state: 'active',
    ownerAccountId: SUITE_ACTOR.accountId,
    role: 'owner',
    createdAt: '2026-02-04T09:00:00.000Z',
  },
];

/** An access answer holding one plan on the Dapps division. */
export const suiteAccess = {
  accountId: SUITE_ACTOR.accountId,
  operator: false,
  subscriptions: { dapp: 'private_dapps', enterprise: null, govt: null },
  divisions: [
    {
      division: 'dapp',
      application: 'dapps',
      segment: 'dapps',
      access: true,
      operator: false,
      tierId: 'private_dapps',
      tierName: null,
      billing: 'recurring',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2026-11-02T06:58:06.172Z',
      workspaceId: 'wsp_shop',
      subscriptionId: 'sub_shop',
      pricingPath: '/pricing?division=dapp',
    },
    {
      division: 'enterprise',
      application: 'enterprise',
      segment: 'enterprise',
      access: false,
      operator: false,
      tierId: null,
      tierName: null,
      billing: null,
      status: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      workspaceId: null,
      subscriptionId: null,
      pricingPath: '/pricing?division=enterprise',
    },
    {
      division: 'govt',
      application: 'government',
      segment: 'govt',
      access: false,
      operator: false,
      tierId: null,
      tierName: null,
      billing: null,
      status: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      workspaceId: null,
      subscriptionId: null,
      pricingPath: '/pricing?division=govt',
    },
  ],
};

export const suiteEntitlement = {
  division: 'dapp',
  features: ['contract_export'],
  limits: { validators: 3, seats: 2, projects: 3, storageGB: 15, txPerMonth: 50000, apiKeys: 1 },
};

export const suiteCatalogue = {
  currency: 'usd',
  complianceSentence: 'Controls implemented, certification not held.',
  divisions: [
    {
      division: 'dapp',
      application: 'dapps',
      tiers: [
        {
          id: 'private_dapps',
          name: 'Private Dapps',
          blurb: 'A sovereign private chain for one team.',
          specs: [
            { label: 'Validators', value: '3' },
            { label: 'Transactions / month', value: '50,000' },
          ],
        },
      ],
    },
  ],
};

export const suiteSessions = [
  {
    sessionId: 'ses_laptop',
    device: 'Cerulea Studio',
    networkAddress: '10.0.0.4',
    issuedAt: '2026-10-03T06:00:00.000Z',
    expiresAt: '2026-10-03T06:15:00.000Z',
    rotationCount: 0,
    current: true,
  },
  {
    sessionId: 'ses_phone',
    device: 'Phone browser',
    networkAddress: '10.0.0.9',
    issuedAt: '2026-10-02T06:00:00.000Z',
    expiresAt: '2026-10-02T06:15:00.000Z',
    rotationCount: 1,
    current: false,
  },
];

/** Answers every call the plan read sends for the Dapps division. */
export function answerPlan(apis: FakeApis): void {
  apis.answer('GET', '/studio/access', suiteAccess);
  apis.answer('GET', '/studio/entitlements?division=dapp', suiteEntitlement);
  apis.answer('GET', '/studio/catalogue?division=dapp', suiteCatalogue);
}
