// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Integrations route.
 *
 * The route reads the platform health, every project with its Blueprint,
 * and the surface the live deployment of the chosen project publishes.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [{ name: 'next-auth.session-token', value: 'session' }] }),
  headers: () => new Headers({ host: '127.0.0.1:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? { cerulea: { accountId: 'act_int', email: 'int@cerulea.test', displayName: 'Dana Mehta', accessToken: 'tok_int' } }
      : null,
}));

import * as integrations from './route';

const BASE = 'http://cerulea-apis.test';
const STUDIO = 'http://127.0.0.1:3011';

let calls: { method: string; path: string; authorization: string | null }[] = [];
let answers: { method: string; path: string; status: number; body: unknown }[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body });
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'integrations-route-suite';
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

const registry = { workspaceId: 'wsp_registry', name: 'Registry office', slug: 'registry-office', application: 'enterprise', tier: 'standard', state: 'open', ownerAccountId: 'act_int', createdAt: '2026-01-04T09:00:00.000Z' };

function project(projectId: string, name: string, updatedAt: string) {
  return { projectId, workspaceId: 'wsp_registry', name, slug: projectId, summary: '', state: 'draft', headVersion: 6, createdAt: '2026-01-05T09:00:00.000Z', updatedAt };
}

const land = project('prj_land', 'Land title registry', '2026-01-07T09:00:00.000Z');
const permit = project('prj_permit', 'Permit issuance', '2026-01-06T09:00:00.000Z');

const health = {
  service: 'cerulea-apis',
  mode: 'local',
  ready: true,
  checkedAt: '2026-10-04T03:16:46.031Z',
  integrations: [{ integration: 'payments', kind: 'local', ready: true, detail: 'The local ledger holds 1 subscriptions.' }],
};

const landDocument = {
  integrations: {
    feeds: [{ id: 'feed_rates', name: 'Guideline values', provider: 'Revenue department', payload_type: 'Number', cadence_seconds: 3600, attestation: 'Signature' }],
    bridges: [],
    triggers: [{ id: 'trg', event: 'transfer_registered', endpoint: 'https://bank.example/hooks', signing: 'Signature', retries: 5 }],
  },
};

function blueprint(projectId: string, document: unknown) {
  return { blueprintId: `blp_${projectId}`, projectId, version: 6, blueprintHash: `${projectId}-hash`, schemaVersion: '1.0.0', note: '', createdByAccountId: 'act_int', createdAt: '2026-01-06T09:00:00.000Z', document };
}

const liveDeployment = {
  id: 'dep_live',
  status: 'succeeded',
  stages: [],
  record: {
    blueprintHash: 'installed-hash',
    descriptionHash: 'desc-hash',
    target: { host: 'land.cerulea.test', basePath: '/v1/deployments/dep_live', certificate: { notAfter: '2026-12-30T04:09:57.663Z' } },
  },
  projectId: 'prj_land',
  workspaceId: 'wsp_registry',
  blueprintHash: 'installed-hash',
  target: 'local',
  startedAt: null,
  endedAt: null,
  rolledBackAt: null,
  failureReason: null,
};

const rolledBack = { ...liveDeployment, id: 'dep_old', status: 'rolled_back' };

const description = {
  endpoints: [
    { method: 'POST', path: '/actions/approve', purpose: 'Approve a transfer.', roles: ['registrar'], transactionClass: 'Structural', threshold: 80 },
    { method: 'GET', path: '/records/parcel', purpose: 'Reads parcels.', roles: ['citizen'] },
  ],
  proofEndpoints: [{ method: 'GET', path: '/proofs/parcel/{id}', purpose: 'Proof of a parcel.', roles: [] }],
  webhooks: [{ event: 'transfer_registered', purpose: 'A transfer reached the register.', endpoint: '', signing: 'Signature', retries: 5 }],
  streams: [{ path: '/stream', purpose: 'Carries changes.' }],
  descriptionHash: 'desc-hash',
};

function get(path: string): Request {
  return new Request(`${STUDIO}${path}`);
}

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

function answerProjects(): void {
  answer('GET', '/health/ready', health);
  answer('GET', '/workspaces', { workspaces: [registry] });
  answer('GET', '/workspaces/wsp_registry/projects', { projects: [land, permit] });
  answer('GET', '/projects/prj_land/blueprint', blueprint('prj_land', landDocument));
  answer('GET', '/projects/prj_permit/blueprint', blueprint('prj_permit', {}));
}

