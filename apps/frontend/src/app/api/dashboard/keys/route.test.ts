// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Keys route, one method at a time.
 *
 * Each test signs the account in or out, answers the Cerulea APIs calls the
 * handler sends, and checks the paths called and the body returned.
 */

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
            accountId: 'act_keys_suite',
            email: 'keys@cerulea.test',
            displayName: 'Dana Mehta',
            accessToken: 'tok_keys_suite',
          },
        }
      : null,
}));

import * as keys from './route';

const BASE = 'http://cerulea-apis.test';
const STUDIO = 'http://127.0.0.1:3011';

type Call = { method: string; path: string; body: unknown; authorization: string | null };
type Answer = { method: string; path: string; status: number; body: unknown };

let calls: Call[] = [];
let answers: Answer[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body });
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'keys-route-suite';
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
          { error: { code: 'suite.unanswered', message: `The suite holds no answer for ${method} ${path}.`, fix: 'Add one.', details: {} } },
          { status: 404 },
        );
      }
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
  ownerAccountId: 'act_keys_suite',
  createdAt: '2026-01-04T09:00:00.000Z',
};

const clinic = { ...registry, workspaceId: 'wsp_clinic', name: 'Clinic network', slug: 'clinic-network', application: 'enterprise' };

const bankKey = {
  keyId: 'key_bank',
  workspaceId: 'wsp_clinic',
  name: 'Partner bank',
  prefix: 'ck_9z40zygj',
  scopes: ['records.read'],
  requestsPerMinute: 120,
  expiresAt: null,
  revokedAt: null,
  lastUsedAt: null,
  rotatedFromKeyId: null,
  createdAt: '2026-10-01T04:10:30.298Z',
};

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

