// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The audit-logs route behind the Audit Logs screen.
 *
 * The route reads the audit record of every workspace the account may
 * review, merges the entries newest first and answers the field names the
 * screen reads.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [{ name: 'next-auth.session-token', value: 'session' }] }),
  headers: () => new Headers({ host: '127.0.0.1:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? { cerulea: { accountId: 'act_audit', email: 'audit@cerulea.test', displayName: 'Dana Mehta', accessToken: 'tok_audit' } }
      : null,
}));

import * as auditLogs from './route';

const BASE = 'http://cerulea-apis.test';

let calls: { method: string; path: string; authorization: string | null }[] = [];
let answers: { method: string; path: string; status: number; body: unknown }[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body });
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'audit-route-suite';
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

const registry = { workspaceId: 'wsp_registry', name: 'Registry office', slug: 'registry-office', application: 'government', tier: 'standard', state: 'open', ownerAccountId: 'act_audit', createdAt: '2026-01-04T09:00:00.000Z' };
const clinic = { ...registry, workspaceId: 'wsp_clinic', name: 'Clinic network', slug: 'clinic-network', application: 'enterprise' };

function event(eventId: string, workspaceId: string, action: string, outcome: string, occurredAt: string, accountId: string | null = 'act_audit') {
  return {
    eventId,
    workspaceId,
    accountId,
    actorEmail: accountId ? 'audit@cerulea.test' : '',
    actorName: accountId ? 'Dana Mehta' : '',
    action,
    subjectType: action.split('.')[0],
    subjectId: `${eventId}-subject`,
    outcome,
    networkAddress: accountId ? '10.0.0.4' : '',
    detail: {},
    occurredAt,
  };
}

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

describe('the audit-logs route', () => {
  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status, body } = await read(await auditLogs.GET());
    expect(status).toBe(401);
    expect(body.code).toBe('session.absent');
  });

  it('merges the record of every workspace newest first in the shape the screen reads', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('GET', '/studio/workspaces/wsp_registry/audit-events?limit=200', {
      events: [event('e-1', 'wsp_registry', 'key.revoked', 'allowed', '2026-09-19T06:00:00.000Z')],
      total: 1, actions: ['key.revoked'], outcomes: ['allowed'],
    });
    answer('GET', '/studio/workspaces/wsp_clinic/audit-events?limit=200', {
      events: [
        event('e-2', 'wsp_clinic', 'account.signed_in', 'allowed', '2026-09-19T07:00:00.000Z'),
        event('e-3', 'wsp_clinic', 'deployment.failed', 'failed', '2026-09-19T05:00:00.000Z', null),
      ],
      total: 2, actions: ['account.signed_in', 'deployment.failed'], outcomes: ['allowed', 'failed'],
    });

    const { status, body } = await read(await auditLogs.GET());

    expect(status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.logs.map((entry: { id: string }) => entry.id)).toEqual(['e-2', 'e-1', 'e-3']);
    expect(body.logs[1]).toEqual({
      id: 'e-1',
      createdAt: '2026-09-19T06:00:00.000Z',
      actorEmail: 'audit@cerulea.test',
      actorName: 'Dana Mehta',
      actorType: 'user',
      action: 'key.revoked',
      resource: 'key',
      resourceId: 'e-1-subject',
      status: 'success',
      outcome: 'allowed',
      ip: '10.0.0.4',
      userId: 'act_audit',
      workspaceId: 'wsp_registry',
      workspaceName: 'Registry office',
      detail: {},
    });
    expect(body.logs[2].actorType).toBe('system');
    expect(body.logs[2].actorEmail).toBeNull();
    expect(body.logs[2].status).toBe('failure');
    expect(body.logs[2].outcome).toBe('failed');
    expect(calls.map((call) => call.path)).toEqual([
      '/workspaces',
      '/studio/workspaces/wsp_registry/audit-events?limit=200',
      '/studio/workspaces/wsp_clinic/audit-events?limit=200',
    ]);
    expect(calls.every((call) => call.authorization === 'Bearer tok_audit')).toBe(true);
  });

  it('skips a workspace whose role carries no audit read', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, clinic] });
    answer('GET', '/studio/workspaces/wsp_registry/audit-events?limit=200', { error: { code: 'workspaces.capability_refused', message: 'No audit read.', fix: 'Ask.', details: {} } }, 403);
    answer('GET', '/studio/workspaces/wsp_clinic/audit-events?limit=200', { events: [event('e-9', 'wsp_clinic', 'project.created', 'allowed', '2026-09-19T05:00:00.000Z')], total: 1, actions: [], outcomes: [] });
    const { status, body } = await read(await auditLogs.GET());
    expect(status).toBe(200);
    expect(body.logs.map((entry: { id: string }) => entry.id)).toEqual(['e-9']);
  });
});
