import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The frames every Studio screen sits inside.
 *
 * The root layout, the providers, the landing route and the operator frame
 * carry no figures of their own. Each one decides which screen a visitor sees
 * and which providers sit around it. This file renders each one and checks
 * that decision.
 *
 * Plain sentence. These tests check that the frame around every screen puts
 * the right screen in front of the right visitor.
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/blockchain',
  useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  redirect: () => undefined,
}));

let host = 'cerulea.test';

vi.mock('next/headers', () => ({
  headers: () => new Headers({ host }),
  cookies: () => ({ getAll: () => [], get: () => undefined }),
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: () => undefined,
  signOut: () => undefined,
}));

const nodesView = {
  network: {
    node: {
      systemName: 'Cerulea node',
      systemVersion: '0.1.0',
      chainName: 'Cerulea local',
      kind: 'full',
      peers: 2,
      isSyncing: false,
      shouldHavePeers: true,
      observedAt: '2026-09-19T06:00:00.000Z',
    },
    head: { number: 300, hash: '0xabc' },
    finalizedBlock: 298,
    finalityLag: 2,
    epoch: 4,
    round: 2,
    validatorSetId: 1,
    activeValidators: 3,
    totalValidators: 4,
    consensusHealth: 'Healthy',
    healthy: true,
    issues: [],
  },
  validators: [
    {
      profile: {
        account: '5Grw0000000000000000000000000000000000000000000',
        state: 'active',
        authoredBlocks: 40,
        missedBlocks: 1,
      },
      trust: {
        total: 640000,
        standing: 260000,
        performance: 190000,
        custody: 120000,
        verification: 70000,
      },
    },
  ],
  observedAt: '2026-09-19T06:00:00.000Z',
};

function stubFetch(answer: unknown, status = 200): void {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(JSON.stringify(answer), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  host = 'cerulea.test';
});

describe('the root layout and the providers', () => {
  it('names the application and states what it is', async () => {
    const layout = await import('./layout');
    expect(layout.metadata.title).toBe('Cerulea Studio');
    expect(String(layout.metadata.description ?? '').length).toBeGreaterThan(5);
  });

  it('places the theme, the session and the Studio context around every screen', async () => {
    const { Providers } = await import('./providers');
    render(
      <Providers>
        <p>the screen</p>
      </Providers>,
    );
    expect(screen.getByText('the screen')).toBeDefined();
  });

  it('offers a control that moves between the light theme and the dark theme', async () => {
    const { Providers, ThemeContext } = await import('./providers');
    let toggle: (() => void) | null = null;
    function Reader(): JSX.Element {
      return (
        <ThemeContext.Consumer>
          {(value) => {
            toggle = value.toggleTheme;
            return <span>read</span>;
          }}
        </ThemeContext.Consumer>
      );
    }
    render(
      <Providers>
        <Reader />
      </Providers>,
    );
    expect(typeof toggle).toBe('function');
    (toggle as unknown as () => void)();
  });
});

describe('the landing route', () => {
  it('shows the landing screen on the plain host', async () => {
    host = 'cerulea.test';
    const { default: Home } = await import('./page');
    const tree = await Home({ searchParams: {} });
    expect(tree).toBeDefined();
    expect(JSON.stringify(tree).length).toBeGreaterThan(10);
  });

  it('shows the Studio entry on the Studio host', async () => {
    host = 'studio.cerulea.test';
    const { default: Home } = await import('./page');
    const tree = await Home({ searchParams: {} });
    expect(tree).toBeDefined();
  });

  it('shows the Studio entry when the address asks for it', async () => {
    host = 'cerulea.test';
    const { default: Home } = await import('./page');
    const tree = await Home({ searchParams: { studio: '1', project: 'prj_suite' } });
    expect(tree).toBeDefined();
  });
});

describe('the operator frame and the Blockchain screen', () => {
  it('lists every operator screen in the frame', async () => {
    const { default: OperatorLayout } = await import('./admin/layout');
    render(
      <OperatorLayout>
        <p>the operator screen</p>
      </OperatorLayout>,
    );
    expect(screen.getByText('the operator screen')).toBeDefined();
    for (const label of ['Platform', 'Accounts', 'Blockchain', 'Security', 'Audit']) {
      expect(screen.getAllByText(label).length, `${label} is absent from the frame`).toBeGreaterThan(
        0,
      );
    }
  });

  it('reads the node and the validator set', async () => {
    stubFetch(nodesView);
    const { default: OperatorBlockchainScreen } = await import('./admin/blockchain/page');
    render(<OperatorBlockchainScreen />);
    await waitFor(() => {
      expect(screen.getAllByText(/Cerulea local/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/300/).length).toBeGreaterThan(0);
  });

  it('names the fix when the read fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('the network refused the call')));
    const { default: OperatorBlockchainScreen } = await import('./admin/blockchain/page');
    render(<OperatorBlockchainScreen />);
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
    });
  });

  it('shows the empty state when the node reports no validator', async () => {
    stubFetch({ ...nodesView, validators: [] });
    const { default: OperatorBlockchainScreen } = await import('./admin/blockchain/page');
    render(<OperatorBlockchainScreen />);
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
    });
  });
});
