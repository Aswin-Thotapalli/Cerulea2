import { describe, expect, it, vi } from 'vitest';

import { CeruleaApiError } from '@/lib/cerulea-api';
import { readInterfaceWorkspace, resetInterfaceSection, saveInterfaceSection, storedSection } from './server';
import type { InterfaceSection } from './types';

const section: InterfaceSection = {
  screens: [
    {
      id: 'shipment_list',
      kind: 'list',
      route: '/shipment',
      roles: ['inspector'],
      title_key: 'screen.shipment_list.title',
      offline_capture: false,
      components: [{ id: 'page', component: 'page', visibility: [], overrides: [], properties: [], children: [] }],
    },
  ],
  theme: { colour_light: [], colour_dark: [], type_scale: [], spacing: [] },
  breakpoints: [{ id: 'desktop', min_width: 1200, columns: 12, label_key: 'width.desktop' }],
  translations: [],
  conflict_rules: [],
  default_language: 'en',
};

const blueprintVersion = (document: Record<string, unknown>, version = 3) => ({
  blueprintId: 'bp_1',
  projectId: 'prj_1',
  version,
  blueprintHash: `hash-${version}`,
  schemaVersion: '1.0.0',
  note: '',
  createdByAccountId: 'acc_1',
  createdAt: '2026-10-04T08:00:00.000Z',
  document,
});

const buildState = {
  version: 1,
  disclosureLevel: 2,
  foundation: {},
  compose: {},
  policies: {},
  execution: { substrate: 'Native', reason: '' },
  steps: { foundation: true, compose: true, model: true, policies: true, interfaceAuthoring: false, verify: false },
  wizardComplete: false,
  wizardCompletedAt: '',
  drafts: {},
  canvas: null,
};