describe('the Keys route', () => {
  it('refuses every method with no session', async () => {
    state.signedIn = false;
    for (const reply of [
      await keys.GET(get('/api/dashboard/keys')),
      await keys.POST(send('POST', '/api/dashboard/keys', { name: 'Door', scopes: ['records.read'] })),
      await keys.PATCH(send('PATCH', '/api/dashboard/keys?keyId=key_1', {})),
      await keys.DELETE(new Request(`${STUDIO}/api/dashboard/keys?keyId=key_1`, { method: 'DELETE' })),
    ]) {
      const { status, body } = await read(reply);
      expect(status).toBe(401);
      expect(body.code).toBe('session.absent');
    }
    expect(calls).toHaveLength(0);
  });

  it('lists the keys of the named workspace with the purpose of every scope', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('GET', '/studio/workspaces/wsp_clinic/keys', { keys: [bankKey], scopes: ['records.read', 'console.use'] });
    answer('GET', '/v1/keys/scopes', {
      scopes: [{ scope: 'records.read', purpose: 'Reads records through the generated record interface.' }],
    });

    const { status, body } = await read(await keys.GET(get('/api/dashboard/keys?workspaceId=wsp_clinic')));

    expect(status).toBe(200);
    expect(body.workspace.workspaceId).toBe('wsp_clinic');
    expect(body.workspaces.map((entry: { name: string }) => entry.name)).toEqual(['Registry office', 'Clinic network']);
    expect(body.keys).toEqual([bankKey]);
    expect(body.scopes).toEqual(['records.read', 'console.use']);
    expect(body.scopePurposes).toEqual([
      { scope: 'records.read', purpose: 'Reads records through the generated record interface.' },
      { scope: 'console.use', purpose: 'Reaches part of the generated surface.' },
    ]);
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(
      expect.arrayContaining(['GET /studio/workspaces/wsp_clinic/keys', 'GET /v1/keys/scopes']),
    );
    expect(calls.every((call) => call.authorization === 'Bearer tok_keys_suite')).toBe(true);
  });

  it('falls back to the first workspace when none is named', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('GET', '/studio/workspaces/wsp_registry/keys', { keys: [], scopes: [] });
    answer('GET', '/v1/keys/scopes', { scopes: [] });
    const { status, body } = await read(await keys.GET(get('/api/dashboard/keys')));
    expect(status).toBe(200);
    expect(body.workspace.workspaceId).toBe('wsp_registry');
    expect(body.keys).toEqual([]);
  });

  it('issues a key with the name, the scopes, the limit and the expiry, and returns the secret', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('POST', '/studio/workspaces/wsp_clinic/keys', { key: bankKey, secret: 'ck_secret', guidance: 'Shown once.' });

    const { status, body } = await read(
      await keys.POST(
        send('POST', '/api/dashboard/keys', {
          name: 'Partner bank',
          scopes: ['records.read'],
          requestsPerMinute: 120,
          expiresInDays: 30,
          workspaceId: 'wsp_clinic',
        }),
      ),
    );

    expect(status).toBe(201);
    expect(body.secret).toBe('ck_secret');
    expect(body.key.keyId).toBe('key_bank');
    const issued = calls.find((call) => call.method === 'POST');
    expect(issued?.path).toBe('/studio/workspaces/wsp_clinic/keys');
    expect(issued?.body).toEqual({ name: 'Partner bank', scopes: ['records.read'], requestsPerMinute: 120, expiresInDays: 30 });
  });

  it('refuses an issue request with no scope before calling Cerulea APIs', async () => {
    const { status, body } = await read(await keys.POST(send('POST', '/api/dashboard/keys', { name: 'Partner bank', scopes: [] })));
    expect(status).toBe(400);
    expect(body.code).toBe('keys.request_incomplete');
    expect(calls).toHaveLength(0);
  });

  it('rotates and revokes the named key inside the named workspace', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('POST', '/studio/workspaces/wsp_clinic/keys/key_bank/rotation', { key: { ...bankKey, keyId: 'key_bank_2' }, secret: 'ck_rotated', guidance: 'Rotated.' });
    answer('DELETE', '/studio/workspaces/wsp_clinic/keys/key_bank', { key: { ...bankKey, revokedAt: '2026-10-04T00:00:00.000Z' }, guidance: 'Closed.' });

    const rotated = await read(await keys.PATCH(send('PATCH', '/api/dashboard/keys?keyId=key_bank&workspaceId=wsp_clinic', {})));
    expect(rotated.status).toBe(200);
    expect(rotated.body.secret).toBe('ck_rotated');

    const revoked = await read(await keys.DELETE(new Request(`${STUDIO}/api/dashboard/keys?keyId=key_bank&workspaceId=wsp_clinic`, { method: 'DELETE' })));
    expect(revoked.status).toBe(200);
    expect(revoked.body.key.revokedAt).toBe('2026-10-04T00:00:00.000Z');

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(
      expect.arrayContaining([
        'POST /studio/workspaces/wsp_clinic/keys/key_bank/rotation',
        'DELETE /studio/workspaces/wsp_clinic/keys/key_bank',
      ]),
    );
  });

  it('names the missing key on a rotate or revoke with no keyId', async () => {
    const rotated = await read(await keys.PATCH(send('PATCH', '/api/dashboard/keys', {})));
    expect(rotated.status).toBe(400);
    expect(rotated.body.code).toBe('keys.key_unnamed');
    const revoked = await read(await keys.DELETE(new Request(`${STUDIO}/api/dashboard/keys`, { method: 'DELETE' })));
    expect(revoked.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('passes a Cerulea APIs refusal through with its message and fix', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer(
      'GET',
      '/studio/workspaces/wsp_registry/keys',
      { error: { code: 'workspaces.capability_refused', message: 'The role reads no keys.', fix: 'Ask an administrator.', details: {} } },
      403,
    );
    answer('GET', '/v1/keys/scopes', { scopes: [] });
    const { status, body } = await read(await keys.GET(get('/api/dashboard/keys')));
    expect(status).toBe(403);
    expect(body.code).toBe('workspaces.capability_refused');
    expect(body.error).toBe('The role reads no keys. Ask an administrator.');
  });
});
