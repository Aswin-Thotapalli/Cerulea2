// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FakeCerulea,
  market,
  project,
  refusal,
  registry,
} from '@/app/api/dashboard/_shared/fake-cerulea.test-support';

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
  }),
  headers: () => new Headers({ host: '127.0.0.1:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? {
          cerulea: {
            accountId: 'act_dashboard_suite',
            email: 'dashboard@cerulea.test',
            displayName: 'Dana Mehta',
            accessToken: 'tok_dashboard_suite',
          },
        }
      : null,
}));

import { GET } from './route';

const overview = {
  account: { accountId: 'act_dashboard_suite', email: 'dashboard@cerulea.test', displayName: 'Dana Mehta' },
  counts: {
    workspaces: 2,
    projects: 3,
    projectsDeployed: 1,
    projectsInBuild: 2,
    blueprintVersions: 16,
    checkpoints: 0,
    deployments: 5,
    deploymentsRunning: 0,
    openKeys: 2,
  },
  chain: {
    chainName: 'Cerulea',
    kind: 'local',
    head: 24,
    finalizedBlock: 22,
    activeValidators: 4,
    totalValidators: 4,
    consensusHealth: 'Healthy',
    healthy: true,
  },
  integrations: [{ integration: 'payments', kind: 'local', ready: true, detail: 'The local ledger holds 1 subscriptions.' }],
  attention: [],
  recentProjects: [],
  recentEvents: [
    { eventId: 'aud_1', action: 'workspace.created', subjectType: 'workspace', outcome: 'allowed', occurredAt: '2026-10-03T06:58:08.526Z' },
  ],
};

function interfaces(deploymentId: string | null, requests: number[], startedAt: string) {
  return {
    deploymentId,
    host: null,
    basePath: null,
    descriptionHash: null,
    endpoints: requests.map((count) => ({ traffic: { requests: count } })),
    routes: [],
    overall: { requests: 0 },
    window: { startedAt, observations: 0 },
  };
}

let fake: FakeCerulea;

beforeEach(() => {
  state.signedIn = true;
  process.env.NEXTAUTH_SECRET = 'dashboard-route-suite';
  fake = new FakeCerulea();
  fake.install();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/dashboard/overview', () => {
  it('joins the overview, the projects of every workspace and the served requests', async () => {
    fake.answer('GET', '/studio/overview', overview);
    fake.answer('GET', '/workspaces', { workspaces: [registry, market] });
    fake.answer('GET', '/workspaces/wsp_registry/projects', {
      projects: [
        project('prj_land', 'Land title registry', 'wsp_registry', 'deployed', '2026-10-03T07:27:55.363Z'),
        project('prj_permit', 'Permit issuance', 'wsp_registry', 'draft', '2026-10-02T07:27:55.363Z'),
        project('prj_old', 'Retired register', 'wsp_registry', 'closed', '2026-09-02T07:27:55.363Z'),
      ],
    });
    fake.answer('GET', '/workspaces/wsp_market/projects', {
      projects: [project('prj_vote', 'Voting dApp', 'wsp_market', 'building', '2026-10-04T01:00:00.000Z')],
    });
    fake.answer('GET', '/dashboard/workspaces/wsp_registry/interfaces', interfaces('dep_1', [4, 6], '2026-10-03T07:28:20.241Z'));
    fake.answer('GET', '/dashboard/workspaces/wsp_market/interfaces', interfaces(null, [], '2026-10-02T07:28:20.241Z'));

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(fake.paths()).toEqual(
      expect.arrayContaining([
        'GET /studio/overview',
        'GET /workspaces',
        'GET /workspaces/wsp_registry/projects',
        'GET /workspaces/wsp_market/projects',
        'GET /dashboard/workspaces/wsp_registry/interfaces',
        'GET /dashboard/workspaces/wsp_market/interfaces',
      ]),
    );
    expect(fake.calls.every((call) => call.authorization === 'Bearer tok_dashboard_suite')).toBe(true);

    expect(body.counts).toEqual(overview.counts);
    expect(body.chain).toEqual(overview.chain);
    expect(body.integrations).toEqual(overview.integrations);
    expect(body.recentEvents).toEqual(overview.recentEvents);
    expect(body.tiles).toEqual({
      projects: 3,
      live: 1,
      inBuild: 2,
      drafts: 1,
      chains: 2,
      dapps: 1,
      deployments: 5,
      deploymentsRunning: 0,
      requests: 10,
      servingDeployments: 1,
      requestsSince: '2026-10-02T07:28:20.241Z',
    });
    // Closed projects leave the table. The newest change comes first.
    expect(body.projects.map((row: { id: string }) => row.id)).toEqual(['prj_vote', 'prj_land', 'prj_permit']);
    expect(body.projects[1]).toMatchObject({
      id: 'prj_land',
      name: 'Land title registry',
      slug: 'land',
      projectType: 'blockchain',
      status: 'active',
      state: 'deployed',
      division: 'govt',
      workspaceName: 'Registry office',
    });
    expect(body.projects[0]).toMatchObject({ projectType: 'dapp', status: 'deploying', division: 'dapp' });
  });

  it('answers 401 with the sign in fix when nobody signed in', async () => {
    state.signedIn = false;
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('session.absent');
    expect(fake.calls).toEqual([]);
  });

  it('passes the failure Cerulea APIs named through unchanged', async () => {
    fake.answer('GET', '/studio/overview', refusal('chain.unreachable', 'The node did not answer.', 'Start the node, then read again.'), 503);
    fake.answer('GET', '/workspaces', { workspaces: [] });
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('chain.unreachable');
    expect(body.fix).toBe('Start the node, then read again.');
    expect(body.error).toBe('The node did not answer. Start the node, then read again.');
  });
});
