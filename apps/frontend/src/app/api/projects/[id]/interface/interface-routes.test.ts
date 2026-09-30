import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Step 5 Interface routes.
 *
 * Each route reads the Blueprint of the project on the server and calls the
 * frontend engine inside Cerulea APIs with the access token of the signed in
 * account. The browser sends the project and the question alone, and receives
 * the answer alone.
 *
 * Plain sentence. These tests check that the token and the Blueprint stay on
 * the server while Step 5 reads the generated application.
 */

const accessToken = 'tok_step5_suite';

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
    get: (name: string) => ({ name, value: 'session' }),
  }),
  headers: () => new Headers({ host: '127.0.0.1:3000' }),
}));

let signedIn = true;

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    signedIn
      ? {
          cerulea: {
            accountId: 'act_step5',
            email: 'step5@cerulea.test',
            displayName: 'Step 5 suite',
            accessToken,
          },
        }
      : null,
}));

const blueprintDocument = { name: 'Land register', schema_version: '1.0.0', marker: 'held-on-server' };

type Call = { url: string; method: string; authorization: string; body: Record<string, unknown> };

/** Stands in for Cerulea APIs and records every call the handler makes. */
function ceruleaApis(overrides: { manifestStatus?: number } = {}): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const headers = (init.headers ?? {}) as Record<string, string>;
      const body =
        typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
      calls.push({
        url,
        method: init.method ?? 'GET',
        authorization: headers.authorization ?? '',
        body,
      });
      const reply = (payload: unknown, status = 200) =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      if (url.includes('/projects/prj_1/blueprint')) {
        return reply({ version: 4, blueprintHash: 'bph_4', document: blueprintDocument });
      }
      if (url.endsWith('/engine/interface')) {
        return reply({ section: { screens: [{ id: 'parcels_list' }] }, omissions: [], faults: [] });
      }
      if (url.endsWith('/engine/components')) {
        return reply({ components: [], groups: [], breakpoints: [], theme: {}, styleSheet: '' });
      }
      if (url.endsWith('/engine/preview/roles')) {
        return reply({ roles: [{ role: 'registrar', name: 'Registrar', screens: 1 }] });
      }
      if (url.endsWith('/engine/preview')) {
        return reply({ role: body.role, screens: [], navigation: [] });
      }
      if (url.endsWith('/engine/bindings')) {
        return reply({ role: body.role, component: body.component, choices: [] });
      }
      if (url.includes('/projects/prj_1/deployment-manifest')) {
        if (overrides.manifestStatus !== undefined) {
          return reply(
            {
              error: {
                code: 'compiler.blocked',
                message: 'The Blueprint holds two corrections.',
                fix: 'Open the readiness checklist and close each correction.',
                details: {},
              },
            },
            overrides.manifestStatus,
          );
        }
        return reply({
          version: 4,
          manifest: {
            integration: [
              {
                method: 'GET',
                path: '/parcels/{parcel_id}',
                parameters: ['parcel_id'],
                response: 'One parcel',
                visibility: 'registrar',
              },
              { method: 7 },
            ],
          },
        });
      }
      return reply({ error: { code: 'route.absent', message: 'No route.', fix: 'None.' } }, 404);
    }),
  );
  return calls;
}

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = 'suite-secret';
  process.env.CERULEA_API_URL = 'http://127.0.0.1:4999';
  signedIn = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const context = { params: { id: 'prj_1' } };

