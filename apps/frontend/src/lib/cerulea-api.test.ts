import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  CERULEA_API_FALLBACK_URL,
  CERULEA_STUDIO_DEVICE,
  CeruleaApiError,
  blueprintHash,
  canonicalJson,
  ceruleaApiBaseUrl,
  compileProject,
  createDeployment,
  createProject,
  fetchDeployment,
  isDeploymentSettled,
  listDeployments,
  listProjects,
  listWorkspaces,
  readBlueprint,
  readChainStatus,
  readDeployment,
  refreshSession,
  rollbackDeployment,
  saveBlueprint,
  signIn,
  watchDeployment,
} from './cerulea-api';

type Call = { url: string; init: RequestInit };

function jsonFetch(replies: Array<{ status?: number; body: unknown }>) {
  const calls: Call[] = [];
  let index = 0;
  const impl = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const base = 'https://apis.cerulea.test';

const stageList = [
  {
    name: 'Check the Blueprint',
    status: 'succeeded',
    startedAt: '2026-09-19T04:00:00.000Z',
    endedAt: '2026-09-19T04:00:04.000Z',
    outcome: 'Twelve sections read.',
  },
  {
    name: 'Install the Blueprint',
    status: 'running',
    startedAt: '2026-09-19T04:00:04.000Z',
    endedAt: null,
    outcome: null,
  },
];

describe('ceruleaApiBaseUrl', () => {
  it('serves a local run when the environment names no address', () => {
    expect(ceruleaApiBaseUrl('')).toBe(CERULEA_API_FALLBACK_URL);
  });

  it('uses the named address and drops a trailing slash', () => {
    expect(ceruleaApiBaseUrl('https://apis.cerulea.test/')).toBe(base);
  });
});

describe('every call', () => {
  it('carries the access token and the device the session was bound to', async () => {
    const { impl, calls } = jsonFetch([{ body: { workspaces: [] } }]);
    await listWorkspaces({ baseUrl: base, fetchImpl: impl, accessToken: 'tok-1' });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer tok-1');
    expect(headers['x-cerulea-device']).toBe(CERULEA_STUDIO_DEVICE);
  });

  it('raises the code, the message and the fix Cerulea APIs named', async () => {
    const { impl } = jsonFetch([
      {
        status: 403,
        body: {
          error: {
            code: 'workspaces.capability_absent',
            message: 'The viewer role holds no write blueprint capability.',
            fix: 'Ask a workspace administrator for the builder role.',
            details: { role: 'viewer' },
          },
        },
      },
    ]);
    const failure = await listWorkspaces({ baseUrl: base, fetchImpl: impl }).catch(
      (cause: unknown) => cause,
    );
    expect(failure).toBeInstanceOf(CeruleaApiError);
    const named = failure as CeruleaApiError;
    expect(named.code).toBe('workspaces.capability_absent');
    expect(named.status).toBe(403);
    expect(named.fix).toMatch(/builder role/);
    expect(named.details).toEqual({ role: 'viewer' });
  });

  it('names the fix when Cerulea APIs does not answer', async () => {
    const impl = (() => Promise.reject(new Error('connect refused'))) as unknown as typeof fetch;
    await expect(listWorkspaces({ baseUrl: base, fetchImpl: impl })).rejects.toThrowError(
      /Start Cerulea APIs/,
    );
  });
});

describe('accounts and sessions', () => {
  it('signs in with the password and the second factor', async () => {
    const { impl, calls } = jsonFetch([
      { status: 201, body: { account: { accountId: 'acc-1' }, session: { accessToken: 'a' } } },
    ]);
    await signIn(
      { email: 'person@cerulea.test', password: 'a long password', multiFactorCode: '123456' },
      { baseUrl: base, fetchImpl: impl },
    );
    expect(calls[0].url).toBe(`${base}/sessions`);
    expect(JSON.parse(String(calls[0].init.body)).multiFactorCode).toBe('123456');
  });

  it('rotates the pair through the refresh route', async () => {
    const { impl, calls } = jsonFetch([
      { body: { account: { accountId: 'acc-1' }, session: { accessToken: 'b' } } },
    ]);
    await refreshSession('refresh-1', { baseUrl: base, fetchImpl: impl });
    expect(calls[0].url).toBe(`${base}/sessions/refresh`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ refreshToken: 'refresh-1' });
  });
});

