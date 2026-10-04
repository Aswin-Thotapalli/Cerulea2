// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The profile route.
 *
 * Each test answers the Cerulea APIs calls the handler sends and reads the
 * body it returns. The fake records every call, so each test also checks the
 * path, the method, the body and the access token.
 */

const state = vi.hoisted(() => ({ signedIn: true, division: '' }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
    get: (name: string) =>
      name === 'cerulea.division' && state.division ? { name, value: state.division } : undefined,
  }),
  headers: () => new Headers({ host: '127.0.0.1:3000' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? {
          cerulea: {
            accountId: 'act_settings_suite',
            email: 'settings@cerulea.test',
            displayName: 'Dana Mehta',
            accessToken: 'tok_settings_suite',
          },
        }
      : null,
}));

import { GET, PUT } from './route';
import {
  type FakeApis,
  answerPlan,
  fakeApis,
  refusal,
  suiteAccess,
  suiteAccount,
  suiteProfile,
  suiteWorkspaces,
} from './_shared/suite';

const STUDIO = 'http://127.0.0.1:3000';

let apis: FakeApis;

beforeEach(() => {
  state.signedIn = true;
  state.division = '';
  process.env.NEXTAUTH_SECRET = 'settings-route-suite';
  apis = fakeApis();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function answerProfileReads(): void {
  apis.answer('GET', '/studio/profile', suiteProfile);
  apis.answer('GET', '/accounts/me', { account: suiteAccount });
  apis.answer('GET', '/workspaces', { workspaces: suiteWorkspaces });
  answerPlan(apis);
  apis.answer('GET', '/workspaces/wsp_shop/projects', {
    projects: [
      { projectId: 'prj_1', state: 'draft' },
      { projectId: 'prj_2', state: 'closed' },
    ],
  });
  apis.answer('GET', '/v1/workspaces/wsp_shop/usage', {
    usage: {
      workspaceId: 'wsp_shop',
      from: '2026-09-04T00:00:00.000Z',
      to: '2026-10-04T00:00:00.000Z',
      totals: [{ metric: 'transactions', unit: 'count', quantity: 156 }],
      byDeployment: [],
      points: [],
    },
  });
}

describe('GET /api/profile', () => {
  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    const reply = await GET(new Request(`${STUDIO}/api/profile`));
    expect(reply.status).toBe(401);
    expect((await reply.json()).code).toBe('session.absent');
    expect(apis.calls).toHaveLength(0);
  });

  it('answers the profile, the account state, the plan, the project count and the usage', async () => {
    answerProfileReads();
    const reply = await GET(new Request(`${STUDIO}/api/profile`));
    expect(reply.status).toBe(200);
    const body = await reply.json();

    expect(body.user).toMatchObject({
      id: 'act_settings_suite',
      email: 'settings@cerulea.test',
      name: 'Dana Mehta',
      createdAt: '2026-01-04T09:00:00.000Z',
      state: 'active',
      multiFactorActive: true,
      lastSignInAt: '2026-10-03T07:00:00.000Z',
    });
    expect(body.profile).toEqual(suiteProfile.profile);
    // The plan comes from the first division holding one, with the catalogue name.
    expect(body.plan).toMatchObject({
      division: 'dapp',
      tierId: 'private_dapps',
      label: 'Private Dapps',
      status: 'active',
      limits: { projects: 3, txPerMonth: 50000 },
    });
    expect(body.plan.specs).toHaveLength(2);
    // The workspace is the one the subscription names, and closed projects stay out of the count.
    expect(body.workspace).toEqual({ workspaceId: 'wsp_shop', name: 'Shop chain', application: 'dapps' });
    expect(body.projectCount).toBe(1);
    expect(body.usage.totals).toEqual([{ metric: 'transactions', unit: 'count', quantity: 156 }]);
    expect(body.usageFix).toBeNull();

    for (const path of [
      '/studio/profile',
      '/accounts/me',
      '/studio/access',
      '/studio/entitlements?division=dapp',
      '/studio/catalogue?division=dapp',
      '/workspaces/wsp_shop/projects',
      '/v1/workspaces/wsp_shop/usage',
    ]) {
      expect(apis.sent('GET', path)?.authorization).toBe('Bearer tok_settings_suite');
    }
  });

  it('keeps the division of the cookie when that division holds a plan', async () => {
    state.division = 'dapp';
    answerProfileReads();
    const body = await (await GET(new Request(`${STUDIO}/api/profile`))).json();
    expect(body.plan.division).toBe('dapp');
  });

  it('falls back to the first division holding a plan when the cookie names one without', async () => {
    state.division = 'govt';
    answerProfileReads();
    const body = await (await GET(new Request(`${STUDIO}/api/profile`))).json();
    expect(body.plan.division).toBe('dapp');
    expect(apis.sent('GET', '/studio/entitlements?division=govt')).toBeUndefined();
  });

  it('answers No plan and the first workspace when no division holds a plan', async () => {
    apis.answer('GET', '/studio/profile', suiteProfile);
    apis.answer('GET', '/accounts/me', { account: suiteAccount });
    apis.answer('GET', '/workspaces', { workspaces: suiteWorkspaces });
    apis.answer('GET', '/studio/access', {
      ...suiteAccess,
      subscriptions: { dapp: null, enterprise: null, govt: null },
      divisions: suiteAccess.divisions.map((entry) => ({ ...entry, tierId: null, workspaceId: null, access: false })),
    });
    apis.answer('GET', '/workspaces/wsp_registry/projects', { projects: [] });
    apis.answer('GET', '/v1/workspaces/wsp_registry/usage', {
      usage: { workspaceId: 'wsp_registry', from: '', to: '', totals: [], byDeployment: [], points: [] },
    });
    const body = await (await GET(new Request(`${STUDIO}/api/profile`))).json();
    expect(body.plan).toMatchObject({ division: null, tierId: null, label: 'No plan', limits: {} });
    expect(body.workspace.workspaceId).toBe('wsp_registry');
    expect(body.projectCount).toBe(0);
    expect(apis.calls.some((call) => call.path.startsWith('/studio/entitlements'))).toBe(false);
  });

  it('names the fix when the usage read is refused and still answers the profile', async () => {
    apis.answer('GET', '/studio/profile', suiteProfile);
    apis.answer('GET', '/accounts/me', { account: suiteAccount });
    apis.answer('GET', '/workspaces', { workspaces: suiteWorkspaces });
    answerPlan(apis);
    apis.answer('GET', '/workspaces/wsp_shop/projects', { projects: [] });
    apis.answer(
      'GET',
      '/v1/workspaces/wsp_shop/usage',
      refusal('permission.absent', 'The role holds no billing read.', 'Ask an administrator for the role.'),
      403,
    );
    const reply = await GET(new Request(`${STUDIO}/api/profile`));
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.usage).toBeNull();
    expect(body.usageFix).toBe('Ask an administrator for the role.');
    expect(body.user.name).toBe('Dana Mehta');
  });

  it('answers the Cerulea failure when the profile read fails', async () => {
    apis.answer('GET', '/studio/profile', refusal('accounts.absent', 'No account.', 'Sign in again.'), 404);
    apis.answer('GET', '/accounts/me', { account: suiteAccount });
    apis.answer('GET', '/workspaces', { workspaces: suiteWorkspaces });
    answerPlan(apis);
    const reply = await GET(new Request(`${STUDIO}/api/profile`));
    expect(reply.status).toBe(404);
    const body = await reply.json();
    expect(body.code).toBe('accounts.absent');
    expect(body.error).toBe('No account. Sign in again.');
  });
});

