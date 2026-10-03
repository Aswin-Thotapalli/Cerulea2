import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CERULEA_API_FALLBACK_URL,
  CeruleaApiError,
  activateMultiFactor,
  applyIntelligencePatch,
  blueprintHash,
  canonicalJson,
  ceruleaApiBaseUrl,
  ceruleaRequest,
  closeCurrentSession,
  closeSession,
  compareBlueprintVersions,
  compileDocument,
  compileProject,
  completeRecovery,
  createCheckpoint,
  createWorkspace,
  discardIntelligencePatch,
  fetchDeployment,
  inviteMember,
  issueAccessKey,
  listAccessKeys,
  listBlueprintVersions,
  listCheckpoints,
  listDeployments,
  listMembers,
  listSessions,
  listWorkspaceRoles,
  readAccount,
  readAdministration,
  readAuditEvents,
  readBuildState,
  readChainBlock,
  readChainHead,
  readChainMeasurement,
  readChainMethods,
  readChainNetwork,
  readChainRecord,
  readChainValidators,
  readDeployment,
  readDeploymentManifest,
  readExecutionSubstrates,
  readInterfaceDescription,
  readIntelligenceThread,
  readPlatformHealth,
  readProject,
  readStudioOverview,
  readWorkspace,
  registerAccount,
  revokeAccessKey,
  rollbackDeployment,
  rotateAccessKey,
  saveBuildState,
  sendIntelligenceMessage,
  startIntelligenceThread,
  startRecovery,
  updateProject,
  watchDeployment,
  type BuildState,
  type CeruleaApiOptions,
} from './cerulea-api';

type Call = { url: string; init: RequestInit };

const base = 'https://apis.cerulea.test';

function recorder(reply: { status?: number; body: unknown; type?: string } = { body: { held: true } }) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const type = reply.type ?? 'application/json';
    const text = type.includes('json') ? JSON.stringify(reply.body) : String(reply.body);
    return new Response(text, { status: reply.status ?? 200, headers: { 'content-type': type } });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const buildState = { version: 1, disclosureLevel: 2 } as unknown as BuildState;

type Route = {
  name: string;
  run: (options: CeruleaApiOptions) => Promise<unknown>;
  path: string;
  method: string;
  body?: unknown;
};