describe('workspaces, projects and the Blueprint', () => {
  it('lists the projects inside one workspace', async () => {
    const { impl, calls } = jsonFetch([{ body: { projects: [] } }]);
    await listProjects('ws-1', { baseUrl: base, fetchImpl: impl });
    expect(calls[0].url).toBe(`${base}/workspaces/ws-1/projects`);
  });

  it('opens a project inside the named workspace', async () => {
    const { impl, calls } = jsonFetch([{ status: 201, body: { project: {}, blueprint: {} } }]);
    await createProject('ws-1', { name: 'Trace' }, { baseUrl: base, fetchImpl: impl });
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ name: 'Trace', summary: undefined });
  });

  it('reads one earlier Blueprint version when the caller names it', async () => {
    const { impl, calls } = jsonFetch([{ body: { version: 2, document: {} } }]);
    await readBlueprint('p-1', { version: 2 }, { baseUrl: base, fetchImpl: impl });
    expect(calls[0].url).toBe(`${base}/projects/p-1/blueprint?version=2`);
  });

  it('saves the Blueprint with the version the caller expects', async () => {
    const { impl, calls } = jsonFetch([{ body: { blueprint: { version: 3 }, created: true } }]);
    await saveBlueprint(
      'p-1',
      { document: { name: 'Trace' }, expectedVersion: 2 },
      { baseUrl: base, fetchImpl: impl },
    );
    expect(calls[0].init.method).toBe('PUT');
    expect(JSON.parse(String(calls[0].init.body)).expectedVersion).toBe(2);
  });
});

describe('the compiler', () => {
  it('reads the report when the Blueprint still holds corrections', async () => {
    const { impl } = jsonFetch([
      {
        status: 422,
        body: {
          ok: false,
          reachedStage: 'validate',
          report: { errorCount: 2, headline: 'Two corrections remain.' },
        },
      },
    ]);
    const run = await compileProject('p-1', undefined, { baseUrl: base, fetchImpl: impl });
    expect(run.ok).toBe(false);
    expect(run.report.errorCount).toBe(2);
  });
});

describe('the Blockchain', () => {
  it('reads the agreement state through the chain route', async () => {
    const { impl, calls } = jsonFetch([
      {
        body: {
          chainName: 'Cerulea local',
          kind: 'local',
          status: { currentEpoch: 1, activeValidators: 3 },
          health: { isHealthy: true, issues: [] },
        },
      },
    ]);
    const status = await readChainStatus({ baseUrl: base, fetchImpl: impl });
    expect(calls[0].url).toBe(`${base}/chain/status`);
    expect(status.health.isHealthy).toBe(true);
  });
});

