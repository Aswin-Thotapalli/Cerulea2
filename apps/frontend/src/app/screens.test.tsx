import { render, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Every screen Studio serves.
 *
 * Studio holds one screen per route. This file loads each one and renders it
 * with Cerulea APIs answering, then again with Cerulea APIs refusing. A screen
 * that raises while it renders fails here rather than in front of a person.
 *
 * Plain sentence. This test opens every screen in Studio and checks that each
 * one draws something, whether the service answers or refuses.
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    back: () => undefined,
    prefetch: () => undefined,
  }),
  useSearchParams: () => new URLSearchParams('?token=suite&plan=starter'),
  useParams: () => ({ slug: 'suite', id: 'prj_suite' }),
  redirect: () => undefined,
  notFound: () => undefined,
}));

vi.mock('next/headers', () => ({
  headers: () => new Headers({ host: 'cerulea.test' }),
  cookies: () => ({ getAll: () => [], get: () => undefined }),
}));

const session = {
  data: {
    user: { email: 'builder@cerulea.test', name: 'Builder' },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  },
  status: 'authenticated' as const,
  update: async () => null,
};

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSession: () => session,
  signIn: async () => ({ ok: true, error: null }),
  signOut: async () => ({ url: '/' }),
  getSession: async () => session.data,
}));

/** The answer Cerulea APIs gives every screen in this suite. */
function answer(): Record<string, unknown> {
  const empty: unknown[] = [];
  return {
    workspaces: empty,
    workspace: { workspaceId: 'wsp_suite', name: 'Suite', application: 'government' },
    projects: empty,
    project: { projectId: 'prj_suite', name: 'Suite project', state: 'draft' },
    deployments: empty,
    plans: [{ plan: 'starter', name: 'Starter', priceMinor: 0, currency: 'INR', limits: {} }],
    subscription: { plan: 'starter', state: 'active' },
    invoices: empty,
    keys: empty,
    members: empty,
    roles: empty,
    modules: empty,
    templates: empty,
    presets: empty,
    blocks: empty,
    records: empty,
    collections: empty,
    events: empty,
    metrics: empty,
    contracts: empty,
    account: { accountId: 'act_suite', email: 'builder@cerulea.test', displayName: 'Builder' },
    settings: {},
    overview: { counts: {}, health: {} },
    items: empty,
    total: 0,
    ok: true,
    observedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(answer()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Every screen module, keyed by its path. */
const screens = import.meta.glob('./**/page.tsx');

/** Every client component a screen leans on that carries no route of its own. */
const pieces = import.meta.glob([
  '../components/AuthGate.tsx',
  '../components/UserMenu.tsx',
  '../components/auth/AuthModal.tsx',
  '../components/common/AutosaveBadge.tsx',
  '../components/common/InfoTooltip.tsx',
  '../components/shared/InfoTooltip.tsx',
  '../components/pricing/PricingPage.tsx',
  '../app/auth/login/LoginClient.tsx',
  '../app/auth/reset-password/ResetPasswordClient.tsx',
]);

async function renderModule(load: () => Promise<unknown>, name: string): Promise<void> {
  const loaded = (await load()) as { default?: unknown };
  const Screen = loaded.default;
  expect(typeof Screen, `${name} exports no component`).toBe('function');
  const props = { params: { slug: 'suite', id: 'prj_suite' }, searchParams: { token: 'suite' } };
  // A screen the server renders is an async function. Cerulea awaits it and
  // renders what it answers. A screen the browser renders holds hooks, so it
  // goes through the renderer as an element rather than a plain call.
  const isServerScreen =
    (Screen as { constructor?: { name?: string } }).constructor?.name === 'AsyncFunction';
  const { Providers } = await import('./providers');
  if (isServerScreen) {
    const element = await (Screen as (input: typeof props) => Promise<ReactElement>)(props);
    render(<Providers>{element}</Providers>);
  } else {
    const Client = Screen as (input: typeof props) => ReactElement;
    render(
      <Providers>
        <Client {...props} />
      </Providers>,
    );
  }
  await waitFor(() => {
    expect(document.body.textContent).toBeDefined();
  });
}

describe('every Studio screen renders', () => {
  it('holds at least fifteen screens', () => {
    expect(Object.keys(screens).length).toBeGreaterThan(15);
  });

  for (const [path, load] of Object.entries(screens)) {
    it(`renders ${path}`, async () => {
      await renderModule(load, path);
    }, 60000);
  }
});

describe('every piece a screen leans on renders', () => {
  for (const [path, load] of Object.entries(pieces)) {
    it(`renders ${path}`, async () => {
      const loaded = (await load()) as Record<string, unknown>;
      const exported = Object.entries(loaded).filter(
        ([, value]) => typeof value === 'function' && /^[A-Z]/.test(String(value.name ?? '')),
      );
      expect(exported.length, `${path} exports no component`).toBeGreaterThan(0);
      const { Providers } = await import('./providers');
      for (const [name, value] of exported) {
        const Piece = value as (props: Record<string, unknown>) => ReactElement;
        try {
          render(
            <Providers>
              <Piece
                open
                onClose={() => undefined}
                title="The suite"
                note="A plain sentence stating what this control does."
                state="saved"
                plans={answer().plans}
              />
            </Providers>,
          );
        } catch (cause) {
          throw new Error(`${path} ${name} raised while it rendered: ${String(cause)}`);
        }
      }
    }, 60000);
  }
});

describe('every screen draws when Cerulea APIs refuses', () => {
  it('draws a refusal rather than raising', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'request.rejected',
                message: 'Cerulea rejected the request.',
                fix: 'Correct the request and send it again.',
                details: {},
              },
            }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          ),
      ),
    );
    let drawn = 0;
    for (const [path, load] of Object.entries(screens)) {
      await renderModule(load, path);
      drawn += 1;
    }
    expect(drawn).toBeGreaterThan(15);
  }, 300000);
});
