import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadCatalogue, loadModules, loadTemplates } from './load';

afterEach(() => {
  vi.unstubAllGlobals();
});

function answer(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } });
}

describe('reading the catalogue', () => {
  it('reads both lists from their routes', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        return answer(
          200,
          JSON.stringify(url === '/api/modules' ? [{ id: 'berth_booking' }] : [{ id: 'port_register' }]),
        );
      }),
    );
    await expect(loadCatalogue()).resolves.toEqual({
      modules: [{ id: 'berth_booking' }],
      templates: [{ id: 'port_register' }],
    });
    expect(urls.sort()).toEqual(['/api/modules', '/api/templates']);
  });

  it('names the fix when the route cannot be reached', async () => {
    const refused = new TypeError('refused');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(refused)));
    const failure = (await loadModules().catch((cause: unknown) => cause)) as Error;
    expect(failure.message).toBe(
      'Cerulea could not read the module catalogue. Check that Studio is running, then open this screen again.',
    );
    expect(failure.cause).toBe(refused);
  });

  it('names the status when the route refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer(503, '[]')));
    await expect(loadTemplates()).rejects.toThrowError(
      'Cerulea could not read the template catalogue. The catalogue route answered 503. Restart Studio, then open this screen again.',
    );
  });

  it('names the fix when the answer holds no list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer(200, '{"modules": []}')));
    await expect(loadModules()).rejects.toThrowError(
      'Cerulea read the module catalogue and found no list. Restart Studio, then open this screen again.',
    );
  });

  it('names the same fix when the answer cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer(200, 'not json')));
    await expect(loadTemplates()).rejects.toThrowError(
      'Cerulea read the template catalogue and found no list. Restart Studio, then open this screen again.',
    );
  });
});
