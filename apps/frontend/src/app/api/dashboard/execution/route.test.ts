// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The execution route behind the Smart Contracts screen.
 *
 * The route reads every project, the build state of each one and the three
 * substrate descriptions, and answers the substrate and reason per project.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [{ name: 'next-auth.session-token', value: 'session' }] }),
  headers: () => new Headers({ host: '127.0.0.1:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? { cerulea: { accountId: 'act_exec', email: 'exec@cerulea.test', displayName: 'Dana Mehta', accessToken: 'tok_exec' } }
      : null,
}));

import * as execution from './route';

const BASE = 'http://cerulea-apis.test';

let calls: { method: string; path: string; authorization: string | null }[] = [];
let answers: { method: string; path: string; status: number; body: unknown }[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body });
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'execution-route-suite';
  process.env.CERULEA_API_URL = BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const path = `${url.pathname}${url.search}`;
      const method = init.method ?? 'GET';
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({ method, path, authorization: headers.authorization ?? null });
      const match = answers.find((entry) => entry.method === method && entry.path === path);
      if (!match) {
        return Response.json(
          { error: { code: 'suite.unanswered', message: `No answer for ${method} ${path}.`, fix: 'Add one.', details: {} } },
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
  ownerAccountId: 'act_exec',
  createdAt: '2026-01-04T09:00:00.000Z',
};

const land = {
  projectId: 'prj_land',
  workspaceId: 'wsp_registry',
  name: 'Land title registry',
  slug: 'land-title-registry',
  summary: 'The register.',
  state: 'draft',
  headVersion: 6,
  createdAt: '2026-01-05T09:00:00.000Z',
  updatedAt: '2026-01-06T09:00:00.000Z',
};

const substrates = [
  { substrate: 'Native', name: 'Native interpretation', summary: 'Reads the Blueprint directly.', suits: 'Nearly every system.', cost: 'Bounded.' },
  { substrate: 'WebAssembly', name: 'WebAssembly', summary: 'A compiled module.', suits: 'Heavy computation.', cost: 'Needs an engineer.' },
  { substrate: 'EthereumVirtualMachine', name: 'Ethereum Virtual Machine', summary: 'Bytecode.', suits: 'Ecosystem code.', cost: 'Other rules.' },
];

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

describe('the execution route', () => {
  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status, body } = await read(await execution.GET());
    expect(status).toBe(401);
    expect(body.code).toBe('session.absent');
  });

  it('answers the substrate and the reason of each project with the three descriptions', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', { projects: [land] });
    answer('GET', '/projects/prj_land/blueprint', { blueprintId: 'blp_1', projectId: 'prj_land', version: 6, blueprintHash: 'a'.repeat(64), schemaVersion: '1.0.0', note: '', createdByAccountId: 'act_exec', createdAt: '2026-01-06T09:00:00.000Z', document: {} });
    answer('GET', '/studio/execution-substrates', { substrates });
    answer('GET', '/studio/projects/prj_land/build-state', {
      projectId: 'prj_land',
      rowVersion: 3,
      buildState: { execution: { substrate: 'WebAssembly', reason: 'The valuation model needs unbounded computation.' } },
    });

    const { status, body } = await read(await execution.GET());

    expect(status).toBe(200);
    expect(body.substrates).toEqual(substrates);
    expect(body.projects).toEqual([
      {
        projectId: 'prj_land',
        projectName: 'Land title registry',
        workspaceName: 'Registry office',
        state: 'draft',
        substrate: 'WebAssembly',
        substrateName: 'WebAssembly',
        reason: 'The valuation model needs unbounded computation.',
      },
    ]);
    expect(calls.map((call) => call.path)).toEqual(
      expect.arrayContaining(['/studio/execution-substrates', '/studio/projects/prj_land/build-state']),
    );
    expect(calls.every((call) => call.authorization === 'Bearer tok_exec')).toBe(true);
  });

  it('answers an empty project list with the descriptions when the account holds none', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', { projects: [] });
    answer('GET', '/studio/execution-substrates', { substrates });
    const { status, body } = await read(await execution.GET());
    expect(status).toBe(200);
    expect(body.projects).toEqual([]);
    expect(body.substrates).toHaveLength(3);
  });
});
