// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Dashboard route handlers, one branch at a time.
 *
 * Each test signs an account in or out, answers the Cerulea APIs calls the
 * handler sends, and reads the status and the body the handler returns. The
 * fake Cerulea APIs records every call, so each test also checks the address,
 * the method, the body and the access token the handler sent.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
  }),
  headers: () => new Headers({ host: '127.0.0.1:3000' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? {
          cerulea: {
            accountId: 'act_dashboard_suite',
            email: 'dashboard@cerulea.test',
            displayName: 'Dana Mehta',
            accessToken: 'tok_dashboard_suite',
          },
        }
      : null,
}));

import * as execution from './execution/route';
import * as governance from './governance/route';
import * as integrations from './integrations/route';
import * as keys from './keys/route';
import * as networks from './networks/route';
import * as settings from './settings/route';
import * as versions from './state/route';

const BASE = 'http://cerulea-apis.test';
const STUDIO = 'http://127.0.0.1:3000';

type Call = { method: string; path: string; body: unknown; authorization: string | null };
type Answer = { method: string; path: string; status: number; body: unknown; unreachable: boolean };

let calls: Call[] = [];
let answers: Answer[] = [];

/** Tells the fake Cerulea APIs how to answer one call. */
function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body, unreachable: false });
}

/** Makes one call fail at the network. */
function unreachable(method: string, path: string): void {
  answers.push({ method, path, status: 0, body: null, unreachable: true });
}

function refusal(code: string, message: string, fix: string) {
  return { error: { code, message, fix, details: { field: 'suite' } } };
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'dashboard-route-suite';
  process.env.CERULEA_API_URL = BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const path = `${url.pathname}${url.search}`;
      const method = init.method ?? 'GET';
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({
        method,
        path,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
        authorization: headers.authorization ?? null,
      });
      const match = answers.find((entry) => entry.method === method && entry.path === path);
      if (!match) {
        return Response.json(
          refusal('suite.unanswered', `The suite holds no answer for ${method} ${path}.`, 'Add one.'),
          { status: 404 },
        );
      }
      if (match.unreachable) throw new TypeError('fetch failed');
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
  ownerAccountId: 'act_dashboard_suite',
  createdAt: '2026-01-04T09:00:00.000Z',
};

const clinic = {
  ...registry,
  workspaceId: 'wsp_clinic',
  name: 'Clinic network',
  slug: 'clinic-network',
  application: 'enterprise',
};

function project(projectId: string, name: string, workspaceId: string, updatedAt: string) {
  return {
    projectId,
    workspaceId,
    name,
    slug: projectId.replace('prj_', ''),
    summary: `${name} summary`,
    state: 'building',
    headVersion: 3,
    createdAt: '2026-01-05T09:00:00.000Z',
    updatedAt,
  };
}

function blueprint(version: number, blueprintHash: string, document: unknown) {
  return {
    blueprintId: `bpr_${blueprintHash}`,
    projectId: 'unused',
    version,
    blueprintHash,
    schemaVersion: '1.0.0',
    note: '',
    createdByAccountId: 'act_dashboard_suite',
    createdAt: '2026-01-05T09:00:00.000Z',
    document,
  };
}

function get(path: string): Request {
  return new Request(`${STUDIO}${path}`);
}

