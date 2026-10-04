// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The account route behind the session.
 *
 * GET answers the account Cerulea APIs holds. PUT changes the name through
 * the Cerulea APIs profile route. Each test checks the path, the body and the
 * token the handler sent.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
    get: () => undefined,
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
  fakeApis,
  refusal,
  suiteAccount,
  suiteProfile,
} from '@/app/api/profile/_shared/suite';

const STUDIO = 'http://127.0.0.1:3000';
let apis: FakeApis;

beforeEach(() => {
  state.signedIn = true;
  process.env.NEXTAUTH_SECRET = 'settings-route-suite';
  apis = fakeApis();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function put(body: unknown) {
  return PUT(
    new Request(`${STUDIO}/api/auth/me`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('GET /api/auth/me', () => {
  it('answers the account with the three top level fields the production screens read', async () => {
    apis.answer('GET', '/accounts/me', { account: suiteAccount });
    const reply = await GET();
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body).toMatchObject({
      id: 'act_settings_suite',
      email: 'settings@cerulea.test',
      name: 'Dana Mehta',
    });
    expect(body.account).toMatchObject({
      multiFactorActive: true,
      lastSignInAt: '2026-10-03T07:00:00.000Z',
    });
    expect(apis.sent('GET', '/accounts/me')?.authorization).toBe('Bearer tok_settings_suite');
  });

  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    expect((await GET()).status).toBe(401);
  });
});

describe('PUT /api/auth/me', () => {
  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    expect((await put({ name: 'Dana' })).status).toBe(401);
    expect(apis.calls).toHaveLength(0);
  });

  it('sends the name alone to the Cerulea APIs profile route and answers the new name', async () => {
    apis.answer('PUT', '/studio/profile', {
      ...suiteProfile,
      user: { ...suiteProfile.user, name: 'Dana M' },
    });
    const reply = await put({ name: '  Dana M  ', company: 'ignored' });
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body).toMatchObject({
      id: 'act_settings_suite',
      email: 'settings@cerulea.test',
      name: 'Dana M',
    });
    expect(body.profile).toEqual(suiteProfile.profile);
    const sent = apis.sent('PUT', '/studio/profile');
    expect(sent?.body).toEqual({ name: 'Dana M' });
    expect(sent?.authorization).toBe('Bearer tok_settings_suite');
  });

  it('refuses a short name before calling Cerulea APIs', async () => {
    const reply = await put({ name: 'D' });
    expect(reply.status).toBe(400);
    expect((await reply.json()).code).toBe('account.name_short');
    expect(apis.calls).toHaveLength(0);
  });

  it('passes the Cerulea refusal through', async () => {
    apis.answer(
      'PUT',
      '/studio/profile',
      refusal('accounts.locked', 'The account is locked.', 'Wait ten minutes.'),
      423,
    );
    const reply = await put({ name: 'Dana' });
    expect(reply.status).toBe(423);
    expect((await reply.json()).error).toBe('The account is locked. Wait ten minutes.');
  });
});