describe('the Integrations route', () => {
  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status, body } = await read(await integrations.GET(get('/api/dashboard/integrations')));
    expect(status).toBe(401);
    expect(body.code).toBe('session.absent');
  });

  it('answers the drivers, the declared connections and the surface of the newest project', async () => {
    answerProjects();
    answer('GET', '/v1/projects/prj_land/deployments', { deployments: [rolledBack, liveDeployment] });
    answer('GET', '/v1/deployments/dep_live', liveDeployment);
    answer('GET', '/projects/prj_land/blueprint/versions?limit=50', { versions: [{ ...blueprint('prj_land', {}), version: 5, blueprintHash: 'installed-hash' }] });
    answer('GET', '/projects/prj_land/interface-description?version=5', { version: 5, description });

    const { status, body } = await read(await integrations.GET(get('/api/dashboard/integrations')));

    expect(status).toBe(200);
    expect(body.platform).toEqual({ mode: 'local', ready: true, checkedAt: '2026-10-04T03:16:46.031Z', drivers: health.integrations });
    expect(body.selectedProjectId).toBe('prj_land');
    expect(body.projects.map((entry: { projectId: string }) => entry.projectId)).toEqual(['prj_land', 'prj_permit']);
    expect(body.projects[0]).toMatchObject({
      projectName: 'Land title registry',
      workspaceName: 'Registry office',
      division: 'enterprise',
      version: 6,
      feeds: landDocument.integrations.feeds,
      triggers: landDocument.integrations.triggers,
      bridges: [],
    });
    expect(body.surface).toMatchObject({
      projectId: 'prj_land',
      deploymentId: 'dep_live',
      status: 'succeeded',
      host: 'land.cerulea.test',
      basePath: '/v1/deployments/dep_live',
      certificateNotAfter: '2026-12-30T04:09:57.663Z',
      descriptionHash: 'desc-hash',
      descriptionVersion: 5,
      descriptionMatchesDeployment: true,
    });
    expect(body.surface.endpoints.map((entry: { kind: string; method: string; address: string }) => [entry.kind, entry.method, entry.address])).toEqual([
      ['action', 'POST', 'https://land.cerulea.test/v1/deployments/dep_live/actions/approve'],
      ['record', 'GET', 'https://land.cerulea.test/v1/deployments/dep_live/records/parcel'],
      ['proof', 'GET', 'https://land.cerulea.test/v1/deployments/dep_live/proofs/parcel/{id}'],
      ['stream', 'GET', 'https://land.cerulea.test/v1/deployments/dep_live/stream'],
    ]);
    expect(body.surface.endpoints[0]).toMatchObject({ transactionClass: 'Structural', threshold: 80, roles: ['registrar'] });
    expect(body.surface.webhooks).toEqual([{ event: 'transfer_registered', purpose: 'A transfer reached the register.', endpoint: '', signing: 'Signature', retries: 5 }]);
    expect(calls.map((call) => call.path)).toEqual(
      expect.arrayContaining(['/health/ready', '/v1/projects/prj_land/deployments', '/v1/deployments/dep_live', '/projects/prj_land/interface-description?version=5']),
    );
    expect(calls.every((call) => call.authorization === 'Bearer tok_int')).toBe(true);
  });

  it('answers no surface for a project with no successful deployment', async () => {
    answerProjects();
    answer('GET', '/v1/projects/prj_permit/deployments', { deployments: [rolledBack] });
    const { status, body } = await read(await integrations.GET(get('/api/dashboard/integrations?projectId=prj_permit')));
    expect(status).toBe(200);
    expect(body.selectedProjectId).toBe('prj_permit');
    expect(body.surface).toBeNull();
    expect(calls.some((call) => call.path.startsWith('/v1/deployments/'))).toBe(false);
  });

  it('reads the head description and says so when the installed version is older than the list', async () => {
    answerProjects();
    answer('GET', '/v1/projects/prj_land/deployments', { deployments: [liveDeployment] });
    answer('GET', '/v1/deployments/dep_live', liveDeployment);
    answer('GET', '/projects/prj_land/blueprint/versions?limit=50', { versions: [blueprint('prj_land', {})] });
    answer('GET', '/projects/prj_land/interface-description', { version: 6, description });
    const { status, body } = await read(await integrations.GET(get('/api/dashboard/integrations')));
    expect(status).toBe(200);
    expect(body.surface.descriptionVersion).toBe(6);
    expect(body.surface.descriptionMatchesDeployment).toBe(false);
  });

  it('answers an empty project list and no surface when the account holds none', async () => {
    answer('GET', '/health/ready', health);
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', { projects: [] });
    const { status, body } = await read(await integrations.GET(get('/api/dashboard/integrations')));
    expect(status).toBe(200);
    expect(body.projects).toEqual([]);
    expect(body.selectedProjectId).toBeNull();
    expect(body.surface).toBeNull();
  });
});