function send(method: string, path: string, body: unknown): Request {
  return new Request(`${STUDIO}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

describe('the Keys panel route', () => {
  it('refuses every method with no session', async () => {
    state.signedIn = false;
    for (const reply of [
      await keys.GET(get('/api/dashboard/keys')),
      await keys.POST(send('POST', '/api/dashboard/keys', { name: 'Door', scopes: ['records.read'] })),
      await keys.PATCH(send('PATCH', '/api/dashboard/keys?keyId=key_1', {})),
      await keys.DELETE(new Request(`${STUDIO}/api/dashboard/keys?keyId=key_1`, { method: 'DELETE' })),
    ]) {
      const { status, body } = await read(reply);
      expect(status).toBe(401);
      expect(body.error.code).toBe('session.absent');
    }
    expect(calls).toHaveLength(0);
  });

  it('lists the keys of the workspace the query names', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('GET', '/studio/workspaces/wsp_clinic/keys', {
      keys: [{ keyId: 'key_clinic', name: 'Clinic intake' }],
      scopes: ['records.read', 'records.write'],
    });

    const { status, body } = await read(await keys.GET(get('/api/dashboard/keys?workspaceId=wsp_clinic')));

    expect(status).toBe(200);
    expect(body.workspace.workspaceId).toBe('wsp_clinic');
    expect(body.workspaces.map((entry: { name: string }) => entry.name)).toEqual([
      'Registry office',
      'Clinic network',
    ]);
    expect(body.keys).toEqual([{ keyId: 'key_clinic', name: 'Clinic intake' }]);
    expect(body.scopes).toEqual(['records.read', 'records.write']);
    const keyCall = calls.find((call) => call.path.endsWith('/keys'));
    expect(keyCall?.authorization).toBe('Bearer tok_dashboard_suite');
  });

  it('opens a first workspace named after the account when none exists', async () => {
    answer('GET', '/workspaces', { workspaces: [] });
    answer('POST', '/workspaces', { workspace: { ...registry, workspaceId: 'wsp_new', name: 'Dana Mehta workspace' } });
    answer('GET', '/studio/workspaces/wsp_new/keys', { keys: [], scopes: ['records.read'] });

    const { status, body } = await read(await keys.GET(get('/api/dashboard/keys')));

    expect(status).toBe(200);
    expect(body.workspace.name).toBe('Dana Mehta workspace');
    const opened = calls.filter((call) => call.method === 'POST' && call.path === '/workspaces');
    expect(opened.length).toBeGreaterThan(0);
    expect(opened[0].body).toEqual({ name: 'Dana Mehta workspace' });
  });

  it('answers a key request with no scope with the fix and sends nothing upstream', async () => {
    const { status, body } = await read(
      await keys.POST(send('POST', '/api/dashboard/keys', { name: 'Door', scopes: [] })),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('keys.request_incomplete');
    expect(body.error.fix).toContain('choose the scopes');
    expect(calls).toHaveLength(0);
  });

  it('answers a body that is no JSON with the same fix', async () => {
    const { status, body } = await read(await keys.POST(send('POST', '/api/dashboard/keys', 'not json')));
    expect(status).toBe(400);
    expect(body.error.code).toBe('keys.request_incomplete');
  });

  it('issues a key in the named workspace and answers 201', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer(
      'POST',
      '/studio/workspaces/wsp_clinic/keys',
      { key: { keyId: 'key_issued', name: 'Intake desk' }, secret: 'ck_once', guidance: 'Copy the key now.' },
    );

    const { status, body } = await read(
      await keys.POST(
        send('POST', '/api/dashboard/keys', {
          name: 'Intake desk',
          scopes: ['records.write'],
          requestsPerMinute: 120,
          expiresInDays: 30,
          workspaceId: 'wsp_clinic',
        }),
      ),
    );

    expect(status).toBe(201);
    expect(body.secret).toBe('ck_once');
    const issued = calls.find((call) => call.method === 'POST' && call.path.endsWith('/keys'));
    expect(issued?.body).toEqual({
      name: 'Intake desk',
      scopes: ['records.write'],
      requestsPerMinute: 120,
      expiresInDays: 30,
    });
  });

  it('passes a Cerulea APIs refusal on with its code, status and fix', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer(
      'POST',
      '/studio/workspaces/wsp_registry/keys',
      refusal('keys.name_taken', 'A key with that name exists.', 'Choose another name.'),
      409,
    );

    const { status, body } = await read(
      await keys.POST(send('POST', '/api/dashboard/keys', { name: 'Door', scopes: ['records.read'] })),
    );

    expect(status).toBe(409);
    expect(body.error).toEqual({
      code: 'keys.name_taken',
      message: 'A key with that name exists.',
      fix: 'Choose another name.',
      details: { field: 'suite' },
    });
  });

  it('answers 503 with the start fix when Cerulea APIs is unreachable', async () => {
    unreachable('GET', '/workspaces');
    const { status, body } = await read(
      await keys.POST(send('POST', '/api/dashboard/keys', { name: 'Door', scopes: ['records.read'] })),
    );
    expect(status).toBe(503);
    expect(body.error.code).toBe('service.unreachable');
    expect(body.error.details).toEqual({ base: BASE, path: '/workspaces' });
  });

  it('asks for the key before a rotation', async () => {
    const { status, body } = await read(await keys.PATCH(send('PATCH', '/api/dashboard/keys', {})));
    expect(status).toBe(400);
    expect(body.error.code).toBe('keys.key_unnamed');
    expect(body.error.message).toContain('rotate');
    expect(calls).toHaveLength(0);
  });

  it('rotates the named key inside the named workspace', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('POST', '/studio/workspaces/wsp_clinic/keys/key%2F7/rotation', {
      key: { keyId: 'key_8' },
      secret: 'ck_rotated',
      guidance: 'The earlier key stopped working.',
    });

    const { status, body } = await read(
      await keys.PATCH(send('PATCH', '/api/dashboard/keys?keyId=key/7&workspaceId=wsp_clinic', {})),
    );

    expect(status).toBe(200);
    expect(body).toEqual({
      key: { keyId: 'key_8' },
      secret: 'ck_rotated',
      guidance: 'The earlier key stopped working.',
    });
    const rotation = calls.find((call) => call.path.endsWith('/rotation'));
    expect(rotation?.method).toBe('POST');
    expect(rotation?.body).toEqual({});
  });

  it('asks for the key before a revocation', async () => {
    const { status, body } = await read(
      await keys.DELETE(new Request(`${STUDIO}/api/dashboard/keys`, { method: 'DELETE' })),
    );
    expect(status).toBe(400);
    expect(body.error.message).toContain('revoke');
  });

  it('revokes the named key in the first workspace when the query names none', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('DELETE', '/studio/workspaces/wsp_registry/keys/key_9', {
      key: { keyId: 'key_9', revokedAt: '2026-09-30T10:00:00.000Z' },
      guidance: 'Cerulea refuses the key from now on.',
    });

    const { status, body } = await read(
      await keys.DELETE(new Request(`${STUDIO}/api/dashboard/keys?keyId=key_9`, { method: 'DELETE' })),
    );

    expect(status).toBe(200);
    expect(body.key.revokedAt).toBe('2026-09-30T10:00:00.000Z');
  });

  it('relays a revocation refusal from Cerulea APIs', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer(
      'DELETE',
      '/studio/workspaces/wsp_registry/keys/key_gone',
      refusal('keys.absent', 'Cerulea holds no key with that name.', 'Choose a key from the list.'),
      404,
    );
    const { status, body } = await read(
      await keys.DELETE(new Request(`${STUDIO}/api/dashboard/keys?keyId=key_gone`, { method: 'DELETE' })),
    );
    expect(status).toBe(404);
    expect(body.error.code).toBe('keys.absent');
  });
});

/** Answers the three reads every cross-project panel starts with. */
function answerProjects(documents: Record<string, unknown>): void {
  answer('GET', '/workspaces', { workspaces: [registry, clinic] });
  answer('GET', '/workspaces/wsp_registry/projects', {
    projects: [project('prj_land', 'Land titles', 'wsp_registry', '2026-03-01T00:00:00.000Z')],
  });
  answer('GET', '/workspaces/wsp_clinic/projects', {
    projects: [project('prj_vaccine', 'Vaccine ledger', 'wsp_clinic', '2026-06-01T00:00:00.000Z')],
  });
  answer('GET', '/projects/prj_land/blueprint', blueprint(4, 'bph_land', documents.prj_land ?? {}));
  answer('GET', '/projects/prj_vaccine/blueprint', blueprint(7, 'bph_vaccine', documents.prj_vaccine ?? {}));
}

describe('the Versions panel route', () => {
  it('lists every project, newest first, with its versions, checkpoints and counts', async () => {
    answerProjects({
      prj_vaccine: {
        collections: [{ id: 'doses' }, { id: 'clinics' }],
        actions: [{ id: 'record_dose' }],
        integrations: { feeds: [{ id: 'supply' }] },
      },
    });
    answer('GET', '/projects/prj_vaccine/blueprint/versions?limit=20', {
      versions: [{ version: 7 }, { version: 6 }],
    });
    answer('GET', '/projects/prj_vaccine/checkpoints', { checkpoints: [{ checkpointId: 'chk_launch' }] });
    answer('GET', '/projects/prj_land/blueprint/versions?limit=20', { versions: [{ version: 4 }] });
    answer('GET', '/projects/prj_land/checkpoints', { checkpoints: [] });

    const { status, body } = await read(await versions.GET());

    expect(status).toBe(200);
    expect(body.projects.map((entry: { projectName: string }) => entry.projectName)).toEqual([
      'Vaccine ledger',
      'Land titles',
    ]);
    const vaccine = body.projects[0];
    expect(vaccine).toMatchObject({
      projectId: 'prj_vaccine',
      workspaceName: 'Clinic network',
      state: 'building',
      headVersion: 7,
      blueprintHash: 'bph_vaccine',
      versions: [{ version: 7 }, { version: 6 }],
      checkpoints: [{ checkpointId: 'chk_launch' }],
    });
    expect(vaccine.counts).toMatchObject({ collections: 2, actions: 1, feeds: 1, roles: 1 });
    expect(body.projects[1].counts.collections).toBe(0);
  });

  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status } = await read(await versions.GET());
    expect(status).toBe(401);
  });

  it('relays a failure reading the versions', async () => {
    answerProjects({});
    answer(
      'GET',
      '/projects/prj_vaccine/blueprint/versions?limit=20',
      refusal('project.forbidden', 'The account reads no version here.', 'Ask the owner for access.'),
      403,
    );
    answer('GET', '/projects/prj_vaccine/checkpoints', { checkpoints: [] });
    const { status, body } = await read(await versions.GET());
    expect(status).toBe(403);
    expect(body.error.fix).toBe('Ask the owner for access.');
  });

  it('refuses a checkpoint with no session', async () => {
    state.signedIn = false;
    const { status } = await read(
      await versions.POST(send('POST', '/api/dashboard/state', { projectId: 'prj_land', label: 'Launch' })),
    );
    expect(status).toBe(401);
  });

  it('asks for a label of two characters', async () => {
    const { status, body } = await read(
      await versions.POST(send('POST', '/api/dashboard/state', { projectId: 'prj_land', label: 'L' })),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('checkpoint.request_incomplete');
    expect(calls).toHaveLength(0);
  });

  it('takes a checkpoint of the named project and answers 201', async () => {
    answer('POST', '/projects/prj_land/checkpoints', {
      checkpoint: { checkpointId: 'chk_new', label: 'Before launch' },
    });
    const { status, body } = await read(
      await versions.POST(
        send('POST', '/api/dashboard/state', {
          projectId: 'prj_land',
          label: 'Before launch',
          note: 'The registrar approved it.',
        }),
      ),
    );
    expect(status).toBe(201);
    expect(body.checkpoint.checkpointId).toBe('chk_new');
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/projects/prj_land/checkpoints',
      body: { label: 'Before launch', note: 'The registrar approved it.' },
      authorization: 'Bearer tok_dashboard_suite',
    });
  });

  it('relays a checkpoint refusal', async () => {
    answer(
      'POST',
      '/projects/prj_land/checkpoints',
      refusal('checkpoint.label_taken', 'A checkpoint carries that label.', 'Choose another label.'),
      409,
    );
    const { status, body } = await read(
      await versions.POST(send('POST', '/api/dashboard/state', { projectId: 'prj_land', label: 'Launch' })),
    );
    expect(status).toBe(409);
    expect(body.error.code).toBe('checkpoint.label_taken');
  });
});

describe('the Governance panel route', () => {
  it('names each authority role and falls back to the architecture defaults', async () => {
    answerProjects({
      prj_land: {
        identities: { roles: [{ id: 'registrar', name: 'Registrar' }, { id: 'clerk', name: 'Clerk' }] },
        governance: {
          authority: ['registrar', 'auditor'],
          quorum: { routine: 60, financial: 70, structural: 85, constitutional: 95 },
          constitutional_delay_blocks: 14400,
          change_process: 'Two registrars sign every change.',
        },
      },
    });

    const { status, body } = await read(await governance.GET());

    expect(status).toBe(200);
    expect(body.classes.map((entry: { name: string }) => entry.name)).toEqual([
      'Routine',
      'Financial',
      'Structural',
      'Constitutional',
    ]);
    expect(body.classes.map((entry: { architectureThreshold: number }) => entry.architectureThreshold)).toEqual([
      51, 67, 80, 90,
    ]);
    expect(body.classes.filter((entry: { mandatoryDelay: boolean }) => entry.mandatoryDelay)).toHaveLength(1);
    expect(body.classes[3].meaning).toContain('mandatory delay');

    const land = body.projects.find((entry: { projectId: string }) => entry.projectId === 'prj_land');
    expect(land).toMatchObject({
      projectName: 'Land titles',
      workspaceName: 'Registry office',
      version: 4,
      authority: ['Registrar', 'auditor'],
      quorum: { routine: 60, financial: 70, structural: 85, constitutional: 95 },
      constitutionalDelayBlocks: 14400,
      changeProcess: 'Two registrars sign every change.',
      roleCount: 2,
    });

    const vaccine = body.projects.find((entry: { projectId: string }) => entry.projectId === 'prj_vaccine');
    expect(vaccine).toMatchObject({
      authority: [],
      quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 },
      constitutionalDelayBlocks: 28800,
      changeProcess: '',
      roleCount: 1,
    });
  });

  it('refuses with no session', async () => {
    state.signedIn = false;
    expect((await governance.GET()).status).toBe(401);
  });
});

describe('the account and workspace route', () => {
  it('reads the account, the sessions, the members and the roles of the named workspace', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('GET', '/accounts/me', { account: { accountId: 'act_dashboard_suite', email: 'dashboard@cerulea.test' } });
    answer('GET', '/sessions', { sessions: [{ sessionId: 'ses_laptop' }, { sessionId: 'ses_phone' }] });
    answer('GET', '/workspaces/wsp_clinic/members', { members: [{ memberId: 'mem_1', email: 'nurse@cerulea.test' }] });
    answer('GET', '/workspaces/roles', { roles: [{ role: 'owner', capabilities: ['everything'] }] });

    const { status, body } = await read(
      await settings.GET(get('/api/dashboard/settings?workspaceId=wsp_clinic')),
    );

    expect(status).toBe(200);
    expect(body.account.email).toBe('dashboard@cerulea.test');
    expect(body.sessions.map((entry: { sessionId: string }) => entry.sessionId)).toEqual(['ses_laptop', 'ses_phone']);
    expect(body.workspace.workspaceId).toBe('wsp_clinic');
    expect(body.workspaces).toHaveLength(2);
    expect(body.members[0].email).toBe('nurse@cerulea.test');
    expect(body.roles[0].role).toBe('owner');
  });

  it('refuses an invitation with no session', async () => {
    state.signedIn = false;
    const { status } = await read(
      await settings.POST(send('POST', '/api/dashboard/settings', { email: 'a@cerulea.test', role: 'viewer' })),
    );
    expect(status).toBe(401);
  });

  it('asks for a valid address and role', async () => {
    const { status, body } = await read(
      await settings.POST(send('POST', '/api/dashboard/settings', { email: 'not an address', role: 'ruler' })),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('member.invitation_incomplete');
    expect(calls).toHaveLength(0);
  });

  it('sends the invitation to the named workspace and answers 201', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('POST', '/workspaces/wsp_clinic/invitations', {
      member: { memberId: 'mem_new', email: 'auditor@cerulea.test', role: 'reviewer' },
      guidance: 'Cerulea sent the invitation.',
    });

    const { status, body } = await read(
      await settings.POST(
        send('POST', '/api/dashboard/settings', {
          email: 'auditor@cerulea.test',
          role: 'reviewer',
          workspaceId: 'wsp_clinic',
        }),
      ),
    );

    expect(status).toBe(201);
    expect(body.guidance).toBe('Cerulea sent the invitation.');
    const invitation = calls.find((call) => call.path.endsWith('/invitations'));
    expect(invitation?.body).toEqual({ email: 'auditor@cerulea.test', role: 'reviewer' });
  });

  it('relays an invitation refusal', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer(
      'POST',
      '/workspaces/wsp_registry/invitations',
      refusal('member.present', 'That address already belongs to the workspace.', 'Choose another address.'),
      409,
    );
    const { status, body } = await read(
      await settings.POST(send('POST', '/api/dashboard/settings', { email: 'a@cerulea.test', role: 'viewer' })),
    );
    expect(status).toBe(409);
    expect(body.error.message).toBe('That address already belongs to the workspace.');
  });

  it('asks for the session before closing one', async () => {
    const { status, body } = await read(
      await settings.DELETE(new Request(`${STUDIO}/api/dashboard/settings`, { method: 'DELETE' })),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('session.unnamed');
  });

  it('closes the named session', async () => {
    answer('DELETE', '/sessions/ses_phone', { session: { sessionId: 'ses_phone', state: 'closed' } });
    const { status, body } = await read(
      await settings.DELETE(
        new Request(`${STUDIO}/api/dashboard/settings?sessionId=ses_phone`, { method: 'DELETE' }),
      ),
    );
    expect(status).toBe(200);
    expect(body.session.state).toBe('closed');
    expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/sessions/ses_phone' });
  });
});

describe('the execution substrate route', () => {
  it('names the substrate each project runs on and keeps an unknown one as sent', async () => {
    answerProjects({});
    answer('GET', '/studio/execution-substrates', {
      substrates: [
        { substrate: 'Native', name: 'Native interpretation' },
        { substrate: 'WebAssembly', name: 'WebAssembly contracts' },
      ],
    });
    answer('GET', '/studio/projects/prj_vaccine/build-state', {
      buildState: { execution: { substrate: 'WebAssembly', reason: 'The dosing model runs unbounded loops.' } },
    });
    answer('GET', '/studio/projects/prj_land/build-state', {
      buildState: { execution: { substrate: 'Quantum', reason: 'A future substrate.' } },
    });

    const { status, body } = await read(await execution.GET());

    expect(status).toBe(200);
    expect(body.substrates).toHaveLength(2);
    expect(body.projects).toEqual([
      {
        projectId: 'prj_vaccine',
        projectName: 'Vaccine ledger',
        workspaceName: 'Clinic network',
        state: 'building',
        substrate: 'WebAssembly',
        substrateName: 'WebAssembly contracts',
        reason: 'The dosing model runs unbounded loops.',
      },
      {
        projectId: 'prj_land',
        projectName: 'Land titles',
        workspaceName: 'Registry office',
        state: 'building',
        substrate: 'Quantum',
        substrateName: 'Quantum',
        reason: 'A future substrate.',
      },
    ]);
  });

  it('refuses with no session', async () => {
    state.signedIn = false;
    expect((await execution.GET()).status).toBe(401);
  });
});

describe('the Networks panel route', () => {
  function answerNetwork(measurementPath: string): void {
    answer('GET', '/studio/chain/network', { chainName: 'Cerulea local', head: 812, healthy: true });
    answer('GET', measurementPath, { sampledBlocks: 12, transactionsPerSecond: 4.5 });
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer('GET', '/workspaces/wsp_registry/projects', {
      projects: [
        project('prj_land', 'Land titles', 'wsp_registry', '2026-03-01T00:00:00.000Z'),
        project('prj_tax', 'Tax receipts', 'wsp_registry', '2026-02-01T00:00:00.000Z'),
      ],
    });
  }

  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status } = await read(await networks.GET(get('/api/dashboard/networks')));
    expect(status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('sends the block sample the query names and lists every deployment', async () => {
    answerNetwork('/studio/chain/measurement?blocks=12');
    answer('GET', '/v1/projects/prj_land/deployments', {
      deployments: [
        { id: 'dep_2', status: 'succeeded', stages: [], record: { height: 800 } },
        { id: 'dep_1', status: 'rolled_back', stages: [] },
      ],
    });
    answer('GET', '/v1/projects/prj_tax/deployments', { deployments: [] });

    const { status, body } = await read(await networks.GET(get('/api/dashboard/networks?blocks=12')));

    expect(status).toBe(200);
    expect(body.network.head).toBe(812);
    expect(body.measurement.sampledBlocks).toBe(12);
    expect(body.deployments).toEqual([
      {
        deploymentId: 'dep_2',
        status: 'succeeded',
        projectId: 'prj_land',
        projectName: 'Land titles',
        workspaceName: 'Registry office',
        record: { height: 800 },
      },
      {
        deploymentId: 'dep_1',
        status: 'rolled_back',
        projectId: 'prj_land',
        projectName: 'Land titles',
        workspaceName: 'Registry office',
        record: null,
      },
    ]);
  });

  it('asks for the default sample when the query names none', async () => {
    answerNetwork('/studio/chain/measurement');
    answer('GET', '/v1/projects/prj_land/deployments', { deployments: [] });
    answer('GET', '/v1/projects/prj_tax/deployments', { deployments: [] });

    const { status, body } = await read(await networks.GET(get('/api/dashboard/networks')));

    expect(status).toBe(200);
    expect(body.deployments).toEqual([]);
    expect(calls.some((call) => call.path === '/studio/chain/measurement')).toBe(true);
  });

  it('relays a failure reading the node', async () => {
    answer(
      'GET',
      '/studio/chain/network',
      refusal('chain.unreachable', 'The node answered nothing.', 'Start the node.'),
      502,
    );
    answer('GET', '/studio/chain/measurement', { sampledBlocks: 0 });
    const { status, body } = await read(await networks.GET(get('/api/dashboard/networks')));
    expect(status).toBe(502);
    expect(body.error.fix).toBe('Start the node.');
  });

  it('names the fix when a deployment carries no status', async () => {
    answerNetwork('/studio/chain/measurement');
    answer('GET', '/v1/projects/prj_land/deployments', { deployments: [{ id: 'dep_bare' }] });
    const { status, body } = await read(await networks.GET(get('/api/dashboard/networks')));
    expect(status).toBe(500);
    expect(body.error.code).toBe('studio.unnamed');
    expect(body.error.message).toContain('no identifier or no status');
  });
});

describe('the Integrations panel route', () => {
  it('reads the platform drivers and the connections each Blueprint declares', async () => {
    answer('GET', '/health/ready', {
      service: 'cerulea-apis',
      mode: 'local',
      ready: false,
      checkedAt: '2026-09-30T08:00:00.000Z',
      integrations: [{ integration: 'payments', kind: 'local', ready: false, detail: 'Waiting.' }],
    });
    answerProjects({
      prj_land: {
        integrations: {
          feeds: [{ id: 'survey_feed' }],
          bridges: [{ id: 'tax_bridge' }],
          triggers: [{ id: 'notify_owner' }, { id: 'notify_bank' }],
        },
      },
    });

    const { status, body } = await read(await integrations.GET());

    expect(status).toBe(200);
    expect(body.platform).toEqual({
      mode: 'local',
      ready: false,
      checkedAt: '2026-09-30T08:00:00.000Z',
      drivers: [{ integration: 'payments', kind: 'local', ready: false, detail: 'Waiting.' }],
    });
    const land = body.projects.find((entry: { projectId: string }) => entry.projectId === 'prj_land');
    expect(land).toEqual({
      projectId: 'prj_land',
      projectName: 'Land titles',
      workspaceName: 'Registry office',
      version: 4,
      feeds: [{ id: 'survey_feed' }],
      bridges: [{ id: 'tax_bridge' }],
      triggers: [{ id: 'notify_owner' }, { id: 'notify_bank' }],
    });
    const vaccine = body.projects.find((entry: { projectId: string }) => entry.projectId === 'prj_vaccine');
    expect(vaccine).toMatchObject({ feeds: [], bridges: [], triggers: [] });
  });

  it('refuses with no session', async () => {
    state.signedIn = false;
    expect((await integrations.GET()).status).toBe(401);
  });
});
