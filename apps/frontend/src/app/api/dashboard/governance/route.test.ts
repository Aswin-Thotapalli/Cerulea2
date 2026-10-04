// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Governance route.
 *
 * The route reads every project with its Blueprint and answers the four
 * transaction classes plus the Governance section of each project.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [{ name: 'next-auth.session-token', value: 'session' }] }),
  headers: () => new Headers({ host: '127.0.0.1:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? { cerulea: { accountId: 'act_gov', email: 'gov@cerulea.test', displayName: 'Dana Mehta', accessToken: 'tok_gov' } }
      : null,
}));

import * as governance from './route';

const BASE = 'http://cerulea-apis.test';

type Call = { method: string; path: string; authorization: string | null };
let calls: Call[] = [];
let answers: { method: string; path: string; status: number; body: unknown }[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body });
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'governance-route-suite';
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
  ownerAccountId: 'act_gov',
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

const document = {
  identities: { roles: [{ id: 'registrar', name: 'Registrar', credentials: [] }, { id: 'auditor', name: 'Auditor', credentials: [] }] },
  governance: {
    authority: ['registrar', 'auditor'],
    quorum: { routine: 51, financial: 67, structural: 80, constitutional: 95 },
    constitutional_delay_blocks: 28800,
    change_process: 'The registrar records the change.',
  },
};

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

describe('the Governance route', () => {
  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status, body } = await read(await governance.GET());
    expect(status).toBe(401);
    expect(body.code).toBe('session.absent');
    expect(calls).toHaveLength(0);
  });

  it('answers the four classes and the governance of each project from its Blueprint', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', { projects: [land] });
    answer('GET', '/projects/prj_land/blueprint', {
      blueprintId: 'blp_1',
      projectId: 'prj_land',
      version: 6,
      blueprintHash: 'a'.repeat(64),
      schemaVersion: '1.0.0',
      note: '',
      createdByAccountId: 'act_gov',
      createdAt: '2026-01-06T09:00:00.000Z',
      document,
    });

    const { status, body } = await read(await governance.GET());

    expect(status).toBe(200);
    expect(body.classes.map((entry: { name: string; architectureThreshold: number; mandatoryDelay: boolean }) => [entry.name, entry.architectureThreshold, entry.mandatoryDelay])).toEqual([
      ['Routine', 51, false],
      ['Financial', 67, false],
      ['Structural', 80, false],
      ['Constitutional', 90, true],
    ]);
    expect(body.classes.every((entry: { meaning: string }) => entry.meaning.length > 0)).toBe(true);
    expect(body.projects).toEqual([
      {
        projectId: 'prj_land',
        projectName: 'Land title registry',
        workspaceName: 'Registry office',
        state: 'draft',
        version: 6,
        authority: ['Registrar', 'Auditor'],
        quorum: { routine: 51, financial: 67, structural: 80, constitutional: 95 },
        constitutionalDelayBlocks: 28800,
        changeProcess: 'The registrar records the change.',
        roleCount: 2,
      },
    ]);
    expect(calls.map((call) => call.path)).toEqual(['/workspaces', '/workspaces/wsp_registry/projects', '/projects/prj_land/blueprint']);
    expect(calls.every((call) => call.authorization === 'Bearer tok_gov')).toBe(true);
  });

  it('answers the classes with an empty project list when the account holds none', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', { projects: [] });
    const { status, body } = await read(await governance.GET());
    expect(status).toBe(200);
    expect(body.projects).toEqual([]);
    expect(body.classes).toHaveLength(4);
  });
});
