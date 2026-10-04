import { describe, expect, it, vi } from 'vitest';

import {
  carryApplicationRequest,
  choiceCookieName,
  firstScreenFor,
  readChoice,
  screenForRoute,
  studioApplicationPath,
  writeChoice,
} from './application';
import type { InterfaceSection } from '@/lib/interface/types';

const screen = (id: string, kind: 'list' | 'detail' | 'create' | 'approval', route: string, roles: string[]) => ({
  id,
  kind,
  route,
  roles,
  title_key: `screen.${id}.title`,
  offline_capture: false,
  components: [],
});

const section = {
  screens: [
    screen('shipment_detail', 'detail', '/shipment/{shipment_id}', ['inspector', 'buyer']),
    screen('shipment_list', 'list', '/shipment', ['inspector', 'buyer']),
    screen('shipment_create', 'create', '/shipment/new', ['inspector']),
    screen('release_approval', 'approval', '/release/approvals', ['inspector']),
  ],
  theme: { colour_light: [], colour_dark: [], type_scale: [], spacing: [] },
  breakpoints: [],
  translations: [],
  conflict_rules: [],
  default_language: 'en',
} as unknown as InterfaceSection;

describe('screenForRoute', () => {
  it('finds the list screen of a collection route', () => {
    expect(screenForRoute(section, '/shipment', 'buyer')?.screen.id).toBe('shipment_list');
  });

  it('captures the key of a detail route', () => {
    const found = screenForRoute(section, '/shipment/SHP-0042', 'buyer');
    expect(found?.screen.id).toBe('shipment_detail');
    expect(found?.key).toBe('SHP-0042');
  });

  it('matches an approval route and a route with a trailing slash', () => {
    expect(screenForRoute(section, '/release/approvals/', 'inspector')?.screen.id).toBe('release_approval');
    expect(screenForRoute(section, 'release/approvals', undefined)?.screen.id).toBe('release_approval');
  });

  it('answers nothing for a route no screen serves', () => {
    expect(screenForRoute(section, '/invoices', 'buyer')).toBeUndefined();
  });

  it('opens on the first list screen the role reaches', () => {
    expect(firstScreenFor(section, 'buyer')?.id).toBe('shipment_list');
    expect(firstScreenFor({ ...section, screens: [section.screens[0]] }, 'buyer')?.id).toBe('shipment_detail');
  });
});

describe('the choice cookie', () => {
  it('round trips the role, the deployment and the width', () => {
    const value = writeChoice({ role: 'buyer', deployment: 'dep_1', width: 'phone', mode: 'dark', language: 'en' });
    expect(readChoice(value)).toEqual({ role: 'buyer', deployment: 'dep_1', width: 'phone', mode: 'dark', language: 'en' });
    expect(readChoice(undefined)).toEqual({});
    expect(readChoice('not json')).toEqual({});
    expect(choiceCookieName('prj_01m4/odd')).toBe('cerulea.application.prj_01m4_odd');
  });
});

describe('carryApplicationRequest', () => {
  it('carries the token across and points the application address at Studio', async () => {
    const fetchImpl = vi.fn(async (address: string | URL | Request, init?: RequestInit) => {
      expect(String(address)).toBe('http://apis.test/applications/prj_1/screens/shipment_list?role=buyer&deployment=dep_1');
      expect((init?.headers as Record<string, string>).authorization).toBe('Bearer token-1');
      return new Response('<a href="/applications/prj_1/shipment">x</a><script src="/applications/prj_1/client.js"></script>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-other': 'dropped' },
      });
    });
    const answer = await carryApplicationRequest({
      projectId: 'prj_1',
      rest: 'screens/shipment_list',
      search: new URLSearchParams({ role: 'buyer', deployment: 'dep_1' }),
      method: 'GET',
      options: { fetchImpl: fetchImpl as unknown as typeof fetch, accessToken: 'token-1', baseUrl: 'http://apis.test' },
    });
    expect(answer.status).toBe(200);
    expect(answer.headers).toEqual({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    expect(answer.body).toBe(`<a href="${studioApplicationPath('prj_1')}/shipment">x</a><script src="${studioApplicationPath('prj_1')}/client.js"></script>`);
  });

  it('hands a binary answer back untouched and names the failure when Cerulea APIs is away', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetchImpl = vi.fn(async () => new Response(bytes, { status: 200, headers: { 'content-type': 'image/png' } }));
    const answer = await carryApplicationRequest({ projectId: 'prj_1', rest: 'assets/logo.png', search: new URLSearchParams(), method: 'GET', options: { fetchImpl: fetchImpl as unknown as typeof fetch, baseUrl: 'http://apis.test' } });
    expect(new Uint8Array(answer.body as ArrayBuffer)).toEqual(bytes);

    const away = vi.fn(async () => {
      throw new Error('refused');
    });
    const failed = await carryApplicationRequest({ projectId: 'prj_1', rest: 'client.js', search: new URLSearchParams(), method: 'GET', options: { fetchImpl: away as unknown as typeof fetch, baseUrl: 'http://apis.test' } });
    expect(failed.status).toBe(503);
    expect(String(failed.body)).toContain('did not answer');
  });
});
