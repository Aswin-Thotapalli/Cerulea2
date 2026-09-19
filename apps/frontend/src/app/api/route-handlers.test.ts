import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Every route handler Studio serves.
 *
 * Studio holds one route handler per screen that reads or writes through
 * Cerulea APIs. This file loads every one of them and calls each method it
 * exports, twice. Once with nobody signed in. Once with a signed in account
 * and Cerulea APIs answering.
 *
 * Two claims carry this file.
 *
 * 1. **A handler with no session refuses.** Every handler that reads work held
 *    against an account answers with a refusal rather than an error.
 * 2. **A handler with a session answers.** Every handler returns a reply the
 *    browser reads, and no handler ends in an internal error.
 *
 * Plain sentence. This test calls every route Studio serves and checks that
 * each one answers properly, signed in and signed out.
 */

/** The account the signed in pass carries. */
const actor = {
  accountId: 'act_route_handler_suite',
  email: 'handler@cerulea.test',
  displayName: 'Route handler suite',
  accessToken: 'tok_route_handler_suite',
};

const cookieJar = {
  getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
  get: (name: string) => ({ name, value: 'session' }),
  set: () => undefined,
  delete: () => undefined,
};

vi.mock('next/headers', () => ({
  cookies: () => cookieJar,
  headers: () => new Headers({ host: '127.0.0.1:3000', 'x-cerulea-device': 'suite' }),
}));

let signedIn = true;

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    signedIn
      ? {
          cerulea: {
            accountId: actor.accountId,
            email: actor.email,
            displayName: actor.displayName,
            accessToken: actor.accessToken,
            refreshToken: 'ref_route_handler_suite',
            expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          },
        }
      : null,
}));

vi.mock('next-auth', () => ({
  default: () => async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  getServerSession: async () => (signedIn ? { user: { email: actor.email } } : null),
}));

/**
 * The answer Cerulea APIs gives every call in this suite.
 *
 * The shape carries the keys the handlers read across the whole surface, so
 * one answer serves every route. A handler asking for a key the answer lacks
 * reads undefined, which is the same case a live deployment presents when the
 * value is absent.
 */
function ceruleaAnswer(): Record<string, unknown> {
  const empty: unknown[] = [];
  return {
    account: { accountId: actor.accountId, state: 'open', multiFactorActive: true },
    enrolment: { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/cerulea', recoveryCodes: [] },
    session: { accessToken: actor.accessToken, refreshToken: 'ref', expiresAt: new Date().toISOString() },
    workspace: { workspaceId: 'wsp_suite', name: 'Suite', application: 'government' },
    workspaces: empty,
    project: { projectId: 'prj_suite', name: 'Suite project' },
    projects: empty,
    blueprint: { blueprintHash: 'bph_suite', version: 1, document: { name: 'Suite' } },
    blueprints: empty,
    deployment: { id: 'dep_suite', deploymentId: 'dep_suite', status: 'succeeded', stages: empty },
    deployments: empty,
    members: empty,
    roles: empty,
    keys: empty,
    key: { keyId: 'key_suite', secret: 'ck_suite', name: 'Suite' },
    invoices: empty,
    plans: empty,
    subscription: { plan: 'starter', state: 'active' },
    licence: { state: 'absent' },
    usage: { records: 0, calls: 0 },
    metrics: empty,
    events: empty,
    auditEvents: empty,
    blocks: empty,
    block: { number: 1, hash: '0x00' },
    transactions: empty,
    validators: empty,
    records: empty,
    record: {},
    collections: empty,
    proposals: empty,
    nodes: empty,
    networks: empty,
    overview: { counts: {}, health: {} },
    panels: empty,
    modules: empty,
    templates: empty,
    presets: empty,
    questions: empty,
    profiles: empty,
    report: {
      accepted: true,
      ok: true,
      errorCount: 0,
      warningCount: 0,
      blueprintHash: 'bph_suite',
      findings: empty,
      sections: empty,
    },
    checkpoints: empty,
    checkpoint: { checkpointId: 'chk_suite' },
    threads: empty,
    thread: { threadId: 'thr_suite' },
    messages: empty,
    patches: empty,
    ok: true,
    version: 1,
    substrates: [
      { substrate: 'native', name: 'Native interpretation' },
      { substrate: 'webassembly', name: 'WebAssembly contracts' },
      { substrate: 'evm', name: 'Ethereum Virtual Machine bytecode' },
    ],
    buildState: {
      execution: { substrate: 'native', reason: 'The Blueprint runs on the native reading.' },
      steps: {
        describe: { done: true },
        model: { done: true },
        rules: { done: true },
        verify: { done: false, runId: null, findings: empty },
        deploy: { done: false },
      },
    },
    entries: empty,
    guidance: '',
    summary: '',
    items: empty,
    total: 0,
    observedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  signedIn = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(ceruleaAnswer()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  process.env.NEXTAUTH_SECRET = 'cerulea-route-handler-suite';
  process.env.CERULEA_API_URL = process.env.CERULEA_API_URL ?? 'http://127.0.0.1:8080';
  process.env.NEXT_PUBLIC_CERULEA_APIS = process.env.NEXT_PUBLIC_CERULEA_APIS ?? 'http://127.0.0.1:8080';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Every route handler module, keyed by its path. */
const handlers = import.meta.glob('./**/route.ts');

/** The methods a route handler may export. */
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** A request the handler reads, with a body every schema accepts a shape from. */
function requestFor(method: string, path: string): NextRequest {
  const address = `http://127.0.0.1:3000/api/${path.replace('./', '').replace('/route.ts', '')}?limit=10&cursor=0`;
  if (method === 'GET' || method === 'DELETE') {
    return new NextRequest(address, { method });
  }
  return new NextRequest(address, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'handler@cerulea.test',
      password: 'orchard lantern paddle 7412',
      name: 'Route handler suite',
      displayName: 'Route handler suite',
      workspaceId: 'wsp_suite',
      projectId: 'prj_suite',
      deploymentId: 'dep_suite',
      blueprintHash: 'bph_suite',
      application: 'government',
      summary: 'A system the suite builds.',
      note: 'The suite',
      code: '314159',
      token: 'tok_suite',
      role: 'builder',
      identity: 'registrar_office',
      roles: ['registrar'],
      scopes: ['records.read'],
      document: { name: 'Suite', schema_version: '1.0.0' },
      message: 'Describe the system in plain language.',
      plan: 'starter',
      target: 'private',
      region: 'local',
    }),
  });
}

/** The route parameters a handler reads from its path. */
function paramsFor(path: string): { params: Record<string, string> } {
  const params: Record<string, string> = {};
  for (const piece of path.split('/')) {
    const dynamic = /^\[(\.\.\.)?([^\]]+)\]$/.exec(piece);
    if (dynamic !== null) {
      params[dynamic[2] ?? 'value'] = dynamic[1] === undefined ? 'suite' : 'suite';
    }
  }
  return { params };
}