describe('PUT /api/profile', () => {
  function put(body: unknown) {
    return PUT(
      new Request(`${STUDIO}/api/profile`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  }

  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    expect((await put({ name: 'Dana' })).status).toBe(401);
  });

  it('sends the name, the company and the role to Cerulea APIs and answers the profile', async () => {
    const changed = {
      ...suiteProfile,
      user: { ...suiteProfile.user, name: 'Dana M' },
      profile: { ...suiteProfile.profile, company: 'Harbour board', role: 'Clerk' },
    };
    apis.answer('PUT', '/studio/profile', changed);
    const reply = await put({ name: 'Dana M', company: 'Harbour board', role: 'Clerk' });
    expect(reply.status).toBe(200);
    expect(await reply.json()).toEqual(changed);
    const sent = apis.sent('PUT', '/studio/profile');
    expect(sent?.body).toEqual({ name: 'Dana M', company: 'Harbour board', role: 'Clerk' });
    expect(sent?.authorization).toBe('Bearer tok_settings_suite');
  });

  it('refuses an empty change and a name under two characters before calling Cerulea APIs', async () => {
    expect((await put({})).status).toBe(400);
    const short = await put({ name: 'D' });
    expect(short.status).toBe(400);
    expect((await short.json()).code).toBe('profile.change_incomplete');
    expect(apis.calls).toHaveLength(0);
  });

  it('passes the Cerulea refusal through', async () => {
    apis.answer(
      'PUT',
      '/studio/profile',
      refusal('accounts.display_name_short', 'The name holds fewer than two characters.', 'Supply a longer name.'),
      400,
    );
    const reply = await put({ name: 'Da' });
    expect(reply.status).toBe(400);
    expect((await reply.json()).error).toBe('The name holds fewer than two characters. Supply a longer name.');
  });
});
