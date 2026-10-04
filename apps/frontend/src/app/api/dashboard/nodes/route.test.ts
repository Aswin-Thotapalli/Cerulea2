// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FakeCerulea,
  chainNetwork,
  market,
  networkReading,
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

const validators = {
  validators: [
    {
      profile: { account: 'cerulea_validator_one', stake: '0', standingScore: 80, trustScore: 91, state: 'Active', authoredBlocks: 12, missedBlocks: 1 },
      trust: { total: 91, standing: 36, performance: 28, custody: 18, verification: 9 },
    },
  ],
};

function nodeReading(deploymentId: string, account: string, projectName: string) {
  return {
    nodeId: `${deploymentId}-${account}`,
    deploymentId,
    projectName,
    account,
    kind: 'in_process',
    state: 'running',
    processId: null,
    answerPort: 23705,
    nodePort: null,
    dataDirectory: null,
    systemName: 'cerulea-node',
    systemVersion: '0.1.0-local',
    chainName: 'Cerulea',
    height: 35,
    peers: 1,
    expectedPeers: 1,
    isSyncing: false,
    resources: {
      source: 'hosting_service',
      residentBytes: 136572928,
      heapUsedBytes: 84767272,
      processorSeconds: 217.421,
      uptimeSeconds: 71159.634,
      dataDirectoryBytes: 832711,
    },
    startedAt: '2026-10-04T03:13:54.902Z',
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

describe('GET /api/dashboard/nodes', () => {
  it('reads the node, every validator and the nodes of every workspace with their region', async () => {
    fake.answer('GET', '/studio/chain/network', chainNetwork);
    fake.answer('GET', '/chain/validators', validators);
    fake.answer('GET', '/workspaces', { workspaces: [registry, market] });
    fake.answer('GET', '/dashboard/workspaces/wsp_registry/nodes', {
      nodes: [
        nodeReading('dep_live', 'land_title_registry_registrar_seat_1', 'Land title registry'),
        nodeReading('dep_live', 'land_title_registry_auditor_seat_2', 'Land title registry'),
      ],
      observedAt: '2026-10-04T03:13:55.354Z',
    });
    fake.answer('GET', '/dashboard/workspaces/wsp_registry/networks', {
      networks: [networkReading('dep_live', 'prj_land', 'Land title registry', { region: 'hyderabad' })],
      observedAt: '2026-10-04T03:13:55.000Z',
    });
    fake.answer('GET', '/dashboard/workspaces/wsp_market/nodes', { nodes: [], observedAt: '2026-10-04T03:13:56.000Z' });
    fake.answer('GET', '/dashboard/workspaces/wsp_market/networks', { networks: [], observedAt: '2026-10-04T03:13:56.000Z' });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(fake.paths()).toEqual(
      expect.arrayContaining([
        'GET /studio/chain/network',
        'GET /chain/validators',
        'GET /workspaces',
        'GET /dashboard/workspaces/wsp_registry/nodes',
        'GET /dashboard/workspaces/wsp_registry/networks',
        'GET /dashboard/workspaces/wsp_market/nodes',
        'GET /dashboard/workspaces/wsp_market/networks',
      ]),
    );
    expect(fake.calls.every((call) => call.authorization === 'Bearer tok_dashboard_suite')).toBe(true);

    expect(body.network).toEqual(chainNetwork);
    expect(body.validators).toEqual(validators.validators);
    expect(body.observedAt).toBe('2026-10-04T03:13:56.000Z');
    expect(body.nodes).toHaveLength(2);
    expect(body.nodes[0]).toMatchObject({
      nodeId: 'dep_live-land_title_registry_registrar_seat_1',
      account: 'land_title_registry_registrar_seat_1',
      projectName: 'Land title registry',
      state: 'running',
      workspaceId: 'wsp_registry',
      workspaceName: 'Registry office',
      division: 'govt',
      projectId: 'prj_land',
      region: 'hyderabad',
      resources: { source: 'hosting_service', residentBytes: 136572928, processorSeconds: 217.421, uptimeSeconds: 71159.634 },
    });
  });

  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    const response = await GET();
    expect(response.status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it('passes the failure Cerulea APIs named through', async () => {
    fake.answer('GET', '/studio/chain/network', chainNetwork);
    fake.answer('GET', '/chain/validators', refusal('chain.unreachable', 'The node did not answer.', 'Start the node, then read again.'), 503);
    fake.answer('GET', '/workspaces', { workspaces: [] });
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('chain.unreachable');
    expect(body.error).toBe('The node did not answer. Start the node, then read again.');
  });
});
