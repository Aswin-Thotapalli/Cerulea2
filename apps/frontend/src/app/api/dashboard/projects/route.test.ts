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

describe('GET /api/dashboard/projects', () => {
  it('lists every open project with the type its workspace fixes', async () => {
    fake.answer('GET', '/workspaces', { workspaces: [registry, market] });
    fake.answer('GET', '/workspaces/wsp_registry/projects', {
      projects: [
        project('prj_land', 'Land title registry', 'wsp_registry', 'deployed', '2026-10-03T07:27:55.363Z'),
        project('prj_old', 'Retired register', 'wsp_registry', 'closed', '2026-09-02T07:27:55.363Z'),
      ],
    });
    fake.answer('GET', '/workspaces/wsp_market/projects', {
      projects: [project('prj_vote', 'Voting dApp', 'wsp_market', 'draft', '2026-10-04T01:00:00.000Z')],
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(fake.paths()).toEqual([
      'GET /workspaces',
      'GET /workspaces/wsp_registry/projects',
      'GET /workspaces/wsp_market/projects',
    ]);
    expect(body.projects).toHaveLength(2);
    expect(body.projects[0]).toMatchObject({
      id: 'prj_vote',
      projectType: 'dapp',
      status: 'draft',
      division: 'dapp',
      workspaceName: 'Market dApps',
    });
    expect(body.projects[1]).toMatchObject({
      id: 'prj_land',
      slug: 'land',
      projectType: 'blockchain',
      status: 'active',
      division: 'govt',
      updatedAt: '2026-10-03T07:27:55.363Z',
    });
    expect(body.workspaces).toEqual([
      { workspaceId: 'wsp_registry', name: 'Registry office', application: 'government' },
      { workspaceId: 'wsp_market', name: 'Market dApps', application: 'dapps' },
    ]);
  });

  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    const response = await GET();
    expect(response.status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it('passes the failure Cerulea APIs named through', async () => {
    fake.answer('GET', '/workspaces', refusal('sessions.expired', 'The session ended.', 'Sign in again.'), 401);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('sessions.expired');
    expect(body.error).toBe('The session ended. Sign in again.');
  });
});
