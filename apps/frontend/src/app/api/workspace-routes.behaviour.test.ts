// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The workspace, billing, deployed page and operator route handlers.
 *
 * Each test signs an account in or out, answers the Cerulea APIs calls the
 * handler sends, and reads the status and the body the handler returns. The
 * fake Cerulea APIs records every call, so each test also checks the address,
 * the method and the body the handler sent.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
  }),
  headers: () => new Headers({ host: '127.0.0.1:3000' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? {
          cerulea: {
            accountId: 'act_workspace_suite',
            email: 'workspace@cerulea.test',
            displayName: 'Asha Rao',
            accessToken: 'tok_workspace_suite',
          },
        }
      : null,
}));

import * as admin from './admin/[surface]/route';
import * as billing from './billing/subscription/route';
import * as deployed from './deployed/[slug]/route';
import * as workspaces from './workspaces/route';

const BASE = 'http://cerulea-apis.test';
const STUDIO = 'http://127.0.0.1:3000';

type Call = { method: string; path: string; body: unknown; authorization: string | null };
type Answer = { method: string; path: string; status: number; body: unknown; unreachable: boolean };

let calls: Call[] = [];
let answers: Answer[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body, unreachable: false });
}

function unreachable(method: string, path: string): void {
  answers.push({ method, path, status: 0, body: null, unreachable: true });
}