describe('deployments', () => {
  it('posts the project and the Blueprint address to the deployments route', async () => {
    const { impl, calls } = jsonFetch([{ body: { deploymentId: 'dep-7' } }]);
    const result = await createDeployment(
      { projectId: 'p-1', blueprintHash: 'abc' },
      { baseUrl: base, fetchImpl: impl },
    );
    expect(result).toEqual({ deploymentId: 'dep-7' });
    expect(calls[0].url).toBe(`${base}/v1/deployments`);
  });

  it('names the fix when Cerulea APIs sends no identifier', async () => {
    const { impl } = jsonFetch([{ body: {} }]);
    await expect(
      createDeployment({ projectId: 'p-1', blueprintHash: 'abc' }, { baseUrl: base, fetchImpl: impl }),
    ).rejects.toThrowError(/deploymentId/);
  });

  it('returns the stage list Cerulea APIs reported and adds nothing', async () => {
    const { impl, calls } = jsonFetch([
      { body: { id: 'dep-7', status: 'running', stages: stageList, record: { blocks: 3 } } },
    ]);
    const deployment = await fetchDeployment('dep-7', { baseUrl: base, fetchImpl: impl });
    expect(calls[0].url).toBe(`${base}/v1/deployments/dep-7`);
    expect(deployment.stages).toHaveLength(2);
    expect(deployment.stages[1].endedAt).toBeNull();
    expect(deployment.record).toEqual({ blocks: 3 });
  });

  it('reports an empty stage list when Cerulea APIs sent none', () => {
    expect(readDeployment({ id: 'dep-7', status: 'queued' }).stages).toEqual([]);
  });

  it('names the fix when a stage carries no name', () => {
    expect(() =>
      readDeployment({ id: 'dep-7', status: 'running', stages: [{ status: 'running' }] }),
    ).toThrowError(/position 1/);
  });

  it('posts to the rollback route for that deployment', async () => {
    const { impl, calls } = jsonFetch([
      { body: { id: 'dep-7', status: 'rolled_back', stages: [], record: null } },
    ]);
    const deployment = await rollbackDeployment('dep-7', 'The check failed', {
      baseUrl: base,
      fetchImpl: impl,
    });
    expect(calls[0].url).toBe(`${base}/v1/deployments/dep-7/rollback`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ reason: 'The check failed' });
    expect(deployment?.status).toBe('rolled_back');
  });

  it('lists every deployment of one project', async () => {
    const { impl, calls } = jsonFetch([
      { body: { deployments: [{ id: 'dep-7', status: 'succeeded', stages: [], record: null }] } },
    ]);
    const list = await listDeployments('p-1', { baseUrl: base, fetchImpl: impl });
    expect(calls[0].url).toBe(`${base}/v1/projects/p-1/deployments`);
    expect(list).toHaveLength(1);
  });

  it('follows a deployment until it settles', async () => {
    const { impl } = jsonFetch([
      { body: { id: 'dep-7', status: 'running', stages: stageList, record: null } },
      { body: { id: 'dep-7', status: 'succeeded', stages: stageList, record: { endpoint: 'local' } } },
    ]);
    const seen: string[] = [];
    await new Promise<void>((resolve, reject) => {
      watchDeployment(
        'dep-7',
        {
          intervalMs: 1,
          onUpdate: (deployment) => {
            seen.push(deployment.status);
            if (deployment.status === 'succeeded') resolve();
          },
          onError: reject,
        },
        { baseUrl: base, fetchImpl: impl },
      );
    });
    expect(seen).toEqual(['running', 'succeeded']);
  });

  it('stops after the first failure and names the fix', async () => {
    const impl = (() => Promise.reject(new Error('connect refused'))) as unknown as typeof fetch;
    const error = await new Promise<Error>((resolve) => {
      watchDeployment(
        'dep-7',
        { intervalMs: 1, onUpdate: () => undefined, onError: resolve },
        { baseUrl: base, fetchImpl: impl },
      );
    });
    expect(error.message).toMatch(/Start Cerulea APIs/);
  });

  it('treats success, failure and rollback as settled', () => {
    expect(isDeploymentSettled('succeeded')).toBe(true);
    expect(isDeploymentSettled('failed')).toBe(true);
    expect(isDeploymentSettled('rolled_back')).toBe(true);
    expect(isDeploymentSettled('running')).toBe(false);
    expect(isDeploymentSettled('queued')).toBe(false);
  });
});

describe('the Blueprint address', () => {
  it('orders keys, so two equal Blueprints produce one text', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 4, c: 3 }] })).toBe('{"a":[2,{"c":3,"d":4}],"b":1}');
  });

  it('produces the same address for the same Blueprint written in another key order', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const first = await blueprintHash({ types: ['Shipment'], name: 'Trace' });
    const second = await blueprintHash({ name: 'Trace', types: ['Shipment'] });
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    vi.unstubAllGlobals();
  });
});
