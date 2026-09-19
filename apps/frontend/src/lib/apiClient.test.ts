import { afterEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from './apiClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return calls;
}

describe('the Studio route client', () => {
  it('exports no call to a route Cerulea never served', () => {
    const names = Object.keys(apiClient);
    expect(names).not.toContain('getApps');
    expect(names).not.toContain('createApp');
    expect(names).not.toContain('getDeployments');
    expect(names).not.toContain('getDraft');
    expect(names).not.toContain('upsertDraft');
  });

  it('names every route it does call', () => {
    expect(Object.keys(apiClient).sort()).toEqual([
      'StudioRouteError',
      'api',
      'readProjectBlueprint',
      'writeProjectBlueprint',
    ]);
  });

  it('reads the Blueprint of one project', async () => {
    const calls = stubFetch(200, { version: 3, document: { name: 'Trace' } });
    const record = await apiClient.readProjectBlueprint('p-1');
    expect(calls[0].url).toBe('/api/projects/p-1/blueprint');
    expect(record.version).toBe(3);
  });

  it('reads one earlier Blueprint version when the caller names it', async () => {
    const calls = stubFetch(200, { version: 2, document: {} });
    await apiClient.readProjectBlueprint('p-1', 2);
    expect(calls[0].url).toBe('/api/projects/p-1/blueprint?version=2');
  });

  it('saves the Blueprint with the version the caller expects', async () => {
    const calls = stubFetch(200, { blueprint: { version: 4 }, created: true });
    await apiClient.writeProjectBlueprint({
      projectId: 'p-1',
      document: { name: 'Trace' },
      note: 'Added the shipment collection',
      expectedVersion: 3,
    });
    expect(calls[0].url).toBe('/api/projects/p-1/blueprint');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      document: { name: 'Trace' },
      note: 'Added the shipment collection',
      expectedVersion: 3,
    });
  });

  it('raises the message and the fix the route returned', async () => {
    stubFetch(409, {
      error: {
        code: 'blueprint.version_moved',
        message: 'Another person saved this Blueprint first.',
        fix: 'Read the newest version, apply the change again and save.',
        details: {},
      },
    });
    await expect(apiClient.readProjectBlueprint('p-1')).rejects.toThrowError(
      /Read the newest version/,
    );
  });

  it('names a fix even when the answer carries no failure shape', async () => {
    stubFetch(500, { unexpected: true });
    await expect(apiClient.readProjectBlueprint('p-1')).rejects.toThrowError(/Cerulea operator/);
  });
});
