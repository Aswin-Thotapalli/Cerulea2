// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The session routes: the list, closing one, closing every one.
 *
 * Each test answers the Cerulea APIs call the handler sends and reads the
 * body it returns.
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

import { GET } from './route';
import { DELETE } from './[id]/route';
import { POST } from './revocations/route';
import {
  type FakeApis,
  fakeApis,
  refusal,
  suiteSessions,
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

describe('GET /api/dashboard/sessions', () => {
  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    expect((await GET()).status).toBe(401);
  });

  it('lists the open sessions with their count', async () => {
    apis.answer('GET', '/sessions', { sessions: suiteSessions });
    const reply = await GET();
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.sessions).toEqual(suiteSessions);
    expect(body.count).toBe(2);
    expect(apis.sent('GET', '/sessions')?.authorization).toBe('Bearer tok_settings_suite');
  });
});

describe('DELETE /api/dashboard/sessions/:id', () => {
  const request = (id: string) =>
    DELETE(new Request(`${STUDIO}/api/dashboard/sessions/${id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id }),
    });

  it('closes the named session and names the device in the guidance', async () => {
    const closed = { ...suiteSessions[1], current: false };
    apis.answer('DELETE', '/sessions/ses%20phone', { session: closed });
    const reply = await request('ses phone');
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.session).toEqual(closed);
    expect(body.guidance).toBe('The session on Phone browser is closed.');
    expect(apis.sent('DELETE', '/sessions/ses%20phone')?.authorization).toBe(
      'Bearer tok_settings_suite',
    );
  });

  it('refuses an empty session name before calling Cerulea APIs', async () => {
    const reply = await request(' ');
    expect(reply.status).toBe(400);
    expect((await reply.json()).code).toBe('session.unnamed');
    expect(apis.calls).toHaveLength(0);
  });

  it('passes the Cerulea refusal through', async () => {
    apis.answer(
      'DELETE',
      '/sessions/ses_gone',
      refusal('sessions.absent', 'The session already ended.', 'Read the list again.'),
      404,
    );
    const reply = await request('ses_gone');
    expect(reply.status).toBe(404);
    expect((await reply.json()).error).toBe('The session already ended. Read the list again.');
  });
});

describe('POST /api/dashboard/sessions/revocations', () => {
  it('closes every session and names the sign out path', async () => {
    apis.answer('POST', '/sessions/revocations', {
      closed: 4,
      guidance: 'Every session on the account is closed. Sign in again to continue.',
    });
    const reply = await POST();
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.closed).toBe(4);
    expect(body.guidance).toBe('Every session on the account is closed. Sign in again to continue.');
    expect(body.signOutPath).toBe('/api/auth/force-signout?next=/auth/login');
    expect(apis.sent('POST', '/sessions/revocations')?.authorization).toBe(
      'Bearer tok_settings_suite',
    );
  });

  it('answers 401 when nobody signed in', async () => {
    state.signedIn = false;
    expect((await POST()).status).toBe(401);
    expect(apis.calls).toHaveLength(0);
  });

  it('names the fix when Cerulea APIs is unreachable', async () => {
    apis.unreachable('POST', '/sessions/revocations');
    const reply = await POST();
    expect(reply.status).toBe(503);
    expect((await reply.json()).code).toBe('service.unreachable');
  });
});
