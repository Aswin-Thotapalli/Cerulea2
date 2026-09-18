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
  });

  it('names every route it does call', () => {
    expect(Object.keys(apiClient).sort()).toEqual(['api', 'getDraft', 'upsertDraft']);
  });

  it('sends the project and the bucket when it reads a draft', async () => {
    const calls = stubFetch(200, { ok: true, data: { entities: [] }, updatedAt: 7 });
    const record = await apiClient.getDraft('p-1', 'schema');
    expect(calls[0].url).toBe('/api/drafts?projectId=p-1&bucket=schema');
    expect(record.updatedAt).toBe(7);
  });

  it('sends the project and the bucket when it writes a draft', async () => {
    const calls = stubFetch(200, { ok: true, updatedAt: 9 });
    await apiClient.upsertDraft({ projectId: 'p-1', bucket: 'schema', data: { entities: [] } });
    expect(calls[0].url).toBe('/api/drafts');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      projectId: 'p-1',
      bucket: 'schema',
      data: { entities: [] },
    });
  });

  it('raises the message the route returned, so the caller can name the fix', async () => {
    stubFetch(400, { error: 'projectId and bucket are required' });
    await expect(apiClient.getDraft('', '')).rejects.toThrowError('projectId and bucket are required');
  });
});
