import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Blueprint } from '@/lib/blueprint/types';
import { harbourRegister } from '@/components/studio/steps/step2-fixture';
import { ENTITY_PRESETS } from '@/lib/blueprint/compose';

/** Cerulea APIs behind the routes: one project, one head Blueprint, one build state. */
const held = {
  version: 2,
  document: null as unknown,
  buildState: {
    foundation: { track: 'dapp', historyRetentionDays: 900 },
    compose: { moduleIds: [] as string[] },
    drafts: {} as Record<string, unknown>,
  },
  saves: [] as { document: Blueprint; expectedVersion?: number; note?: string }[],
};

vi.mock('@/lib/cerulea-server', () => ({
  ceruleaActor: async () => ({ accountId: 'acct', accessToken: 'token' }),
  callOptions: () => ({ accessToken: 'token' }),
  signInRequired: () => new Response('{}', { status: 401 }),
  failureResponse: (failure: { code: string; message: string; fix: string; details: unknown }, status: number) =>
    new Response(JSON.stringify({ error: `${failure.message} ${failure.fix}`, ...failure }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  failureReply: (cause: { code?: string; message: string; fix?: string; status?: number; details?: unknown }) =>
    new Response(
      JSON.stringify({ error: cause.message, code: cause.code ?? 'x', message: cause.message, fix: cause.fix ?? '', details: cause.details ?? {} }),
      { status: cause.status ?? 500, headers: { 'content-type': 'application/json' } },
    ),
}));

vi.mock('@/lib/cerulea-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/cerulea-api')>('@/lib/cerulea-api');
  return {
    ...actual,
    readProject: async () => ({ project: { projectId: 'p1', name: 'Harbour register', headVersion: held.version } }),
    readBlueprint: async () => ({ version: held.version, blueprintHash: `h${held.version}`, document: held.document }),
    saveBlueprint: async (_id: string, input: { document: Blueprint; expectedVersion?: number; note?: string }) => {
      held.saves.push(input);
      held.document = input.document;
      held.version += 1;
      return { blueprint: { version: held.version, blueprintHash: `h${held.version}` }, created: true };
    },
    readBuildState: async () => ({ buildState: held.buildState, rowVersion: 1 }),
    saveBuildState: async (_id: string, state: typeof held.buildState) => {
      held.buildState = state;
      return { buildState: state, rowVersion: 2 };
    },
  };
});

import { GET, PUT } from './route';

const context = { params: Promise.resolve({ id: 'p1' }) };

function request(method: string, body: unknown): Request {
  return new Request('http://studio.localhost/api/projects/p1/schema', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('the schema route', () => {
  beforeEach(() => {
    held.version = 2;
    held.document = harbourRegister();
    held.buildState = { foundation: { track: 'dapp', historyRetentionDays: 900 }, compose: { moduleIds: [] }, drafts: {} };
    held.saves = [];
  });

  it('answers the head document with the track, the modules and the layout', async () => {
    const reply = await GET(new Request('http://studio.localhost/api/projects/p1/schema'), context);
    const body = await reply.json();
    expect(reply.status).toBe(200);
    expect(body.version).toBe(2);
    expect(body.document.collections.map((entry: { id: string }) => entry.id)).toEqual(['harbour', 'berth']);
    expect(body.layout).toEqual({ placement: {}, positions: {} });
    expect(body.seeded).toBe(false);
  });

  it('seeds an empty Blueprint from the module presets once', async () => {
    const moduleId = Object.keys(ENTITY_PRESETS)[0];
    held.document = { name: 'Fresh' };
    held.buildState.compose.moduleIds = [moduleId];
    const reply = await GET(new Request('http://studio.localhost/api/projects/p1/schema'), context);
    const body = await reply.json();
    expect(body.seeded).toBe(true);
    expect(body.version).toBe(3);
    expect(body.document.collections.length).toBeGreaterThan(0);
    expect(held.saves[0].note).toBe('Seeded the data schema from the module presets');
    expect(held.saves[0].expectedVersion).toBe(2);
  });

  it('seeds from the entities an imported project saved in the earlier Studio', async () => {
    held.document = { name: 'Imported' };
    held.buildState.drafts['schema::document'] = {
      entities: [
        {
          name: 'Farm Plot',
          moduleId: 'traceability-ledger',
          fields: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'ownerEmail', type: 'string', encrypted: true },
            { name: 'grade', type: 'enum', options: ['A', 'B'] },
          ],
        },
      ],
    };
    const reply = await GET(new Request('http://studio.localhost/api/projects/p1/schema'), context);
    const body = await reply.json();
    expect(body.seeded).toBe(true);
    expect(body.document.collections[0]).toEqual(expect.objectContaining({ id: 'farm_plot', privacy: 'Encrypted' }));
    expect(body.layout.placement).toEqual({ farm_plot: 'traceability-ledger' });
    expect(held.buildState.drafts['step2::schema']).toEqual(body.layout);
  });

  it('merges the named sections into the head and keeps the others', async () => {
    const start = harbourRegister();
    const permissions = [...start.permissions, { id: 'harbour_master_on_harbour', role: 'harbour_master', collection: 'harbour', capabilities: ['Read', 'Update'], fields: [] }];
    const reply = await PUT(request('PUT', { sections: { permissions }, expectedVersion: 2, layout: { placement: { berth: 'x' }, positions: {} } }), context);
    const body = await reply.json();
    expect(reply.status).toBe(200);
    expect(body.version).toBe(3);
    expect(held.saves[0].document.permissions).toHaveLength(2);
    expect(held.saves[0].document.actions).toEqual(start.actions);
    expect(held.saves[0].expectedVersion).toBe(2);
    expect(held.buildState.drafts['step2::schema']).toEqual({ placement: { berth: 'x' }, positions: {} });
  });

  it('refuses a stale version, a section outside the route and a faulty document', async () => {
    const stale = await PUT(request('PUT', { sections: { permissions: [] }, expectedVersion: 1 }), context);
    expect(stale.status).toBe(409);
    expect((await stale.json()).code).toBe('projects.version_moved');

    const outside = await PUT(request('PUT', { sections: { economics: null } }), context);
    expect(outside.status).toBe(400);
    expect((await outside.json()).code).toBe('blueprint.section_outside_route');

    const faulty = await PUT(
      request('PUT', { sections: { permissions: [{ id: 'p', role: 'nobody', collection: 'berth', capabilities: ['Read'], fields: [] }] } }),
      context,
    );
    expect(faulty.status).toBe(400);
    const body = await faulty.json();
    expect(body.code).toBe('blueprint.document_faulty');
    expect(body.details.faults[0].fix).toContain('nobody');
    expect(held.saves).toHaveLength(0);
  });

  it('saves a whole document for the Blueprint level', async () => {
    const start = harbourRegister();
    const edited = { ...start, summary: 'A register of berths along the quay.' };
    const reply = await PUT(request('PUT', { document: edited, expectedVersion: 2 }), context);
    expect(reply.status).toBe(200);
    expect(held.saves[0].document.summary).toBe('A register of berths along the quay.');
  });
});
