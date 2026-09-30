import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StudioRouteError } from '@/lib/apiClient';
import type { Blueprint } from '@/lib/blueprint/types';

import {
  describeSaveFailure,
  readProjectState,
  useProjectState,
  writeBlueprint,
  writeBuildState,
  type BuildState,
} from './project-state';

type Call = { url: string; method: string; body: unknown };

type Reply = { status?: number; body: unknown };

function json(reply: Reply): Response {
  return new Response(JSON.stringify(reply.body), {
    status: reply.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

const buildState = {
  version: 1,
  disclosureLevel: 2,
  wizardComplete: false,
  wizardCompletedAt: '',
} as unknown as BuildState;

const project = { projectId: 'p 1', name: 'Berth register', summary: 'Berths.', state: 'draft', headVersion: 4 };

/** Answers each route by address and method, and records every call. */
function stubRoutes(routes: Record<string, Reply | (() => Reply)>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      calls.push({ url, method, body: init.body === undefined ? undefined : JSON.parse(String(init.body)) });
      const held = routes[`${method} ${url}`];
      if (held === undefined) return json({ status: 404, body: {} });
      return json(typeof held === 'function' ? held() : held);
    }),
  );
  return calls;
}

function readRoutes(): Record<string, Reply> {
  return {
    'GET /api/projects/p%201': { body: { project } },
    'GET /api/projects/p%201/blueprint': { body: { version: 4, document: { name: 'Berth register', types: [] } } },
    'GET /api/projects/p%201/build-state': { body: { buildState } },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('describeSaveFailure', () => {
  it('splits a route failure into its message and its fix', () => {
    const failure = new StudioRouteError(
      { code: 'blueprint.stale', message: 'Another save landed first.', fix: 'Read the project again.', details: {} },
      409,
    );
    expect(describeSaveFailure(failure)).toEqual({
      message: 'Another save landed first.',
      fix: 'Read the project again.',
    });
  });

  it('keeps the message of any other error and names the general fix', () => {
    expect(describeSaveFailure(new Error('Network down.'))).toEqual({
      message: 'Network down.',
      fix: 'Save again. Report the problem to the Cerulea operator when it repeats.',
    });
    expect(describeSaveFailure('plain words').message).toBe('plain words');
  });
});

describe('reading and writing through the Studio routes', () => {
  it('reads the project, the Blueprint and the build state together', async () => {
    const calls = stubRoutes(readRoutes());
    const state = await readProjectState('p 1');
    expect(calls.map((call) => call.url).sort()).toEqual([
      '/api/projects/p%201',
      '/api/projects/p%201/blueprint',
      '/api/projects/p%201/build-state',
    ]);
    expect(state.projectId).toBe('p 1');
    expect(state.project).toEqual(project);
    expect(state.blueprintVersion).toBe(4);
    expect(state.blueprint.name).toBe('Berth register');
    expect(state.buildState).toEqual(buildState);
  });

  it('puts the Blueprint with the note and the version it expects', async () => {
    const calls = stubRoutes({ 'PUT /api/projects/p%201/blueprint': { body: { blueprint: { version: 5 } } } });
    const document = { name: 'Berth register' } as unknown as Blueprint;
    await expect(writeBlueprint('p 1', document, 'Added a role.', 4)).resolves.toBe(5);
    expect(calls[0]).toEqual({
      url: '/api/projects/p%201/blueprint',
      method: 'PUT',
      body: { document: { name: 'Berth register' }, note: 'Added a role.', expectedVersion: 4 },
    });
  });

  it('puts the build state and answers with the held copy', async () => {
    const held = { ...buildState, disclosureLevel: 3 };
    const calls = stubRoutes({ 'PUT /api/projects/p%201/build-state': { body: { buildState: held } } });
    await expect(writeBuildState('p 1', buildState)).resolves.toEqual(held);
    expect(calls[0].body).toEqual({ buildState });
  });
});

describe('useProjectState', () => {
  it('reads once on open and saves the Blueprint with the version it read', async () => {
    const calls = stubRoutes({
      ...readRoutes(),
      'PUT /api/projects/p%201/blueprint': { body: { blueprint: { version: 5 } } },
    });
    const { result } = renderHook(() => useProjectState('p 1'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state?.blueprintVersion).toBe(4);
    expect(result.current.failure).toBeNull();

    const next = { ...result.current.state!.blueprint, name: 'Dock register' };
    let saved = false;
    await act(async () => {
      saved = await result.current.saveBlueprint(next, 'Renamed.');
    });
    expect(saved).toBe(true);
    expect(calls.at(-1)?.body).toEqual({ document: next, note: 'Renamed.', expectedVersion: 4 });
    expect(result.current.state?.blueprintVersion).toBe(5);
    expect(result.current.state?.blueprint.name).toBe('Dock register');
    expect(result.current.savedAt).not.toBeNull();
    expect(result.current.saving).toBe(false);
  }, 30000);

  it('saves the build state and keeps the copy the route answered with', async () => {
    const held = { ...buildState, disclosureLevel: 4 };
    stubRoutes({
      ...readRoutes(),
      'PUT /api/projects/p%201/build-state': { body: { buildState: held } },
    });
    const { result } = renderHook(() => useProjectState('p 1'));
    await waitFor(() => expect(result.current.state).not.toBeNull());
    let saved = false;
    await act(async () => {
      saved = await result.current.saveBuildState({ ...buildState, disclosureLevel: 3 });
    });
    expect(saved).toBe(true);
    expect(result.current.state?.buildState).toEqual(held);
  }, 30000);

  it('refuses to save before the project is read', async () => {
    const calls = stubRoutes({});
    const { result } = renderHook(() => useProjectState('p 1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const count = calls.length;
    let outcome: boolean[] = [];
    await act(async () => {
      outcome = [
        await result.current.saveBlueprint({} as Blueprint, 'note'),
        await result.current.saveBuildState(buildState),
      ];
    });
    expect(outcome).toEqual([false, false]);
    expect(calls).toHaveLength(count);
  }, 30000);

  it('shows the fix a failed read named and clears it on a later good read', async () => {
    let fail = true;
    const routes = readRoutes();
    stubRoutes({
      ...routes,
      'GET /api/projects/p%201': () =>
        fail
          ? { status: 404, body: { error: { message: 'Cerulea holds no such project.', fix: 'Open the project list.' } } }
          : routes['GET /api/projects/p%201'],
    });
    const { result } = renderHook(() => useProjectState('p 1'));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
    expect(result.current.failure).toEqual({
      message: 'Cerulea holds no such project.',
      fix: 'Open the project list.',
    });
    expect(result.current.state).toBeNull();

    fail = false;
    act(() => result.current.readAgain());
    await waitFor(() => expect(result.current.state).not.toBeNull());
    expect(result.current.failure).toBeNull();
  }, 30000);

  it('reports a failed save of either kind with its fix', async () => {
    stubRoutes({
      ...readRoutes(),
      'PUT /api/projects/p%201/blueprint': {
        status: 409,
        body: { error: { message: 'Another save landed first.', fix: 'Read the project again.' } },
      },
      'PUT /api/projects/p%201/build-state': { status: 500, body: {} },
    });
    const { result } = renderHook(() => useProjectState('p 1'));
    await waitFor(() => expect(result.current.state).not.toBeNull());

    let saved = true;
    await act(async () => {
      saved = await result.current.saveBlueprint(result.current.state!.blueprint, 'note');
    });
    expect(saved).toBe(false);
    expect(result.current.failure).toEqual({
      message: 'Another save landed first.',
      fix: 'Read the project again.',
    });
    expect(result.current.state?.blueprintVersion).toBe(4);

    await act(async () => {
      saved = await result.current.saveBuildState(buildState);
    });
    expect(saved).toBe(false);
    expect(result.current.failure).toEqual({
      message: 'Studio answered 500 for /api/projects/p%201/build-state.',
      fix: 'Open the screen again. Report the problem to the Cerulea operator when it repeats.',
    });
    expect(result.current.saving).toBe(false);
    expect(result.current.savedAt).toBeNull();
  }, 30000);
});
