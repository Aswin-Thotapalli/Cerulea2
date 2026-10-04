// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The operator route handlers, one branch at a time.
 *
 * Each test signs the operator in or out, answers the Cerulea APIs calls the
 * handler sends, and reads the status and the body the handler returns. The
 * fake Cerulea APIs records every call, so each test also checks the address
 * and the access token the handler sent.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
    get: () => undefined,
  }),
  headers: () => new Headers({ host: 'control.localhost:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? {
          cerulea: {
            accountId: 'act_operator_suite',
            email: 'operator@cerulea.test',
            displayName: 'Opal Rao',
            accessToken: 'tok_operator_suite',
          },
        }
      : null,
}));

import * as audit from './audit/route';
import * as chain from './chain/route';
import * as projects from './projects/route';
import * as stats from './stats/route';
import * as surface from './[surface]/route';
import * as users from './users/route';

const BASE = 'http://cerulea-apis.test';

type Call = { method: string; path: string; authorization: string | null };
type Answer = { path: string; status: number; body: unknown; unreachable: boolean };

let calls: Call[] = [];
let answers: Answer[] = [];

/** Tells the fake Cerulea APIs how to answer one read. */
function answer(path: string, body: unknown, status = 200): void {
  answers.push({ path, status, body, unreachable: false });
}

