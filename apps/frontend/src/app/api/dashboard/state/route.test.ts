// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The State Snapshots routes.
 *
 * The list route reads every project with its versions and checkpoints. The
 * create route takes a checkpoint. The restore route calls the restoration
 * route of Cerulea APIs for one checkpoint.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [{ name: 'next-auth.session-token', value: 'session' }] }),
  headers: () => new Headers({ host: '127.0.0.1:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? { cerulea: { accountId: 'act_state', email: 'state@cerulea.test', displayName: 'Dana Mehta', accessToken: 'tok_state' } }
      : null,
}));

import * as snapshots from './route';
import * as restore from './[id]/restore/route';

const BASE = 'http://cerulea-apis.test';
const STUDIO = 'http://127.0.0.1:3011';

type Call = { method: string; path: string; body: unknown; authorization: string | null };
let calls: Call[] = [];
let answers: { method: string; path: string; status: number; body: unknown }[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body });
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'state-route-suite';
  process.env.CERULEA_API_URL = BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const path = `${url.pathname}${url.search}`;
      const method = init.method ?? 'GET';
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({ method, path, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined, authorization: headers.authorization ?? null });
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
  ownerAccountId: 'act_state',
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

const version6 = { blueprintId: 'blp_6', projectId: 'prj_land', version: 6, blueprintHash: 'f'.repeat(64), schemaVersion: '1.0.0', note: 'Lien release', createdByAccountId: 'act_state', createdAt: '2026-01-06T09:00:00.000Z' };
const checkpoint = { checkpointId: 'chk_before', projectId: 'prj_land', blueprintId: 'blp_5', blueprintHash: 'e'.repeat(64), version: 5, label: 'Before', note: '', createdByAccountId: 'act_state', createdAt: '2026-01-05T10:00:00.000Z' };

function send(method: string, path: string, body: unknown): Request {
  return new Request(`${STUDIO}${path}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

describe('the State Snapshots routes', () => {
  it('refuse every method with no session', async () => {
    state.signedIn = false;
    for (const reply of [
      await snapshots.GET(),
      await snapshots.POST(send('POST', '/api/dashboard/state', { projectId: 'prj_land', label: 'Before' })),
      await restore.POST(send('POST', '/api/dashboard/state/chk_before/restore', { projectId: 'prj_land' }), { params: Promise.resolve({ id: 'chk_before' }) }),
    ]) {
      const { status, body } = await read(reply);
      expect(status).toBe(401);
      expect(body.code).toBe('session.absent');
    }
    expect(calls).toHaveLength(0);
  });

  it('lists each project with its section counts, its versions and its checkpoints', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', { projects: [land] });
    answer('GET', '/projects/prj_land/blueprint', { ...version6, document: { collections: [{ id: 'a' }, { id: 'b' }], actions: [{ id: 'x' }] } });
    answer('GET', '/projects/prj_land/blueprint/versions?limit=20', { versions: [version6] });
    answer('GET', '/projects/prj_land/checkpoints', { checkpoints: [checkpoint] });

    const { status, body } = await read(await snapshots.GET());

    expect(status).toBe(200);
    expect(body.projects).toHaveLength(1);
    const [project] = body.projects;
    expect(project.projectId).toBe('prj_land');
    expect(project.projectName).toBe('Land title registry');
    expect(project.workspaceName).toBe('Registry office');
    expect(project.headVersion).toBe(6);
    expect(project.blueprintHash).toBe('f'.repeat(64));
    expect(project.counts.collections).toBe(2);
    expect(project.counts.actions).toBe(1);
    expect(project.versions).toEqual([version6]);
    expect(project.checkpoints).toEqual([checkpoint]);
    expect(calls.map((call) => call.path)).toEqual(
      expect.arrayContaining(['/projects/prj_land/blueprint/versions?limit=20', '/projects/prj_land/checkpoints']),
    );
    expect(calls.every((call) => call.authorization === 'Bearer tok_state')).toBe(true);
  });

  it('takes a checkpoint with the label and the note', async () => {
    answer('POST', '/projects/prj_land/checkpoints', { checkpoint: { ...checkpoint, checkpointId: 'chk_new', label: 'Before economics' } });
    const { status, body } = await read(await snapshots.POST(send('POST', '/api/dashboard/state', { projectId: 'prj_land', label: 'Before economics', note: 'Friday' })));
    expect(status).toBe(201);
    expect(body.checkpoint.checkpointId).toBe('chk_new');
    expect(calls[0].path).toBe('/projects/prj_land/checkpoints');
    expect(calls[0].body).toEqual({ label: 'Before economics', note: 'Friday' });
  });

  it('refuses a checkpoint with a short label before calling Cerulea APIs', async () => {
    const { status, body } = await read(await snapshots.POST(send('POST', '/api/dashboard/state', { projectId: 'prj_land', label: 'B' })));
    expect(status).toBe(400);
    expect(body.code).toBe('checkpoint.request_incomplete');
    expect(calls).toHaveLength(0);
  });

  it('restores a checkpoint through the restoration route and returns the new version', async () => {
    answer('POST', '/projects/prj_land/checkpoints/chk_before/restoration', {
      checkpoint: { ...checkpoint, checkpointId: 'chk_after', version: 7 },
      restoredFrom: checkpoint,
      blueprint: { ...version6, version: 7 },
      alreadyAtHead: false,
    }, 201);
    const { status, body } = await read(
      await restore.POST(send('POST', '/api/dashboard/state/chk_before/restore', { projectId: 'prj_land' }), { params: Promise.resolve({ id: 'chk_before' }) }),
    );
    expect(status).toBe(201);
    expect(body.blueprint.version).toBe(7);
    expect(body.alreadyAtHead).toBe(false);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].path).toBe('/projects/prj_land/checkpoints/chk_before/restoration');
    expect(calls[0].body).toEqual({});
    expect(calls[0].authorization).toBe('Bearer tok_state');
  });

  it('names the missing project on a restore with no body', async () => {
    const { status, body } = await read(
      await restore.POST(new Request(`${STUDIO}/api/dashboard/state/chk_before/restore`, { method: 'POST' }), { params: Promise.resolve({ id: 'chk_before' }) }),
    );
    expect(status).toBe(400);
    expect(body.code).toBe('checkpoint.project_unnamed');
    expect(calls).toHaveLength(0);
  });

  it('passes a Cerulea APIs refusal on restore through with its message and fix', async () => {
    answer('POST', '/projects/prj_land/checkpoints/chk_gone/restoration', { error: { code: 'checkpoints.absent', message: 'No checkpoint carries that identifier.', fix: 'Reload the list.', details: {} } }, 404);
    const { status, body } = await read(
      await restore.POST(send('POST', '/api/dashboard/state/chk_gone/restore', { projectId: 'prj_land' }), { params: Promise.resolve({ id: 'chk_gone' }) }),
    );
    expect(status).toBe(404);
    expect(body.code).toBe('checkpoints.absent');
    expect(body.error).toBe('No checkpoint carries that identifier. Reload the list.');
  });
});
