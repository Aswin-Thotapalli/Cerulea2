import { describe, expect, it, vi } from 'vitest';

import { readDeploymentView, startProjectDeployment } from './reads';

const rawDeployment = {
  id: 'dep_01',
  status: 'failed',
  projectId: 'prj_1',
  workspaceId: 'wsp_1',
  blueprintHash: 'abc123',
  target: 'local',
  startedAt: '2026-10-04T08:00:00.000Z',
  endedAt: '2026-10-04T08:00:20.000Z',
  rolledBackAt: '2026-10-04T08:00:20.000Z',
  failureReason: 'Stage three found no block after 30 seconds.',
  record: null,
  stages: [
    { number: 3, name: 'start', status: 'failed', startedAt: '2026-10-04T08:00:10.000Z', endedAt: '2026-10-04T08:00:20.000Z', outcome: 'No block after 30 seconds. Cerulea stopped the processes.', detail: { peers: 0 } },
    { number: 1, name: 'verify', status: 'skipped', startedAt: '2026-10-04T08:00:00.000Z', endedAt: '2026-10-04T08:00:03.000Z', outcome: 'Cerulea removed the compiler artefacts.', detail: {} },
    { number: 2, name: 'provision', status: 'skipped', startedAt: '2026-10-04T08:00:03.000Z', endedAt: '2026-10-04T08:00:10.000Z', outcome: 'Cerulea removed the storage.', detail: null },
    { number: 4, name: 'install', status: 'skipped', startedAt: null, endedAt: null, outcome: 'Cerulea stopped before this stage, so the stage created nothing.', detail: {} },
  ],
};

describe('readDeploymentView', () => {
  it('keeps the failure reason, the instants and the stage detail, in stage order', () => {
    const held = readDeploymentView(rawDeployment);
    expect(held.failureReason).toBe('Stage three found no block after 30 seconds.');
    expect(held.rolledBackAt).toBe('2026-10-04T08:00:20.000Z');
    expect(held.target).toBe('local');
    expect(held.stages.map((stage) => stage.number)).toEqual([1, 2, 3, 4]);
    expect(held.stages[2].detail).toEqual({ peers: 0 });
    expect(held.stages[1].detail).toBeNull();
  });

  it('refuses a payload without an identifier', () => {
    expect(() => readDeploymentView({ status: 'queued' })).toThrow(/no identifier/);
  });
});

function apiDouble(answers: (path: string, init: RequestInit) => unknown) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const fetchImpl = vi.fn(async (address: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(address)).pathname;
    const method = init?.method ?? 'GET';
    calls.push({ path, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify(answers(path, init ?? {})), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

const version = { blueprintId: 'bp', projectId: 'prj_1', version: 7, blueprintHash: 'hash-7', schemaVersion: '1.0.0', note: '', createdByAccountId: 'acc', createdAt: '', document: { name: 'AgroTrace', interface: null } };

describe('startProjectDeployment', () => {
  it('runs the accessibility gate first and refuses a blocked application', async () => {
    const double = apiDouble((path) => {
      if (path === '/projects/prj_1/blueprint') return version;
      if (path === '/engine/interface') return { section: { screens: [] }, omissions: [], faults: [] };
      if (path === '/engine/accessibility') return { passes: false, headline: 'Two screens fail.', findings: [{}, {}], publication: { blocked: true, message: 'Publication waits on two screens.', fix: 'Label the two inputs.' } };
      throw new Error(`unexpected ${path}`);
    });
    await expect(startProjectDeployment('prj_1', { fetchImpl: double.fetchImpl, accessToken: 't' })).rejects.toMatchObject({
      code: 'deployment.publication_blocked',
      status: 409,
      fix: 'Label the two inputs.',
    });
    expect(double.calls.some((call) => call.path === '/v1/deployments')).toBe(false);
  });

  it('starts the deployment with the content address of the head Blueprint and reads it back', async () => {
    const double = apiDouble((path, init) => {
      if (path === '/projects/prj_1/blueprint') return version;
      if (path === '/engine/interface') return { section: { screens: [] }, omissions: [], faults: [] };
      if (path === '/engine/accessibility') return { passes: true, headline: 'Every screen passes.', findings: [] };
      if (path === '/v1/deployments' && init.method === 'POST') return { ...rawDeployment, id: 'dep_02', status: 'queued', deploymentId: 'dep_02', failureReason: null };
      if (path === '/v1/deployments/dep_02') return { ...rawDeployment, id: 'dep_02', status: 'running', failureReason: null };
      throw new Error(`unexpected ${path}`);
    });
    const held = await startProjectDeployment('prj_1', { fetchImpl: double.fetchImpl, accessToken: 't' });
    expect(held.id).toBe('dep_02');
    expect(held.status).toBe('running');
    const start = double.calls.find((call) => call.path === '/v1/deployments');
    expect(start?.body).toEqual({ projectId: 'prj_1', blueprintHash: 'hash-7' });
  });
});