function refusal(code: string, message: string, fix: string) {
  return { error: { code, message, fix, details: { field: 'suite' } } };
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'operator-route-suite';
  process.env.CERULEA_API_URL = BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const path = `${url.pathname}${url.search}`;
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({ method: init.method ?? 'GET', path, authorization: headers.authorization ?? null });
      const match = answers.find((entry) => entry.path === path);
      if (!match) {
        return Response.json(
          refusal('suite.unanswered', `The suite holds no answer for ${path}.`, 'Add one.'),
          { status: 404 },
        );
      }
      if (match.unreachable) throw new TypeError('fetch failed');
      return Response.json(match.body, { status: match.status });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const platform = {
  mode: 'local',
  chainName: 'Cerulea local',
  chainKind: 'local',
  head: 300,
  finalizedBlock: 298,
  activeValidators: 3,
  totalValidators: 4,
  consensusHealth: 'Healthy',
  healthy: true,
  issues: [],
  drivers: [
    { integration: 'objects', kind: 'local', ready: true, detail: 'directory open' },
    { integration: 'mail', kind: 'local', ready: false, detail: 'outbox folder missing' },
  ],
  readAt: '2026-10-04T06:00:00.000Z',
};

const counts = {
  accounts: 4,
  accountsWithSecondFactor: 3,
  openSessions: 2,
  workspaces: 3,
  projects: 3,
  blueprintVersions: 9,
  checkpoints: 5,
  deployments: 1,
  openKeys: 2,
  openSubscriptions: 1,
  auditEvents: 40,
  refusedActions: 6,
};

const workspaces = [
  { workspaceId: 'wsp_d', name: 'Dapps', application: 'dapps', tier: 'plan_starter', state: 'active', members: 1, projects: 2, createdAt: '2026-01-01T00:00:00.000Z' },
  { workspaceId: 'wsp_e', name: 'Enterprise', application: 'enterprise', tier: 'free', state: 'active', members: 1, projects: 1, createdAt: '2026-01-02T00:00:00.000Z' },
];

const projectRows = [
  { projectId: 'prj_a', workspaceId: 'wsp_d', workspaceName: 'Dapps', name: 'Ledger', state: 'deployed', headVersion: 3, deployments: 1, createdAt: '2026-01-03T00:00:00.000Z', updatedAt: '2026-01-04T00:00:00.000Z' },
  { projectId: 'prj_b', workspaceId: 'wsp_d', workspaceName: 'Dapps', name: 'Voting', state: 'building', headVersion: 1, deployments: 0, createdAt: '2026-01-05T00:00:00.000Z', updatedAt: '2026-01-06T00:00:00.000Z' },
  { projectId: 'prj_c', workspaceId: 'wsp_e', workspaceName: 'Enterprise', name: 'Registry', state: 'draft', headVersion: 1, deployments: 0, createdAt: '2026-01-07T00:00:00.000Z', updatedAt: '2026-01-08T00:00:00.000Z', ownerEmail: 'owner@cerulea.test', ownerName: 'Omar' },
];

const accountRows = [
  { accountId: 'act_1', email: 'demo@cerulea.local', displayName: 'Demo', state: 'active', multiFactorActive: true, openSessions: 1, workspaces: 3, lastSignInAt: '2026-10-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' },
  { accountId: 'act_2', email: 'second@cerulea.local', displayName: '', state: 'active', multiFactorActive: false, openSessions: 0, workspaces: 0, lastSignInAt: null, createdAt: '2026-02-01T00:00:00.000Z' },
];

const securityRead = {
  events: [
    { eventId: 'e1', action: 'account.signed_in', subjectType: 'account', outcome: 'allowed', networkAddress: '127.0.0.1', accountEmail: 'demo@cerulea.local', occurredAt: '2026-10-04T05:00:00.000Z' },
    { eventId: 'e2', action: 'workspaces.capability_refused', subjectType: 'workspace', outcome: 'denied', networkAddress: '', accountEmail: '', occurredAt: '2026-10-04T04:00:00.000Z' },
    { eventId: 'e3', action: 'account.registered', subjectType: 'account', outcome: 'allowed', networkAddress: '10.0.0.2', accountEmail: 'second@cerulea.local', occurredAt: '2026-10-04T03:00:00.000Z' },
  ],
  sessions: [
    { sessionId: 's1', accountId: 'act_1', device: 'Cerulea Studio', networkAddress: '127.0.0.1', issuedAt: '2026-10-04T05:00:00.000Z', expiresAt: '2026-10-04T06:00:00.000Z', revokedAt: null, rotationCount: 2 },
  ],
};

function request(path: string): Request {
  return new Request(`http://control.localhost:3011${path}`);
}

describe('GET /api/admin/stats', () => {
  it('reads the summary, the projects and the workspaces and names the production figures', async () => {
    answer('/studio/administration/summary', { platform, counts });
    answer('/studio/administration/projects', { projects: projectRows });
    answer('/studio/administration/workspaces', { workspaces });
    const response = await stats.GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(calls.map((call) => call.path).sort()).toEqual([
      '/studio/administration/projects',
      '/studio/administration/summary',
      '/studio/administration/workspaces',
    ]);
    expect(calls.every((call) => call.authorization === 'Bearer tok_operator_suite')).toBe(true);
    expect(body.totalUsers).toBe(4);
    expect(body.totalProjects).toBe(3);
    expect(body.activeSubscriptions).toBe(1);
    expect(body.dappProjects).toBe(2);
    expect(body.blockchainProjects).toBe(1);
    expect(body.totalSnapshots).toBe(5);
    expect(body.mode).toBe('local');
    expect(body.refusedActions).toBe(6);
    expect(body.openItems).toEqual([
      { id: 'driver-mail', source: 'driver', message: 'mail driver (local): outbox folder missing' },
    ]);
    expect('totalAiThreads' in body).toBe(false);
  });

  it('carries the thread count only once the summary counts it', async () => {
    answer('/studio/administration/summary', {
      platform: { ...platform, issues: ['finality lag above 10 blocks'] },
      counts: { ...counts, intelligenceThreads: 12 },
    });
    answer('/studio/administration/projects', { projects: [] });
    answer('/studio/administration/workspaces', { workspaces: [] });
    const body = await (await stats.GET()).json();
    expect(body.totalAiThreads).toBe(12);
    expect(body.openItems[0]).toEqual({
      id: 'chain-0',
      source: 'chain',
      message: 'Cerulea local: finality lag above 10 blocks',
    });
  });

  it('returns the Cerulea refusal unchanged for an account without the operator role', async () => {
    answer(
      '/studio/administration/summary',
      refusal('operator.role_absent', 'The administration screens open for the Cerulea operator role.', 'Ask the Cerulea operator to add this address.'),
      403,
    );
    answer('/studio/administration/projects', { projects: [] });
    answer('/studio/administration/workspaces', { workspaces: [] });
    const response = await stats.GET();
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.code).toBe('operator.role_absent');
    expect(body.error).toContain('Ask the Cerulea operator');
  });

  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    const response = await stats.GET();
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('session.absent');
    expect(calls).toHaveLength(0);
  });
});

