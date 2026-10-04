// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FakeCerulea,
  chainMeasurement,
  chainNetwork,
  market,
  networkReading,
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

const workspaceOverview = {
  health: { deploymentId: 'dep_live' },
  throughput: { transactionsPerSecond: 1.743, sampledBlocks: 24, measuredAt: '2026-10-04T03:13:54.849Z' },
};

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

describe('GET /api/dashboard/networks', () => {
  it('reads the deployments of every workspace, the node and the measurement', async () => {
    fake.answer('GET', '/workspaces', { workspaces: [registry, market] });
    fake.answer('GET', '/studio/chain/network', chainNetwork);
    fake.answer('GET', '/studio/chain/measurement', chainMeasurement);
    fake.answer('GET', '/workspaces/wsp_registry/projects', {
      projects: [
        project('prj_land', 'Land title registry', 'wsp_registry', 'deployed', '2026-10-03T07:27:55.363Z'),
        project('prj_permit', 'Permit issuance', 'wsp_registry', 'draft', '2026-10-02T07:27:55.363Z'),
        project('prj_old', 'Retired register', 'wsp_registry', 'closed', '2026-09-02T07:27:55.363Z'),
      ],
    });
    fake.answer('GET', '/dashboard/workspaces/wsp_registry/networks', {
      networks: [
        networkReading('dep_live', 'prj_land', 'Land title registry'),
        networkReading('dep_gone', 'prj_land', 'Land title registry', {
          state: 'rolled_back',
          publicationState: null,
          host: null,
          basePath: null,
          reachable: false,
          unreachableReason: 'Cerulea removed this deployment, so it runs no Blockchain.',
          height: null,
          activeValidators: null,
          totalValidators: null,
          consensusHealth: null,
        }),
      ],
      observedAt: '2026-10-04T03:14:00.000Z',
    });
    fake.answer('GET', '/dashboard/workspaces/wsp_registry/overview', workspaceOverview);
    fake.answer('GET', '/workspaces/wsp_market/projects', {
      projects: [project('prj_vote', 'Voting dApp', 'wsp_market', 'building', '2026-10-04T01:00:00.000Z')],
    });
    fake.answer('GET', '/dashboard/workspaces/wsp_market/networks', {
      networks: [
        networkReading('dep_building', 'prj_vote', 'Voting dApp', {
          state: 'running',
          publicationState: null,
          host: null,
          reachable: false,
          unreachableReason: 'The deployment is still running.',
          height: null,
          activeValidators: null,
          totalValidators: null,
          consensusHealth: null,
        }),
      ],
      observedAt: '2026-10-04T03:14:01.000Z',
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(fake.paths()).toEqual(
      expect.arrayContaining([
        'GET /workspaces',
        'GET /studio/chain/network',
        'GET /studio/chain/measurement',
        'GET /workspaces/wsp_registry/projects',
        'GET /dashboard/workspaces/wsp_registry/networks',
        'GET /dashboard/workspaces/wsp_registry/overview',
        'GET /workspaces/wsp_market/projects',
        'GET /dashboard/workspaces/wsp_market/networks',
      ]),
    );
    // An idle workspace costs no overview read.
    expect(fake.paths()).not.toContain('GET /dashboard/workspaces/wsp_market/overview');
    expect(fake.calls.every((call) => call.authorization === 'Bearer tok_dashboard_suite')).toBe(true);

    expect(body.chain).toEqual(chainNetwork);
    expect(body.measurement).toEqual(chainMeasurement);
    expect(body.observedAt).toBe('2026-10-04T03:14:01.000Z');

    // One row per open project. The closed project leaves the list.
    expect(body.networks.map((row: { id: string }) => row.id)).toEqual(['prj_land', 'prj_permit', 'prj_vote']);

    const live = body.networks[0];
    expect(live).toMatchObject({
      name: 'Land title registry',
      type: 'Blockchain',
      projectType: 'blockchain',
      division: 'govt',
      status: 'live',
      blockHeight: 35,
      finalizedBlock: 33,
      tps: 1.743,
      sampledBlocks: 24,
      measuredAt: '2026-10-04T03:13:54.849Z',
      consensusHealth: 100,
      consensusState: 'Healthy',
      activeValidators: 2,
      totalValidators: 2,
      region: 'local',
      deploymentId: 'dep_live',
      host: 'land-title-registry.cerulea.test',
      basePath: '/v1/deployments/dep_live',
      workspaceName: 'Registry office',
    });

    expect(body.networks[1]).toMatchObject({
      name: 'Permit issuance',
      status: 'building',
      blockHeight: null,
      tps: null,
      consensusHealth: null,
      deploymentId: null,
      host: null,
    });

    expect(body.networks[2]).toMatchObject({
      name: 'Voting dApp',
      type: 'dApp',
      division: 'dapp',
      status: 'deploying',
      deploymentId: 'dep_building',
      tps: null,
    });
  });

  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    const response = await GET();
    expect(response.status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it('passes the failure Cerulea APIs named through', async () => {
    fake.answer('GET', '/workspaces', { workspaces: [] });
    fake.answer('GET', '/studio/chain/network', refusal('chain.unreachable', 'The node did not answer.', 'Start the node, then read again.'), 503);
    fake.answer('GET', '/studio/chain/measurement', chainMeasurement);
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('chain.unreachable');
    expect(body.error).toBe('The node did not answer. Start the node, then read again.');
  });
});