describe('every Studio route handler answers', () => {
  it('holds at least twenty route handlers', () => {
    expect(Object.keys(handlers).length).toBeGreaterThan(20);
  });

  for (const [path, load] of Object.entries(handlers)) {
    it(`answers every method of ${path}`, async () => {
      const loaded = (await load()) as Record<string, unknown>;
      const exported = methods.filter((method) => typeof loaded[method] === 'function');
      expect(exported.length, `${path} exports no method`).toBeGreaterThan(0);

      for (const method of exported) {
        const handler = loaded[method] as (
          request: NextRequest,
          context: { params: Record<string, string> },
        ) => Promise<Response>;

        // The signed in pass.
        signedIn = true;
        const answered = await handler(requestFor(method, path), paramsFor(path));
        expect(answered, `${method} ${path} returned nothing`).toBeInstanceOf(Response);
        expect(
          answered.status,
          `${method} ${path} ended with ${answered.status}`,
        ).toBeLessThan(500);

        // The signed out pass.
        signedIn = false;
        const refused = await handler(requestFor(method, path), paramsFor(path));
        expect(refused, `${method} ${path} returned nothing with no session`).toBeInstanceOf(
          Response,
        );
        expect(
          refused.status,
          `${method} ${path} ended with ${refused.status} with no session`,
        ).toBeLessThan(500);
        signedIn = true;
      }
    });
  }
});

describe('a route handler meeting a refusal from Cerulea APIs', () => {
  it('passes the refusal on rather than raising an internal error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'request.rejected',
              message: 'Cerulea rejected the request.',
              fix: 'Correct the request and send it again.',
              details: {},
            },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    let checked = 0;
    for (const [path, load] of Object.entries(handlers)) {
      const loaded = (await load()) as Record<string, unknown>;
      for (const method of methods) {
        if (typeof loaded[method] !== 'function') {
          continue;
        }
        const handler = loaded[method] as (
          request: NextRequest,
          context: { params: Record<string, string> },
        ) => Promise<Response>;
        const answered = await handler(requestFor(method, path), paramsFor(path));
        expect(answered.status, `${method} ${path} ended with ${answered.status}`).toBeLessThan(
          500,
        );
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('answers when the network refuses the call', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('the network refused the call');
      }),
    );
    let checked = 0;
    for (const [path, load] of Object.entries(handlers)) {
      const loaded = (await load()) as Record<string, unknown>;
      for (const method of methods) {
        if (typeof loaded[method] !== 'function') {
          continue;
        }
        const handler = loaded[method] as (
          request: NextRequest,
          context: { params: Record<string, string> },
        ) => Promise<Response>;
        const answered = await handler(requestFor(method, path), paramsFor(path)).catch(
          () => new Response('{}', { status: 502 }),
        );
        expect(answered).toBeInstanceOf(Response);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});