describe('GET /api/admin/users', () => {
  it('lists every account with the second factor and says the plan is unread', async () => {
    answer('/studio/administration/accounts', { accounts: accountRows });
    const body = await (await users.GET(request('/api/admin/users'))).json();
    expect(calls[0].path).toBe('/studio/administration/accounts');
    expect(body.total).toBe(2);
    expect(body.plansKnown).toBe(false);
    expect(body.plans).toEqual([]);
    expect(body.counts).toEqual({ accounts: 2, withSecondFactor: 1, paid: null });
    expect(body.users[0]).toMatchObject({ id: 'act_1', name: 'Demo', multiFactorActive: true, workspaceCount: 3 });
    expect(body.users[1].name).toBeNull();
    expect('plan' in body.users[0]).toBe(false);
  });

  it('filters by the search term on the server', async () => {
    answer('/studio/administration/accounts', { accounts: accountRows });
    const body = await (await users.GET(request('/api/admin/users?search=second'))).json();
    expect(body.users.map((row: { email: string }) => row.email)).toEqual(['second@cerulea.local']);
    expect(body.counts.accounts).toBe(2);
  });

  it('refuses a plan filter while the rows carry no plan', async () => {
    answer('/studio/administration/accounts', { accounts: accountRows });
    const response = await users.GET(request('/api/admin/users?plan=free'));
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe('operator.plan_unread');
  });

  it('carries the plan, the state and the project count once the rows hold them', async () => {
    answer('/studio/administration/accounts', {
      accounts: [
        { ...accountRows[0], planId: 'plan_starter', subscriptionState: 'active', projects: 2 },
        { ...accountRows[1], planId: null, subscriptionState: null, projects: 0 },
      ],
    });
    const body = await (await users.GET(request('/api/admin/users?plan=plan_starter'))).json();
    expect(body.plansKnown).toBe(true);
    expect(body.plans).toEqual(['free', 'plan_starter']);
    expect(body.counts.paid).toBe(1);
    expect(body.users).toHaveLength(1);
    expect(body.users[0]).toMatchObject({ plan: 'plan_starter', subStatus: 'active', projectCount: 2 });
  });
});

describe('GET /api/admin/projects', () => {
  it('names the type from the workspace application and counts the whole platform', async () => {
    answer('/studio/administration/projects', { projects: projectRows });
    answer('/studio/administration/workspaces', { workspaces });
    const body = await (await projects.GET(request('/api/admin/projects'))).json();
    expect(calls.map((call) => call.path).sort()).toEqual([
      '/studio/administration/projects',
      '/studio/administration/workspaces',
    ]);
    expect(body.total).toBe(3);
    expect(body.counts).toEqual({ projects: 3, dapp: 2, blockchain: 1 });
    expect(body.statuses).toEqual(['active', 'draft']);
    expect(body.projects[0]).toMatchObject({ id: 'prj_a', projectType: 'dapp', status: 'active', ownerEmail: null, workspaceName: 'Dapps' });
    expect(body.projects[2]).toMatchObject({ projectType: 'blockchain', ownerEmail: 'owner@cerulea.test', ownerName: 'Omar' });
  });

  it('applies the type, the status and the search filters after the read', async () => {
    answer('/studio/administration/projects', { projects: projectRows });
    answer('/studio/administration/workspaces', { workspaces });
    const byType = await (await projects.GET(request('/api/admin/projects?type=blockchain'))).json();
    expect(byType.projects.map((row: { id: string }) => row.id)).toEqual(['prj_c']);
    expect(byType.counts.dapp).toBe(2);
    const byStatus = await (await projects.GET(request('/api/admin/projects?status=draft'))).json();
    expect(byStatus.projects.map((row: { id: string }) => row.id)).toEqual(['prj_b', 'prj_c']);
    const byOwner = await (await projects.GET(request('/api/admin/projects?search=omar'))).json();
    expect(byOwner.projects.map((row: { id: string }) => row.id)).toEqual(['prj_c']);
  });

  it('answers 503 with the fix when Cerulea APIs is down', async () => {
    answers.push({ path: '/studio/administration/projects', status: 0, body: null, unreachable: true });
    answer('/studio/administration/workspaces', { workspaces });
    const response = await projects.GET(request('/api/admin/projects'));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('service.unreachable');
  });
});

