// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The account route under the dashboard.
 *
 * GET gathers the account, the sessions, the plan, the workspace the plan
 * applies to, its members, the roles and the project count. POST sends an
 * invitation. Each test checks the Cerulea APIs calls and the body returned.
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

import { GET, POST } from './route';
import {
  type FakeApis,
  answerPlan,
  fakeApis,
  refusal,
  suiteAccount,
  suiteSessions,
  suiteWorkspaces,
} from '@/app/api/profile/_shared/suite';

const STUDIO = 'http://127.0.0.1:3000';
let apis: FakeApis;

const members = [
  {
    memberId: 'mem_1',
    workspaceId: 'wsp_shop',
    email: 'settings@cerulea.test',
    displayName: 'Dana Mehta',
    role: 'owner',
    state: 'active',
  },
  {
    memberId: 'mem_2',
    workspaceId: 'wsp_shop',
    email: 'ravi@cerulea.test',
    displayName: '',
    role: 'reviewer',
    state: 'invited',
  },
];
const roles = [
  { role: 'owner', capabilities: ['workspace.close'] },
  { role: 'builder', capabilities: ['project.write'] },
];

beforeEach(() => {
  state.signedIn = true;
  state.division = '';
  process.env.NEXTAUTH_SECRET = 'settings-route-suite';
  apis = fakeApis();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function answerReads(sessions: unknown = { sessions: suiteSessions }, sessionStatus = 200): void {
  apis.answer('GET', '/workspaces', { workspaces: suiteWorkspaces });
  answerPlan(apis);
  apis.answer('GET', '/accounts/me', { account: suiteAccount });
  apis.answer('GET', '/sessions', sessions, sessionStatus);
  apis.answer('GET', '/workspaces/roles', { roles });
  apis.answer('GET', '/workspaces/wsp_shop/members', { members });
  apis.answer('GET', '/workspaces/wsp_shop/projects', {
    projects: [
      { projectId: 'prj_1', state: 'draft' },
      { projectId: 'prj_2', state: 'deployed' },
      { projectId: 'prj_3', state: 'closed' },
    ],
  });
}

describe('GET /api/dashboard/settings', () => {
  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    expect((await GET(new Request(`${STUDIO}/api/dashboard/settings`))).status).toBe(401);
    expect(apis.calls).toHaveLength(0);
  });

  it('gathers the account, the sessions, the plan, the workspace, its members and the project count', async () => {
    answerReads();
    const reply = await GET(new Request(`${STUDIO}/api/dashboard/settings`));
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.account).toEqual(suiteAccount);
    expect(body.sessions).toEqual(suiteSessions);
    // The workspace is the one the Dapps subscription names, so the members come from it.
    expect(body.workspace.workspaceId).toBe('wsp_shop');
    expect(body.workspaces).toHaveLength(2);
    expect(body.members).toEqual(members);
    expect(body.roles).toEqual(roles);
    expect(body.plan).toMatchObject({
      division: 'dapp',
      tierId: 'private_dapps',
      label: 'Private Dapps',
      limits: { projects: 3 },
    });
    expect(body.projectCount).toBe(2);
    for (const path of [
      '/workspaces',
      '/studio/access',
      '/accounts/me',
      '/sessions',
      '/workspaces/roles',
      '/workspaces/wsp_shop/members',
      '/workspaces/wsp_shop/projects',
    ]) {
      expect(apis.sent('GET', path)?.authorization).toBe('Bearer tok_settings_suite');
    }
  });

  it('works inside a named workspace when the query names one', async () => {
    answerReads();
    apis.answer('GET', '/workspaces/wsp_registry/members', { members: [members[0]] });
    apis.answer('GET', '/workspaces/wsp_registry/projects', { projects: [] });
    const body = await (
      await GET(new Request(`${STUDIO}/api/dashboard/settings?workspaceId=wsp_registry`))
    ).json();
    expect(body.workspace.workspaceId).toBe('wsp_registry');
    expect(body.members).toHaveLength(1);
    expect(body.projectCount).toBe(0);
    expect(apis.sent('GET', '/workspaces/wsp_shop/members')).toBeUndefined();
  });

  it('answers the Cerulea failure when the session list fails', async () => {
    answerReads(
      refusal('sessions.unreadable', 'The session list is unavailable.', 'Try again in a minute.'),
      503,
    );
    const reply = await GET(new Request(`${STUDIO}/api/dashboard/settings`));
    expect(reply.status).toBe(503);
    const body = await reply.json();
    expect(body.code).toBe('sessions.unreadable');
    expect(body.error).toBe('The session list is unavailable. Try again in a minute.');
  });
});

describe('POST /api/dashboard/settings', () => {
  function post(body: unknown) {
    return POST(
      new Request(`${STUDIO}/api/dashboard/settings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  }

  it('sends the invitation to the named workspace and answers 201 with the guidance', async () => {
    apis.answer('GET', '/workspaces', { workspaces: suiteWorkspaces });
    apis.answer('POST', '/workspaces/wsp_shop/invitations', {
      member: { ...members[1], email: 'new@cerulea.test', role: 'builder' },
      guidance: 'Cerulea sent the invitation to new@cerulea.test.',
    });
    const reply = await post({ email: 'new@cerulea.test', role: 'builder', workspaceId: 'wsp_shop' });
    expect(reply.status).toBe(201);
    expect((await reply.json()).guidance).toBe('Cerulea sent the invitation to new@cerulea.test.');
    const sent = apis.sent('POST', '/workspaces/wsp_shop/invitations');
    expect(sent?.body).toEqual({ email: 'new@cerulea.test', role: 'builder' });
    expect(sent?.authorization).toBe('Bearer tok_settings_suite');
  });

  it('refuses an invitation without a role before calling Cerulea APIs', async () => {
    const reply = await post({ email: 'new@cerulea.test' });
    expect(reply.status).toBe(400);
    expect((await reply.json()).code).toBe('member.invitation_incomplete');
    expect(apis.calls).toHaveLength(0);
  });

  it('passes the Cerulea refusal through', async () => {
    apis.answer('GET', '/workspaces', { workspaces: suiteWorkspaces });
    apis.answer(
      'POST',
      '/workspaces/wsp_registry/invitations',
      refusal('member.present', 'That address already belongs to a member.', 'Choose another address.'),
      409,
    );
    const reply = await post({ email: 'settings@cerulea.test', role: 'viewer' });
    expect(reply.status).toBe(409);
    expect((await reply.json()).error).toBe(
      'That address already belongs to a member. Choose another address.',
    );
  });
});