const routes: Route[] = [
  {
    name: 'registerAccount',
    run: (o) => registerAccount({ email: 'a@cerulea.test', displayName: 'A', password: 'long words' }, o),
    path: '/accounts',
    method: 'POST',
    body: { email: 'a@cerulea.test', displayName: 'A', password: 'long words' },
  },
  {
    name: 'activateMultiFactor',
    run: (o) => activateMultiFactor({ email: 'a@cerulea.test', password: 'p', code: '123456' }, o),
    path: '/accounts/multi-factor/activation',
    method: 'POST',
    body: { email: 'a@cerulea.test', password: 'p', code: '123456' },
  },
  { name: 'listSessions', run: (o) => listSessions(o), path: '/sessions', method: 'GET' },
  { name: 'closeCurrentSession', run: (o) => closeCurrentSession(o), path: '/sessions/current', method: 'DELETE' },
  { name: 'closeSession', run: (o) => closeSession('s 1/2', o), path: '/sessions/s%201%2F2', method: 'DELETE' },
  { name: 'readAccount', run: (o) => readAccount(o), path: '/accounts/me', method: 'GET' },
  {
    name: 'startRecovery',
    run: (o) => startRecovery('a@cerulea.test', o),
    path: '/accounts/recovery',
    method: 'POST',
    body: { email: 'a@cerulea.test' },
  },
  {
    name: 'completeRecovery',
    run: (o) => completeRecovery({ token: 'tk', password: 'new words' }, o),
    path: '/accounts/recovery/completion',
    method: 'POST',
    body: { token: 'tk', password: 'new words' },
  },
  {
    name: 'createWorkspace',
    run: (o) => createWorkspace({ name: 'Harbour', application: 'enterprise' }, o),
    path: '/workspaces',
    method: 'POST',
    body: { name: 'Harbour', application: 'enterprise' },
  },
  { name: 'readWorkspace', run: (o) => readWorkspace('ws-1', o), path: '/workspaces/ws-1', method: 'GET' },
  { name: 'listMembers', run: (o) => listMembers('ws-1', o), path: '/workspaces/ws-1/members', method: 'GET' },
  {
    name: 'inviteMember',
    run: (o) => inviteMember('ws-1', { email: 'b@cerulea.test', role: 'builder' }, o),
    path: '/workspaces/ws-1/invitations',
    method: 'POST',
    body: { email: 'b@cerulea.test', role: 'builder' },
  },
  { name: 'listWorkspaceRoles', run: (o) => listWorkspaceRoles(o), path: '/workspaces/roles', method: 'GET' },
  { name: 'readProject', run: (o) => readProject('p-1', o), path: '/projects/p-1', method: 'GET' },
  {
    name: 'updateProject',
    run: (o) => updateProject('p-1', { state: 'archived' }, o),
    path: '/projects/p-1',
    method: 'PATCH',
    body: { state: 'archived' },
  },
  {
    name: 'listBlueprintVersions with a limit',
    run: (o) => listBlueprintVersions('p-1', 5, o),
    path: '/projects/p-1/blueprint/versions?limit=5',
    method: 'GET',
  },
  {
    name: 'listBlueprintVersions with no limit',
    run: (o) => listBlueprintVersions('p-1', undefined, o),
    path: '/projects/p-1/blueprint/versions',
    method: 'GET',
  },
  {
    name: 'compareBlueprintVersions',
    run: (o) => compareBlueprintVersions('p-1', 2, 4, o),
    path: '/projects/p-1/blueprint/comparison?from=2&to=4',
    method: 'GET',
  },
  { name: 'listCheckpoints', run: (o) => listCheckpoints('p-1', o), path: '/projects/p-1/checkpoints', method: 'GET' },
  {
    name: 'createCheckpoint',
    run: (o) => createCheckpoint('p-1', { label: 'Before launch', version: 3 }, o),
    path: '/projects/p-1/checkpoints',
    method: 'POST',
    body: { label: 'Before launch', version: 3 },
  },
  { name: 'readChainHead', run: (o) => readChainHead(o), path: '/chain/head', method: 'GET' },
  { name: 'readChainBlock', run: (o) => readChainBlock(42, o), path: '/chain/blocks/42', method: 'GET' },
  { name: 'readChainValidators', run: (o) => readChainValidators(o), path: '/chain/validators', method: 'GET' },
  { name: 'readChainMethods', run: (o) => readChainMethods(o), path: '/chain/methods', method: 'GET' },
  {
    name: 'readChainRecord',
    run: (o) => readChainRecord('berth log', 'k/1', o),
    path: '/chain/records/berth%20log/k%2F1',
    method: 'GET',
  },
  { name: 'readChainNetwork', run: (o) => readChainNetwork(o), path: '/studio/chain/network', method: 'GET' },
  {
    name: 'readChainMeasurement with a block count',
    run: (o) => readChainMeasurement(20, o),
    path: '/studio/chain/measurement?blocks=20',
    method: 'GET',
  },
  {
    name: 'readChainMeasurement with no block count',
    run: (o) => readChainMeasurement(undefined, o),
    path: '/studio/chain/measurement',
    method: 'GET',
  },
  {
    name: 'compileDocument',
    run: (o) => compileDocument({ name: 'Trace' }, o),
    path: '/compiler/runs',
    method: 'POST',
    body: { document: { name: 'Trace' } },
  },
  {
    name: 'compileProject with a version',
    run: (o) => compileProject('p-1', 3, o),
    path: '/projects/p-1/compiler/runs?version=3',
    method: 'POST',
    body: {},
  },
  {
    name: 'readDeploymentManifest',
    run: (o) => readDeploymentManifest('p-1', { version: 3, view: 'comparison', against: 2 }, o),
    path: '/projects/p-1/deployment-manifest?version=3&view=comparison&against=2',
    method: 'GET',
  },
  {
    name: 'readDeploymentManifest with no selector',
    run: (o) => readDeploymentManifest('p-1', undefined, o),
    path: '/projects/p-1/deployment-manifest',
    method: 'GET',
  },
  {
    name: 'readInterfaceDescription',
    run: (o) => readInterfaceDescription('p-1', 7, o),
    path: '/projects/p-1/interface-description?version=7',
    method: 'GET',
  },
  { name: 'readPlatformHealth', run: (o) => readPlatformHealth(o), path: '/health/ready', method: 'GET' },
  { name: 'readStudioOverview', run: (o) => readStudioOverview(o), path: '/studio/overview', method: 'GET' },
  {
    name: 'readAuditEvents',
    run: (o) => readAuditEvents('ws-1', { action: 'sign in', outcome: '', search: 'a&b', limit: 10, offset: 0 }, o),
    path: '/studio/workspaces/ws-1/audit-events?action=sign%20in&search=a%26b&limit=10&offset=0',
    method: 'GET',
  },
  {
    name: 'readAuditEvents with no selector',
    run: (o) => readAuditEvents('ws-1', undefined, o),
    path: '/studio/workspaces/ws-1/audit-events',
    method: 'GET',
  },
  { name: 'listAccessKeys', run: (o) => listAccessKeys('ws-1', o), path: '/studio/workspaces/ws-1/keys', method: 'GET' },
  {
    name: 'issueAccessKey',
    run: (o) => issueAccessKey('ws-1', { name: 'Feed', scopes: ['read'], requestsPerMinute: 60 }, o),
    path: '/studio/workspaces/ws-1/keys',
    method: 'POST',
    body: { name: 'Feed', scopes: ['read'], requestsPerMinute: 60 },
  },
  {
    name: 'rotateAccessKey',
    run: (o) => rotateAccessKey('ws-1', 'key-9', o),
    path: '/studio/workspaces/ws-1/keys/key-9/rotation',
    method: 'POST',
    body: {},
  },
  {
    name: 'revokeAccessKey',
    run: (o) => revokeAccessKey('ws-1', 'key-9', o),
    path: '/studio/workspaces/ws-1/keys/key-9',
    method: 'DELETE',
  },
  {
    name: 'readBuildState',
    run: (o) => readBuildState('p-1', o),
    path: '/studio/projects/p-1/build-state',
    method: 'GET',
  },
  {
    name: 'saveBuildState',
    run: (o) => saveBuildState('p-1', buildState, o),
    path: '/studio/projects/p-1/build-state',
    method: 'PUT',
    body: { buildState: { version: 1, disclosureLevel: 2 } },
  },
  {
    name: 'readExecutionSubstrates',
    run: (o) => readExecutionSubstrates(o),
    path: '/studio/execution-substrates',
    method: 'GET',
  },
  {
    name: 'startIntelligenceThread',
    run: (o) => startIntelligenceThread('p-1', o),
    path: '/intelligence/threads',
    method: 'POST',
    body: { projectId: 'p-1' },
  },
  {
    name: 'sendIntelligenceMessage',
    run: (o) =>
      sendIntelligenceMessage(
        'th-1',
        { text: 'Add a role', interfaceState: { screen: 'model' } as never },
        o,
      ),
    path: '/intelligence/threads/th-1/messages',
    method: 'POST',
    body: { text: 'Add a role', interfaceState: { screen: 'model' } },
  },
  {
    name: 'readIntelligenceThread',
    run: (o) => readIntelligenceThread('th-1', o),
    path: '/intelligence/threads/th-1',
    method: 'GET',
  },
  {
    name: 'applyIntelligencePatch',
    run: (o) => applyIntelligencePatch('pt-1', o),
    path: '/intelligence/patches/pt-1/apply',
    method: 'POST',
    body: {},
  },
  {
    name: 'discardIntelligencePatch',
    run: (o) => discardIntelligencePatch('pt-1', o),
    path: '/intelligence/patches/pt-1/discard',
    method: 'POST',
    body: {},
  },
  {
    name: 'readAdministration',
    run: (o) => readAdministration('security', o),
    path: '/studio/administration/security',
    method: 'GET',
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('every route sends the right call', () => {
  it.each(routes.map((route) => [route.name, route] as const))(
    '%s',
    async (_name, route) => {
      const { impl, calls } = recorder({ body: { answer: route.name } });
      const answer = await route.run({ baseUrl: base, fetchImpl: impl, accessToken: 'tok-3' });
      expect(answer).toEqual({ answer: route.name });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(`${base}${route.path}`);
      expect(calls[0].init.method).toBe(route.method);
      if (route.body === undefined) {
        expect(calls[0].init.body).toBeUndefined();
      } else {
        expect(JSON.parse(String(calls[0].init.body))).toEqual(route.body);
      }
      expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer tok-3');
    },
  );
});

describe('ceruleaApiBaseUrl', () => {
  it('reads the server address first, then the browser address, then the fallback', () => {
    const held = {
      server: process.env.CERULEA_API_URL,
      browser: process.env.NEXT_PUBLIC_CERULEA_API_URL,
    };
    try {
      process.env.CERULEA_API_URL = ' https://server.cerulea.test/// ';
      process.env.NEXT_PUBLIC_CERULEA_API_URL = 'https://browser.cerulea.test';
      expect(ceruleaApiBaseUrl()).toBe('https://server.cerulea.test');
      delete process.env.CERULEA_API_URL;
      expect(ceruleaApiBaseUrl()).toBe('https://browser.cerulea.test');
      delete process.env.NEXT_PUBLIC_CERULEA_API_URL;
      expect(ceruleaApiBaseUrl()).toBe(CERULEA_API_FALLBACK_URL);
    } finally {
      if (held.server === undefined) delete process.env.CERULEA_API_URL;
      else process.env.CERULEA_API_URL = held.server;
      if (held.browser === undefined) delete process.env.NEXT_PUBLIC_CERULEA_API_URL;
      else process.env.NEXT_PUBLIC_CERULEA_API_URL = held.browser;
    }
  });
});

describe('ceruleaRequest', () => {
  it('uses the global fetch when the caller passes none and keeps caller headers', async () => {
    const { impl, calls } = recorder({ body: { ok: 1 } });
    vi.stubGlobal('fetch', impl);
    const answer = await ceruleaRequest(
      '/x',
      { method: 'GET', headers: { 'x-trace': 't-1' } },
      { baseUrl: base, device: 'Cerulea Dashboard' },
    );
    expect(answer).toEqual({ ok: 1 });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['x-trace']).toBe('t-1');
    expect(headers['x-cerulea-device']).toBe('Cerulea Dashboard');
    expect(headers.authorization).toBeUndefined();
  });

  it('reads a text answer as text', async () => {
    const { impl } = recorder({ body: 'plain words', type: 'text/plain' });
    const answer = await ceruleaRequest('/x', { method: 'GET' }, { baseUrl: base, fetchImpl: impl });
    expect(answer).toBe('plain words');
  });

  it('reads a broken JSON answer as null', async () => {
    const impl = (async () =>
      new Response('{ broken', { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
    const answer = await ceruleaRequest('/x', { method: 'GET' }, { baseUrl: base, fetchImpl: impl });
    expect(answer).toBeNull();
  });

  it('names the address and the status when the failure carries no message', async () => {
    const { impl } = recorder({ status: 500, body: 'boom', type: 'text/plain' });
    const failure = (await ceruleaRequest('/x', { method: 'GET' }, { baseUrl: base, fetchImpl: impl }).catch(
      (cause: unknown) => cause,
    )) as CeruleaApiError;
    expect(failure).toBeInstanceOf(CeruleaApiError);
    expect(failure.name).toBe('CeruleaApiError');
    expect(failure.code).toBe('service.unnamed');
    expect(failure.status).toBe(500);
    expect(failure.message).toBe(
      `Cerulea APIs at ${base} answered 500 for /x. Read the Cerulea APIs log for the reason, then send the request again.`,
    );
    expect(failure.details).toEqual({});
  });

  it('falls back when the error carrier holds no message or is not an object', async () => {
    for (const body of [{ error: { code: 'x.y' } }, { error: 'plain' }, { error: null }]) {
      const { impl } = recorder({ status: 409, body });
      const failure = (await ceruleaRequest('/y', { method: 'GET' }, { baseUrl: base, fetchImpl: impl }).catch(
        (cause: unknown) => cause,
      )) as CeruleaApiError;
      expect(failure.code).toBe('service.unnamed');
      expect(failure.message).toContain('answered 409 for /y.');
    }
  });

  it('fills the code, the fix and the details when Cerulea APIs names only a message', async () => {
    const { impl } = recorder({ status: 400, body: { error: { message: 'The name is empty.', details: 'x' } } });
    const failure = (await ceruleaRequest('/z', { method: 'POST' }, { baseUrl: base, fetchImpl: impl }).catch(
      (cause: unknown) => cause,
    )) as CeruleaApiError;
    expect(failure.code).toBe('service.unnamed');
    expect(failure.fix).toBe('Correct the request and send it again.');
    expect(failure.message).toBe('The name is empty. Correct the request and send it again.');
    expect(failure.details).toEqual({});
  });

  it('names the address and the path when the call never reaches Cerulea APIs', async () => {
    const impl = (() => Promise.reject(new Error('refused'))) as unknown as typeof fetch;
    const failure = (await ceruleaRequest('/down', { method: 'GET' }, { baseUrl: base, fetchImpl: impl }).catch(
      (cause: unknown) => cause,
    )) as CeruleaApiError;
    expect(failure.code).toBe('service.unreachable');
    expect(failure.status).toBe(503);
    expect(failure.details).toEqual({ base, path: '/down' });
  });

  it('reads a 422 compiler answer as a result and still raises another failure', async () => {
    const report = { ok: false, reachedStage: 'validate', report: { errorCount: 1 } };
    const accepted = recorder({ status: 422, body: report });
    await expect(compileDocument({}, { baseUrl: base, fetchImpl: accepted.impl })).resolves.toEqual(report);

    const extra = recorder({ status: 409, body: report });
    await expect(
      compileDocument({}, { baseUrl: base, fetchImpl: extra.impl, acceptStatuses: [409] }),
    ).resolves.toEqual(report);
    await expect(
      compileProject('p-1', undefined, { baseUrl: base, fetchImpl: extra.impl, acceptStatuses: [409] }),
    ).resolves.toEqual(report);

    const refused = recorder({ status: 500, body: { error: { message: 'Down.', fix: 'Restart.' } } });
    await expect(compileDocument({}, { baseUrl: base, fetchImpl: refused.impl })).rejects.toThrowError(
      'Down. Restart.',
    );
  });
});

describe('reading a deployment', () => {
  it('names the fix for an empty deployment', () => {
    expect(() => readDeployment(null)).toThrowError(/sent an empty deployment/);
    expect(() => readDeployment('text')).toThrowError(/sent an empty deployment/);
  });

  it('names the fix when the identifier or the status is absent', () => {
    expect(() => readDeployment({ status: 'running' })).toThrowError(/no identifier or no status/);
    expect(() => readDeployment({ id: 'dep-1' })).toThrowError(/no identifier or no status/);
  });

  it('names the position of a stage with no content', () => {
    expect(() => readDeployment({ id: 'dep-1', status: 'running', stages: [{ name: 'a', status: 'b' }, null] })).toThrowError(
      'Cerulea APIs sent a stage at position 2 with no content. Upgrade Cerulea APIs to a version that sends name, status, startedAt, endedAt and outcome.',
    );
  });

  it('fills absent stage times and outcome with null and an absent record with null', () => {
    const deployment = readDeployment({
      id: 'dep-1',
      status: 'queued',
      stages: [{ name: 'Check', status: 'pending', startedAt: 5, outcome: undefined }],
    });
    expect(deployment).toEqual({
      id: 'dep-1',
      status: 'queued',
      stages: [{ name: 'Check', status: 'pending', startedAt: null, endedAt: null, outcome: null }],
      record: null,
    });
  });
});

describe('deployment calls', () => {
  it('rolls back with an empty body when no reason is given', async () => {
    const { impl, calls } = recorder({ body: { id: 'dep-2', status: 'rolled_back' } });
    const deployment = await rollbackDeployment('dep-2', undefined, { baseUrl: base, fetchImpl: impl });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({});
    expect(deployment).toEqual({ id: 'dep-2', status: 'rolled_back', stages: [], record: null });
  });

  it('answers null when the rollback reply carries no deployment', async () => {
    const empty = recorder({ body: '', type: 'text/plain' });
    await expect(rollbackDeployment('dep-2', 'why', { baseUrl: base, fetchImpl: empty.impl })).resolves.toBeNull();
    const accepted = recorder({ body: { accepted: true } });
    await expect(rollbackDeployment('dep-2', 'why', { baseUrl: base, fetchImpl: accepted.impl })).resolves.toBeNull();
  });

  it('reads an absent deployment list as empty', async () => {
    const { impl } = recorder({ body: {} });
    await expect(listDeployments('p-9', { baseUrl: base, fetchImpl: impl })).resolves.toEqual([]);
  });

  it('encodes the deployment identifier in the path', async () => {
    const { impl, calls } = recorder({ body: { id: 'a/b', status: 'running' } });
    await fetchDeployment('a/b', { baseUrl: base, fetchImpl: impl });
    expect(calls[0].url).toBe(`${base}/v1/deployments/a%2Fb`);
  });
});

describe('watching a deployment', () => {
  it('stops before the first read lands and reports nothing', async () => {
    let release: (value: Response) => void = () => undefined;
    const impl = (() => new Promise<Response>((resolve) => (release = resolve))) as unknown as typeof fetch;
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const stop = watchDeployment('dep-3', { onUpdate, onError }, { baseUrl: base, fetchImpl: impl });
    stop();
    release(
      new Response(JSON.stringify({ id: 'dep-3', status: 'running' }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('stays silent when a failed read lands after the stop', async () => {
    let fail: (reason: unknown) => void = () => undefined;
    const impl = (() => new Promise<Response>((_resolve, reject) => (fail = reject))) as unknown as typeof fetch;
    const onError = vi.fn();
    const stop = watchDeployment('dep-3', { onUpdate: vi.fn(), onError }, { baseUrl: base, fetchImpl: impl });
    stop();
    fail(new Error('refused'));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a malformed deployment as an error and stops', async () => {
    const { impl, calls } = recorder({ body: { status: 'running' } });
    const error = await new Promise<Error>((resolve) => {
      watchDeployment('dep-4', { intervalMs: 1, onUpdate: vi.fn(), onError: resolve }, { baseUrl: base, fetchImpl: impl });
    });
    expect(error.message).toMatch(/no identifier or no status/);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(calls).toHaveLength(1);
  });

  it('stops polling when the caller stops between reads', async () => {
    const { impl, calls } = recorder({ body: { id: 'dep-5', status: 'running' } });
    const seen: string[] = [];
    let stop: () => void = () => undefined;
    await new Promise<void>((resolve) => {
      stop = watchDeployment(
        'dep-5',
        {
          intervalMs: 1,
          onUpdate: (deployment) => {
            seen.push(deployment.status);
            if (seen.length === 2) {
              stop();
              resolve();
            }
          },
          onError: vi.fn(),
        },
        { baseUrl: base, fetchImpl: impl },
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(seen).toEqual(['running', 'running']);
    expect(calls).toHaveLength(2);
  });
});

describe('the Blueprint address', () => {
  it('writes null for undefined and drops keys holding undefined', () => {
    expect(canonicalJson(undefined)).toBe('null');
    expect(canonicalJson({ b: undefined, a: 'x' })).toBe('{"a":"x"}');
    expect(canonicalJson([null, 'y', 3])).toBe('[null,"y",3]');
  });

  it('names the fix when the browser exposes no digest service', async () => {
    vi.stubGlobal('crypto', {});
    await expect(blueprintHash({ name: 'Trace' })).rejects.toThrowError(
      'This browser exposes no digest service, so Cerulea cannot address the Blueprint. Open Studio over https, or open it on localhost.',
    );
  });
});
