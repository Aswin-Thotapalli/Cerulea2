// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The password change route.
 *
 * The handler sends both passwords to Cerulea APIs and answers the guidance.
 * A refusal, such as a weak password, passes through with the fix Cerulea
 * APIs named.
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

import { POST } from './route';
import { type FakeApis, fakeApis, refusal, suiteAccount } from '@/app/api/profile/_shared/suite';

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

function post(body: unknown) {
  return POST(
    new Request(`${STUDIO}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/auth/change-password', () => {
  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    expect((await post({ currentPassword: 'a', newPassword: 'b' })).status).toBe(401);
    expect(apis.calls).toHaveLength(0);
  });

  it('sends both passwords to Cerulea APIs and answers the guidance', async () => {
    apis.answer('POST', '/accounts/password', { ok: true, account: suiteAccount });
    const reply = await post({
      currentPassword: 'old phrase of words',
      newPassword: 'new phrase of four words',
    });
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.ok).toBe(true);
    expect(body.guidance).toBe('The password changed. Sign in with the new password from now on.');
    expect(body.account).toEqual({
      email: 'settings@cerulea.test',
      displayName: 'Dana Mehta',
      multiFactorActive: true,
    });
    const sent = apis.sent('POST', '/accounts/password');
    expect(sent?.body).toEqual({
      currentPassword: 'old phrase of words',
      newPassword: 'new phrase of four words',
    });
    expect(sent?.authorization).toBe('Bearer tok_settings_suite');
  });

  it('refuses a body missing a password before calling Cerulea APIs', async () => {
    const reply = await post({ currentPassword: 'old phrase of words' });
    expect(reply.status).toBe(400);
    expect((await reply.json()).code).toBe('password.change_incomplete');
    expect(apis.calls).toHaveLength(0);
  });

  it('passes the strength refusal through with the fix', async () => {
    apis.answer(
      'POST',
      '/accounts/password',
      refusal(
        'accounts.password_weak',
        'The password fails the strength rules.',
        'Choose a password of at least twelve characters.',
      ),
      400,
    );
    const reply = await post({ currentPassword: 'old phrase of words', newPassword: 'short' });
    expect(reply.status).toBe(400);
    const body = await reply.json();
    expect(body.code).toBe('accounts.password_weak');
    expect(body.error).toBe(
      'The password fails the strength rules. Choose a password of at least twelve characters.',
    );
  });
});
