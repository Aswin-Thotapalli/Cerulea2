import { describe, expect, it } from 'vitest';

import { projectsWithBlueprints } from './project-blueprints';

type Call = { url: string; method: string; body: unknown };

const base = 'https://apis.cerulea.test';

function project(projectId: string, workspaceId: string, updatedAt: string) {
  return { projectId, workspaceId, name: projectId, updatedAt };
}

/** Answers Cerulea APIs routes by address and method, and records every call. */
function recorder(routes: Record<string, unknown>) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = url.slice(base.length);
    calls.push({ url: path, method, body: init.body === undefined ? undefined : JSON.parse(String(init.body)) });
    const body = routes[`${method} ${path}`];
    return new Response(JSON.stringify(body ?? {}), {
      status: body === undefined ? 404 : 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('projectsWithBlueprints', () => {
  it('reads every project in every workspace with its head Blueprint, newest first', async () => {
    const { impl, calls } = recorder({
      'GET /workspaces': {
        workspaces: [
          { workspaceId: 'ws-1', name: 'Harbour' },
          { workspaceId: 'ws-2', name: 'Customs' },
        ],
      },
      'GET /workspaces/ws-1/projects': {
        projects: [project('p-old', 'ws-1', '2026-09-01T00:00:00Z'), project('p-new', 'ws-1', '2026-09-20T00:00:00Z')],
      },
      'GET /workspaces/ws-2/projects': { projects: [project('p-mid', 'ws-2', '2026-09-10T00:00:00Z')] },
      'GET /projects/p-old/blueprint': { version: 1, blueprintHash: 'h-old', document: { name: 'Old' } },
      'GET /projects/p-new/blueprint': { version: 7, blueprintHash: 'h-new', document: { name: 'New' } },
      'GET /projects/p-mid/blueprint': { version: 3, blueprintHash: 'h-mid', document: { name: 'Mid' } },
    });
    const result = await projectsWithBlueprints('Harbour Clerk', { baseUrl: base, fetchImpl: impl });
    expect(result.workspaces.map((entry) => entry.workspaceId)).toEqual(['ws-1', 'ws-2']);
    expect(
      result.entries.map((entry) => [
        entry.project.projectId,
        entry.workspace.workspaceId,
        entry.version,
        entry.blueprintHash,
        entry.document,
      ]),
    ).toEqual([
      ['p-new', 'ws-1', 7, 'h-new', { name: 'New' }],
      ['p-mid', 'ws-2', 3, 'h-mid', { name: 'Mid' }],
      ['p-old', 'ws-1', 1, 'h-old', { name: 'Old' }],
    ]);
    expect(calls.map((call) => call.url)).toEqual([
      '/workspaces',
      '/workspaces/ws-1/projects',
      '/projects/p-old/blueprint',
      '/projects/p-new/blueprint',
      '/workspaces/ws-2/projects',
      '/projects/p-mid/blueprint',
    ]);
  });

  it('opens the first workspace for an account holding none and answers with no entries', async () => {
    const { impl, calls } = recorder({
      'GET /workspaces': { workspaces: [] },
      'POST /workspaces': { workspace: { workspaceId: 'ws-9', name: 'Harbour Clerk workspace' } },
      'GET /workspaces/ws-9/projects': { projects: [] },
    });
    const result = await projectsWithBlueprints(' Harbour Clerk ', { baseUrl: base, fetchImpl: impl });
    expect(result).toEqual({
      workspaces: [{ workspaceId: 'ws-9', name: 'Harbour Clerk workspace' }],
      entries: [],
    });
    expect(calls[1]).toEqual({ url: '/workspaces', method: 'POST', body: { name: 'Harbour Clerk workspace' } });
  });
});