describe('GET /api/admin/audit', () => {
  it('maps the security events to the production columns and lists the action areas', async () => {
    answer('/studio/administration/security?limit=200', securityRead);
    const body = await (await audit.GET(request('/api/admin/audit'))).json();
    expect(calls[0].path).toBe('/studio/administration/security?limit=200');
    expect(body.total).toBe(3);
    expect(body.areas).toEqual(['account', 'workspaces']);
    expect(body.logs[0]).toEqual({
      id: 'e1',
      createdAt: '2026-10-04T05:00:00.000Z',
      actorEmail: 'demo@cerulea.local',
      actorType: 'user',
      action: 'account.signed_in',
      resource: 'account',
      status: 'success',
      outcome: 'allowed',
      ip: '127.0.0.1',
    });
    expect(body.logs[1]).toMatchObject({ actorEmail: null, actorType: 'system', status: 'failure', ip: null });
    expect('sessions' in body).toBe(false);
  });

  it('reads the full ceiling for the sign in family and carries the sessions on request', async () => {
    answer('/studio/administration/security?limit=500', securityRead);
    const body = await (await audit.GET(request('/api/admin/audit?action=auth.&limit=500&sessions=1'))).json();
    expect(calls[0].path).toBe('/studio/administration/security?limit=500');
    expect(body.logs.map((row: { action: string }) => row.action)).toEqual([
      'account.signed_in',
      'account.registered',
    ]);
    expect(body.sessions).toEqual(securityRead.sessions);
  });

  it('filters by status and by an action area', async () => {
    answer('/studio/administration/security?limit=500', securityRead);
    const failures = await (await audit.GET(request('/api/admin/audit?status=failure'))).json();
    expect(failures.logs.map((row: { id: string }) => row.id)).toEqual(['e2']);
    const area = await (await audit.GET(request('/api/admin/audit?action=workspaces.'))).json();
    expect(area.logs.map((row: { id: string }) => row.id)).toEqual(['e2']);
  });
});

describe('GET /api/admin/chain', () => {
  it('reads the network, the measurement and the validators in one answer', async () => {
    const network = { node: { chainName: 'Cerulea local' }, head: { number: 300 }, consensusHealth: 'Healthy' };
    const measurement = { transactionsPerSecond: 1.5, sampledBlocks: 20 };
    const validators = [{ profile: { account: 'val_1' }, trust: { total: 90 } }];
    answer('/studio/chain/network', network);
    answer('/studio/chain/measurement', measurement);
    answer('/chain/validators', { validators });
    const body = await (await chain.GET()).json();
    expect(calls.map((call) => call.path).sort()).toEqual([
      '/chain/validators',
      '/studio/chain/measurement',
      '/studio/chain/network',
    ]);
    expect(body).toEqual({ network, measurement, validators });
  });
});

describe('GET /api/admin/[surface]', () => {
  it('forwards a named surface and refuses an unknown one', async () => {
    answer('/studio/administration/workspaces', { workspaces });
    const known = await surface.GET(request('/api/admin/workspaces'), { params: Promise.resolve({ surface: 'workspaces' }) });
    expect(known.status).toBe(200);
    expect((await known.json()).workspaces).toHaveLength(2);
    const unknown = await surface.GET(request('/api/admin/other'), { params: Promise.resolve({ surface: 'other' }) });
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).code).toBe('operator.surface_absent');
  });
});
