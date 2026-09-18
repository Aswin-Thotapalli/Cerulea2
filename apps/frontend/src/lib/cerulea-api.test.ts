import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  CERULEA_API_FALLBACK_URL,
  blueprintHash,
  canonicalJson,
  ceruleaApiBaseUrl,
  createDeployment,
  fetchDeployment,
  isDeploymentSettled,
  readDeployment,
  rollbackDeployment,
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
    expect(ceruleaApiBaseUrl('https://apis.cerulea.test/')).toBe('https://apis.cerulea.test');
  });
});

describe('createDeployment', () => {
  it('posts the project and the Blueprint address to the deployments route', async () => {
    const { impl, calls } = jsonFetch([{ body: { deploymentId: 'dep-7' } }]);
    const result = await createDeployment(
      { projectId: 'p-1', blueprintHash: 'abc' },
      { baseUrl: 'https://apis.cerulea.test', fetchImpl: impl },
    );
    expect(result).toEqual({ deploymentId: 'dep-7' });
    expect(calls[0].url).toBe('https://apis.cerulea.test/v1/deployments');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ projectId: 'p-1', blueprintHash: 'abc' });
  });

  it('names the fix when Cerulea APIs sends no identifier', async () => {
    const { impl } = jsonFetch([{ body: {} }]);
    await expect(
      createDeployment({ projectId: 'p-1', blueprintHash: 'abc' }, { fetchImpl: impl }),
    ).rejects.toThrowError(/deploymentId/);
  });

  it('raises the message Cerulea APIs returned', async () => {
    const { impl } = jsonFetch([{ status: 409, body: { message: 'The Blueprint address does not match.' } }]);
    await expect(
      createDeployment({ projectId: 'p-1', blueprintHash: 'abc' }, { fetchImpl: impl }),
    ).rejects.toThrowError('The Blueprint address does not match.');
  });

  it('names the fix when Cerulea APIs does not answer', async () => {
    const impl = (() => Promise.reject(new Error('connect refused'))) as unknown as typeof fetch;
    await expect(
      createDeployment({ projectId: 'p-1', blueprintHash: 'abc' }, { baseUrl: 'http://localhost:4000', fetchImpl: impl }),
    ).rejects.toThrowError(/NEXT_PUBLIC_CERULEA_API_URL/);
  });
});

describe('fetchDeployment', () => {
  it('returns the stage list Cerulea APIs reported and adds nothing', async () => {
    const { impl, calls } = jsonFetch([
      { body: { id: 'dep-7', status: 'running', stages: stageList, record: { blocks: 3 } } },
    ]);
    const deployment = await fetchDeployment('dep-7', { baseUrl: 'http://apis.test', fetchImpl: impl });
    expect(calls[0].url).toBe('http://apis.test/v1/deployments/dep-7');
    expect(deployment.stages).toHaveLength(2);
    expect(deployment.stages[0].name).toBe('Check the Blueprint');
    expect(deployment.stages[1].endedAt).toBeNull();
    expect(deployment.record).toEqual({ blocks: 3 });
  });

  it('reports an empty stage list when Cerulea APIs sent none', () => {
    expect(readDeployment({ id: 'dep-7', status: 'queued' }).stages).toEqual([]);
  });

  it('names the fix when a stage carries no name', () => {
    expect(() => readDeployment({ id: 'dep-7', status: 'running', stages: [{ status: 'running' }] }))
      .toThrowError(/position 1/);
  });
});

describe('rollbackDeployment', () => {
  it('posts to the rollback route for that deployment', async () => {
    const { impl, calls } = jsonFetch([
      { body: { id: 'dep-7', status: 'rolled_back', stages: [], record: null } },
    ]);
    const deployment = await rollbackDeployment('dep-7', { baseUrl: 'http://apis.test', fetchImpl: impl });
    expect(calls[0].url).toBe('http://apis.test/v1/deployments/dep-7/rollback');
    expect(calls[0].init.method).toBe('POST');
    expect(deployment?.status).toBe('rolled_back');
  });
});

describe('watchDeployment', () => {
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
        { baseUrl: 'http://apis.test', fetchImpl: impl },
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
        { fetchImpl: impl },
      );
    });
    expect(error.message).toMatch(/Start Cerulea APIs/);
  });
});

describe('isDeploymentSettled', () => {
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