describe('the Step 5 workspace route', () => {
  it('reads the Blueprint on the server and answers without the token or the document', async () => {
    const calls = ceruleaApis();
    const { GET } = await import('./route');
    const reply = await GET(new Request('http://127.0.0.1:3000/api/projects/prj_1/interface'), context);
    expect(reply.status).toBe(200);
    const text = await reply.text();
    expect(text).not.toContain(accessToken);
    expect(text).not.toContain('held-on-server');
    const body = JSON.parse(text) as {
      version: number;
      roles: unknown[];
      endpoints: { path: string }[];
      endpointsNote: string;
    };
    expect(body.version).toBe(4);
    expect(body.roles).toHaveLength(1);
    expect(body.endpoints.map((entry) => entry.path)).toEqual(['/parcels/{parcel_id}']);
    expect(body.endpointsNote).toBe('');

    expect(calls[0]?.url).toContain('/projects/prj_1/blueprint');
    for (const call of calls) {
      expect(call.url.startsWith('http://127.0.0.1:4999/')).toBe(true);
      expect(call.authorization).toBe(`Bearer ${accessToken}`);
    }
    const generated = calls.find((call) => call.url.endsWith('/engine/interface'));
    expect(generated?.body).toEqual({ document: blueprintDocument });
    const manifest = calls.find((call) => call.url.includes('deployment-manifest'));
    expect(manifest?.url).toContain('view=atomic');
    expect(manifest?.url).toContain('version=4');
  });

  it('names the reason when the manifest holds no endpoint list', async () => {
    ceruleaApis({ manifestStatus: 422 });
    const { GET } = await import('./route');
    const reply = await GET(new Request('http://127.0.0.1:3000/api/projects/prj_1/interface'), context);
    expect(reply.status).toBe(200);
    const body = (await reply.json()) as { endpoints: unknown[]; endpointsNote: string };
    expect(body.endpoints).toEqual([]);
    expect(body.endpointsNote).toContain('The Blueprint holds two corrections.');
  });

  it('refuses a request carrying no session', async () => {
    const calls = ceruleaApis();
    signedIn = false;
    const { GET } = await import('./route');
    const reply = await GET(new Request('http://127.0.0.1:3000/api/projects/prj_1/interface'), context);
    expect(reply.status).toBe(401);
    expect(calls).toHaveLength(0);
  });
});

describe('the Step 5 preview route', () => {
  it('forwards the role, the width and the mode beside the Blueprint read on the server', async () => {
    const calls = ceruleaApis();
    const { POST } = await import('./preview/route');
    const reply = await POST(
      new Request('http://127.0.0.1:3000/api/projects/prj_1/interface/preview', {
        method: 'POST',
        body: JSON.stringify({ role: 'registrar', breakpoint: 'phone', mode: 'dark' }),
      }),
      context,
    );
    expect(reply.status).toBe(200);
    const preview = calls.find((call) => call.url.endsWith('/engine/preview'));
    expect(preview?.body).toEqual({
      document: blueprintDocument,
      role: 'registrar',
      breakpoint: 'phone',
      mode: 'dark',
    });
    expect(preview?.authorization).toBe(`Bearer ${accessToken}`);
  });

  it('names the fix when the request names no role', async () => {
    const calls = ceruleaApis();
    const { POST } = await import('./preview/route');
    const reply = await POST(
      new Request('http://127.0.0.1:3000/api/projects/prj_1/interface/preview', {
        method: 'POST',
        body: JSON.stringify({ mode: 'sepia' }),
      }),
      context,
    );
    expect(reply.status).toBe(400);
    const body = (await reply.json()) as { error: { fix: string } };
    expect(body.error.fix).toContain('Choose a role');
    expect(calls).toHaveLength(0);
  });
});

describe('the Step 5 bindings route', () => {
  it('asks the engine for the bindings of one component and one role', async () => {
    const calls = ceruleaApis();
    const { POST } = await import('./bindings/route');
    const reply = await POST(
      new Request('http://127.0.0.1:3000/api/projects/prj_1/interface/bindings', {
        method: 'POST',
        body: JSON.stringify({ role: 'holder', component: 'table' }),
      }),
      context,
    );
    expect(reply.status).toBe(200);
    expect(await reply.json()).toEqual({ role: 'holder', component: 'table', choices: [] });
    const asked = calls.find((call) => call.url.endsWith('/engine/bindings'));
    expect(asked?.body).toEqual({ document: blueprintDocument, role: 'holder', component: 'table' });
  });

  it('names the fix when the request names no component', async () => {
    ceruleaApis();
    const { POST } = await import('./bindings/route');
    const reply = await POST(
      new Request('http://127.0.0.1:3000/api/projects/prj_1/interface/bindings', {
        method: 'POST',
        body: JSON.stringify({ role: 'holder' }),
      }),
      context,
    );
    expect(reply.status).toBe(400);
    const body = (await reply.json()) as { error: { fix: string } };
    expect(body.error.fix).toContain('Choose a component');
  });
});