/** A fetch standing in for Cerulea APIs, answering by path and method. */
function apiDouble(answers: (path: string, init: RequestInit) => unknown) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const fetchImpl = vi.fn(async (address: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(address)).pathname;
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({ path, method, body });
    const answer = answers(path, init ?? {});
    if (answer instanceof Response) return answer;
    return new Response(JSON.stringify(answer), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

describe('storedSection', () => {
  it('reads the Views section a person saved and nothing else', () => {
    expect(storedSection({ interface: section })).toEqual(section);
    expect(storedSection({ interface: null })).toBeNull();
    expect(storedSection({ interface: { screens: 'x' } })).toBeNull();
    expect(storedSection('text')).toBeNull();
  });
});

describe('readInterfaceWorkspace', () => {
  it('generates the screens when the Blueprint holds no saved section', async () => {
    const double = apiDouble((path) => {
      if (path === '/projects/prj_1/blueprint') return blueprintVersion({ name: 'AgroTrace', interface: null });
      if (path === '/engine/interface') return { section, omissions: ['No screen for lots.'], faults: [] };
      if (path === '/engine/components') return { components: [], groups: [], breakpoints: [], theme: {}, styleSheet: '' };
      if (path === '/engine/preview/roles') return { roles: [{ role: 'inspector', name: 'Inspector', screens: 1 }] };
      if (path === '/projects/prj_1/deployment-manifest') return { view: 'atomic', version: 3, manifest: { integration: [{ method: 'GET', path: '/v1/records', parameters: [], response: 'records', visibility: '' }] } };
      throw new Error(`unexpected ${path}`);
    });
    const held = await readInterfaceWorkspace('prj_1', {}, { fetchImpl: double.fetchImpl, accessToken: 't' });
    expect(held.authored).toBe(false);
    expect(held.version).toBe(3);
    expect(held.blueprintHash).toBe('hash-3');
    expect(held.generated.omissions).toEqual(['No screen for lots.']);
    expect(held.endpoints).toHaveLength(1);
    expect(double.calls.some((call) => call.path === '/engine/interface/checks')).toBe(false);
  });

  it('opens the saved section and asks the engine to check it against the model', async () => {
    const double = apiDouble((path) => {
      if (path === '/projects/prj_1/blueprint') return blueprintVersion({ name: 'AgroTrace', interface: section });
      if (path === '/engine/interface') return { section: { ...section, screens: [] }, omissions: [], faults: [] };
      if (path === '/engine/interface/checks') return { faults: [{ area: 'responsive', screen: 'shipment_list', component: 'page', problem: 'Too wide.', fix: 'Narrow it.' }] };
      if (path === '/engine/components') return { components: [], groups: [], breakpoints: [], theme: {}, styleSheet: '' };
      if (path === '/engine/preview/roles') return { roles: [] };
      if (path === '/projects/prj_1/deployment-manifest') return new Response(JSON.stringify({ error: { code: 'compiler.manifest_absent', message: 'No manifest.', fix: 'Fix the Blueprint.' } }), { status: 404, headers: { 'content-type': 'application/json' } });
      throw new Error(`unexpected ${path}`);
    });
    const held = await readInterfaceWorkspace('prj_1', {}, { fetchImpl: double.fetchImpl, accessToken: 't' });
    expect(held.authored).toBe(true);
    expect(held.generated.section).toEqual(section);
    expect(held.generated.faults[0]?.fix).toBe('Narrow it.');
    expect(held.endpoints).toEqual([]);
    expect(held.endpointsNote).toContain('No manifest.');
  });
});

describe('saveInterfaceSection', () => {
  it('writes the section into the Blueprint as a new version and marks the step authored', async () => {
    let saved: Record<string, unknown> | null = null;
    let state: Record<string, unknown> | null = null;
    const double = apiDouble((path, init) => {
      if (path === '/projects/prj_1/blueprint' && (init.method ?? 'GET') === 'GET') return blueprintVersion({ name: 'AgroTrace', collections: [], interface: null });
      if (path === '/engine/interface/checks') return { faults: [] };
      if (path === '/projects/prj_1/blueprint' && init.method === 'PUT') {
        saved = JSON.parse(String(init.body));
        return { blueprint: { ...blueprintVersion({}, 4), document: undefined }, created: true };
      }
      if (path === '/studio/projects/prj_1/build-state' && (init.method ?? 'GET') === 'GET') return { projectId: 'prj_1', buildState, rowVersion: 2 };
      if (path === '/studio/projects/prj_1/build-state' && init.method === 'PUT') {
        state = JSON.parse(String(init.body)).buildState;
        return { projectId: 'prj_1', buildState: state, rowVersion: 3 };
      }
      throw new Error(`unexpected ${init.method ?? 'GET'} ${path}`);
    });
    const outcome = await saveInterfaceSection('prj_1', { section, expectedVersion: 3 }, { fetchImpl: double.fetchImpl, accessToken: 't' });
    expect(outcome).toEqual({ version: 4, blueprintHash: 'hash-4', created: true, faults: [] });
    expect((saved as unknown as { document: Record<string, unknown> }).document.interface).toEqual(section);
    expect((saved as unknown as { document: Record<string, unknown> }).document.name).toBe('AgroTrace');
    expect((saved as unknown as { expectedVersion: number }).expectedVersion).toBe(3);
    expect((state as unknown as typeof buildState).steps.interfaceAuthoring).toBe(true);
  });

  it('refuses a section the engine faults and names the first fix', async () => {
    const double = apiDouble((path) => {
      if (path === '/projects/prj_1/blueprint') return blueprintVersion({ interface: null });
      if (path === '/engine/interface/checks') return { faults: [{ area: 'visibility', screen: 'shipment_list', component: 'page', problem: 'Names a role the Blueprint lacks.', fix: 'Name a declared role.' }] };
      throw new Error(`unexpected ${path}`);
    });
    await expect(saveInterfaceSection('prj_1', { section }, { fetchImpl: double.fetchImpl, accessToken: 't' })).rejects.toMatchObject({
      code: 'interface.faults',
      status: 400,
      fix: 'shipment_list, page: Name a declared role.',
    });
    expect(double.calls.some((call) => call.method === 'PUT')).toBe(false);
  });

  it('refuses a stale save when the Blueprint moved on', async () => {
    const double = apiDouble((path) => {
      if (path === '/projects/prj_1/blueprint') return blueprintVersion({ interface: null }, 5);
      throw new Error(`unexpected ${path}`);
    });
    const refusal = await saveInterfaceSection('prj_1', { section, expectedVersion: 3 }, { fetchImpl: double.fetchImpl, accessToken: 't' }).catch((cause) => cause);
    expect(refusal).toBeInstanceOf(CeruleaApiError);
    expect(refusal.code).toBe('interface.version_moved');
    expect(refusal.status).toBe(409);
  });
});

describe('resetInterfaceSection', () => {
  it('writes a null section so the engine generates the screens again', async () => {
    let saved: { document: { interface: unknown } } | null = null;
    const double = apiDouble((path, init) => {
      if (path === '/projects/prj_1/blueprint' && (init.method ?? 'GET') === 'GET') return blueprintVersion({ name: 'AgroTrace', interface: section });
      if (path === '/projects/prj_1/blueprint' && init.method === 'PUT') {
        saved = JSON.parse(String(init.body));
        return { blueprint: blueprintVersion({}, 4), created: true };
      }
      throw new Error(`unexpected ${path}`);
    });
    const outcome = await resetInterfaceSection('prj_1', { fetchImpl: double.fetchImpl, accessToken: 't' });
    expect(outcome.version).toBe(4);
    expect(saved!.document.interface).toBeNull();
  });
});