function refusal(code: string, message: string, fix: string) {
  return { error: { code, message, fix, details: {} } };
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'workspace-route-suite';
  process.env.CERULEA_API_URL = BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const registry = {
  workspaceId: 'wsp_registry',
  name: 'Registry office',
  slug: 'registry-office',
  application: 'government',
  tier: 'standard',
  state: 'open',
  ownerAccountId: 'act_workspace_suite',
  createdAt: '2026-01-04T09:00:00.000Z',
};

const shop = { ...registry, workspaceId: 'wsp_shop', name: 'Loyalty shop', application: 'dapps' };

function get(path: string): Request {
  return new Request(`${STUDIO}${path}`);
}

function send(method: string, path: string, body: unknown): Request {
  return new Request(`${STUDIO}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

describe('the workspaces route', () => {
  it('refuses both methods with no session', async () => {
    state.signedIn = false;
    expect((await workspaces.GET()).status).toBe(401);
    expect((await workspaces.POST(send('POST', '/api/workspaces', { name: 'Ward' }))).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('lists the workspaces with the access token', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, shop] });
    const { status, body } = await read(await workspaces.GET());
    expect(status).toBe(200);
    expect(body.workspaces.map((entry: { name: string }) => entry.name)).toEqual([
      'Registry office',
      'Loyalty shop',
    ]);
    expect(calls[0].authorization).toBe('Bearer tok_workspace_suite');
  });

  it('relays a failure listing the workspaces', async () => {
    unreachable('GET', '/workspaces');
    const { status, body } = await read(await workspaces.GET());
    expect(status).toBe(503);
    expect(body.error.fix).toContain('Start Cerulea APIs');
  });

  it('asks for a longer name and a known application', async () => {
    for (const request of [
      { name: 'W' },
      { name: 'Ward office', application: 'hospital' },
    ]) {
      const { status, body } = await read(await workspaces.POST(send('POST', '/api/workspaces', request)));
      expect(status).toBe(400);
      expect(body.error.code).toBe('workspace.name_short');
    }
    expect(calls).toHaveLength(0);
  });

  it('opens the workspace and answers 201', async () => {
    answer('POST', '/workspaces', { workspace: { ...registry, workspaceId: 'wsp_ward', name: 'Ward office' } });
    const { status, body } = await read(
      await workspaces.POST(send('POST', '/api/workspaces', { name: 'Ward office', application: 'enterprise' })),
    );
    expect(status).toBe(201);
    expect(body.workspace.workspaceId).toBe('wsp_ward');
    expect(calls[0].body).toEqual({ name: 'Ward office', application: 'enterprise' });
  });

  it('relays a refusal opening the workspace', async () => {
    answer('POST', '/workspaces', refusal('workspace.name_taken', 'That name is taken.', 'Choose another name.'), 409);
    const { status, body } = await read(await workspaces.POST(send('POST', '/api/workspaces', { name: 'Ward office' })));
    expect(status).toBe(409);
    expect(body.error).toEqual({
      code: 'workspace.name_taken',
      message: 'That name is taken.',
      fix: 'Choose another name.',
      details: {},
    });
  });
});

describe('the subscription route', () => {
  it('refuses every method with no session', async () => {
    state.signedIn = false;
    expect((await billing.GET(get('/api/billing/subscription'))).status).toBe(401);
    expect((await billing.POST(send('POST', '/api/billing/subscription', { planId: 'starter' }))).status).toBe(401);
    expect(
      (await billing.DELETE(new Request(`${STUDIO}/api/billing/subscription`, { method: 'DELETE' }))).status,
    ).toBe(401);
  });

  it('reads the plans, the subscription and the invoices of the named workspace', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, shop] });
    answer('GET', '/studio/plans', { plans: [{ planId: 'starter' }, { planId: 'scale' }] });
    answer('GET', '/studio/workspaces/wsp_shop/subscription', {
      subscription: { planId: 'starter', state: 'active' },
      invoices: [{ invoiceId: 'inv_1' }],
    });

    const { status, body } = await read(await billing.GET(get('/api/billing/subscription?workspaceId=wsp_shop')));

    expect(status).toBe(200);
    expect(body).toEqual({
      workspace: shop,
      plans: [{ planId: 'starter' }, { planId: 'scale' }],
      subscription: { planId: 'starter', state: 'active' },
      invoices: [{ invoiceId: 'inv_1' }],
    });
  });

  it('relays a failure reading the plans', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/studio/plans', refusal('payments.unready', 'The payments driver is starting.', 'Wait a minute.'), 503);
    answer('GET', '/studio/workspaces/wsp_registry/subscription', { subscription: null, invoices: [] });
    const { status, body } = await read(await billing.GET(get('/api/billing/subscription')));
    expect(status).toBe(503);
    expect(body.error.code).toBe('payments.unready');
  });

  it('asks for a plan', async () => {
    const { status, body } = await read(await billing.POST(send('POST', '/api/billing/subscription', { planId: '' })));
    expect(status).toBe(400);
    expect(body.error.code).toBe('billing.plan_unnamed');
    expect(calls).toHaveLength(0);
  });

  it('starts the plan in the named workspace and answers 201', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, shop] });
    answer('POST', '/studio/workspaces/wsp_shop/subscription', { subscription: { planId: 'scale', state: 'active' } });
    const { status, body } = await read(
      await billing.POST(send('POST', '/api/billing/subscription', { planId: 'scale', workspaceId: 'wsp_shop' })),
    );
    expect(status).toBe(201);
    expect(body.subscription.planId).toBe('scale');
    const started = calls.find((call) => call.method === 'POST');
    expect(started?.body).toEqual({ planId: 'scale' });
  });

  it('relays a refusal starting the plan', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer(
      'POST',
      '/studio/workspaces/wsp_registry/subscription',
      refusal('payments.plan_absent', 'No such plan.', 'Choose a published plan.'),
      404,
    );
    const { status } = await read(await billing.POST(send('POST', '/api/billing/subscription', { planId: 'gold' })));
    expect(status).toBe(404);
  });

  it('ends the subscription of the named workspace', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, shop] });
    answer('DELETE', '/studio/workspaces/wsp_shop/subscription', { subscription: { state: 'cancelled' } });
    const { status, body } = await read(
      await billing.DELETE(
        new Request(`${STUDIO}/api/billing/subscription?workspaceId=wsp_shop`, { method: 'DELETE' }),
      ),
    );
    expect(status).toBe(200);
    expect(body.subscription.state).toBe('cancelled');
  });

  it('relays a refusal ending the subscription', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer(
      'DELETE',
      '/studio/workspaces/wsp_registry/subscription',
      refusal('payments.nothing_to_end', 'The workspace holds no subscription.', 'Start a plan first.'),
      409,
    );
    const { status, body } = await read(
      await billing.DELETE(new Request(`${STUDIO}/api/billing/subscription`, { method: 'DELETE' })),
    );
    expect(status).toBe(409);
    expect(body.error.fix).toBe('Start a plan first.');
  });
});

describe('the deployed page route', () => {
  const document = {
    collections: [
      { id: 'parcels', description: 'Every land parcel.', privacy: 'public', fields: [] },
      { id: 'owners', description: 'Every owner.', privacy: 'private', fields: [] },
    ],
    actions: [{ id: 'transfer', name: 'Transfer a parcel', description: 'Moves a title.', inputs: [] }],
    views: [{ id: 'parcel_list', name: 'Parcel list', collection: 'parcels', columns: [] }],
  };

  function answerProjects(): void {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', {
      projects: [
        {
          projectId: 'prj_land',
          slug: 'land-titles',
          name: 'Land titles',
          summary: 'Who owns each parcel.',
          state: 'deployed',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
    });
    answer('GET', '/projects/prj_land/blueprint', { version: 6, blueprintHash: 'bph_land', document });
  }

  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status } = await read(await deployed.GET(get('/api/deployed/land-titles'), { params: { slug: 'land-titles' } }));
    expect(status).toBe(401);
  });

  it('answers 404 with the fix when no project carries the address', async () => {
    answerProjects();
    const { status, body } = await read(
      await deployed.GET(get('/api/deployed/fish-market'), { params: { slug: 'fish-market' } }),
    );
    expect(status).toBe(404);
    expect(body.error.code).toBe('deployed.project_absent');
    expect(calls.some((call) => call.path.includes('/deployments'))).toBe(false);
  });

  it('describes the newest deployment and what the Blueprint holds', async () => {
    answerProjects();
    answer('GET', '/v1/projects/prj_land/deployments', {
      deployments: [
        {
          id: 'dep_3',
          status: 'succeeded',
          stages: [{ name: 'install', status: 'succeeded', startedAt: '2026-04-01T00:00:00.000Z' }],
        },
        { id: 'dep_2', status: 'failed', stages: [] },
      ],
    });

    const { status, body } = await read(
      await deployed.GET(get('/api/deployed/land-titles'), { params: { slug: 'land-titles' } }),
    );

    expect(status).toBe(200);
    expect(body.project).toEqual({
      projectId: 'prj_land',
      name: 'Land titles',
      summary: 'Who owns each parcel.',
      state: 'deployed',
      headVersion: 6,
    });
    expect(body.workspace).toEqual({ workspaceId: 'wsp_registry', name: 'Registry office' });
    expect(body.deployment).toEqual({
      deploymentId: 'dep_3',
      status: 'succeeded',
      stages: [
        { name: 'install', status: 'succeeded', startedAt: '2026-04-01T00:00:00.000Z', endedAt: null, outcome: null },
      ],
    });
    expect(body.counts).toMatchObject({ collections: 2, actions: 1, views: 1 });
    expect(body.collections).toEqual([
      { id: 'parcels', description: 'Every land parcel.', privacy: 'public' },
      { id: 'owners', description: 'Every owner.', privacy: 'private' },
    ]);
    expect(body.actions).toEqual([{ id: 'transfer', name: 'Transfer a parcel', description: 'Moves a title.' }]);
    expect(body.views).toEqual([{ id: 'parcel_list', name: 'Parcel list', collection: 'parcels' }]);
  });

  it('finds the project by its identifier and answers a null deployment when none exists', async () => {
    answerProjects();
    answer('GET', '/v1/projects/prj_land/deployments', { deployments: [] });
    const { status, body } = await read(
      await deployed.GET(get('/api/deployed/prj_land'), { params: { slug: 'prj_land' } }),
    );
    expect(status).toBe(200);
    expect(body.deployment).toBeNull();
  });

  it('relays a failure reading the deployments', async () => {
    answerProjects();
    unreachable('GET', '/v1/projects/prj_land/deployments');
    const { status, body } = await read(
      await deployed.GET(get('/api/deployed/land-titles'), { params: { slug: 'land-titles' } }),
    );
    expect(status).toBe(503);
    expect(body.error.details.path).toBe('/v1/projects/prj_land/deployments');
  });
});

describe('the operator route', () => {
  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status } = await read(await admin.GET(get('/api/admin/summary'), { params: { surface: 'summary' } }));
    expect(status).toBe(401);
  });

  it('answers 404 naming the five surfaces for an unknown one', async () => {
    const { status, body } = await read(await admin.GET(get('/api/admin/billing'), { params: { surface: 'billing' } }));
    expect(status).toBe(404);
    expect(body.error.code).toBe('operator.surface_absent');
    expect(body.error.fix).toBe(
      'Open one of the administration screens: summary, accounts, workspaces, projects, security.',
    );
    expect(calls).toHaveLength(0);
  });

  it('forwards the read of a known surface', async () => {
    answer('GET', '/studio/administration/security', { failedSignIns: 3 });
    const { status, body } = await read(
      await admin.GET(get('/api/admin/security'), { params: { surface: 'security' } }),
    );
    expect(status).toBe(200);
    expect(body.failedSignIns).toBe(3);
  });

  it('returns the refusal Cerulea APIs names for an account outside the operator list', async () => {
    answer(
      'GET',
      '/studio/administration/accounts',
      refusal('operator.not_listed', 'This account is outside the operator list.', 'Sign in as an operator.'),
      403,
    );
    const { status, body } = await read(
      await admin.GET(get('/api/admin/accounts'), { params: { surface: 'accounts' } }),
    );
    expect(status).toBe(403);
    expect(body.error.code).toBe('operator.not_listed');
  });
});
