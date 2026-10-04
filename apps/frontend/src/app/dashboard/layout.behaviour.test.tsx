import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The Dashboard frame reads the current address from the router and the
// account from the session. Each test sets both before rendering.
const where = vi.hoisted(() => ({
  pathname: '/dashboard' as string | null,
  user: { name: 'Dana Mehta', plan: 'public_dapps' } as { name?: string; plan?: string } | null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => where.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: where.user ? { user: where.user } : null,
    status: where.user ? 'authenticated' : 'unauthenticated',
  }),
}));

import DashboardLayout from './layout';

const EXPECTED = [
  ['Overview', '/dashboard'],
  ['Projects', '/dashboard/projects'],
  ['Networks', '/dashboard/networks'],
  ['Nodes', '/dashboard/nodes'],
  ['Keys & Access', '/dashboard/keys'],
  ['Governance', '/dashboard/governance'],
  ['Smart Contracts', '/dashboard/contracts'],
  ['Audit Logs', '/dashboard/audit'],
  ['State Snapshots', '/dashboard/state'],
  ['Integrations', '/dashboard/integrations'],
  ['Billing', '/dashboard/billing'],
  ['Settings', '/dashboard/settings'],
] as const;

function renderFrame(pathname: string | null) {
  where.pathname = pathname;
  return render(
    <DashboardLayout>
      <p>Panel body</p>
    </DashboardLayout>,
  );
}

function navLinks() {
  const nav = screen.getByRole('navigation');
  return within(nav)
    .getAllByRole('link')
    .filter((link) => (link.getAttribute('href') ?? '').startsWith('/dashboard'));
}

afterEach(() => {
  where.pathname = '/dashboard';
  where.user = { name: 'Dana Mehta', plan: 'public_dapps' };
  vi.unstubAllGlobals();
});

describe('the Dashboard frame', { timeout: 30000 }, () => {
  it('lists every Dashboard area in its group and in order', () => {
    renderFrame('/dashboard');
    expect(navLinks().map((link) => [link.textContent, link.getAttribute('href')])).toEqual(
      EXPECTED.map(([label, href]) => [label, href]),
    );
    for (const group of ['PLATFORM', 'INFRASTRUCTURE', 'DEVELOP', 'MANAGE', 'ACCOUNT']) {
      expect(screen.getByText(group)).toBeInTheDocument();
    }
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });

  it('marks the area the address is inside', () => {
    renderFrame('/dashboard/networks');
    const selected = navLinks().filter((link) => link.classList.contains('Mui-selected'));
    expect(selected.map((link) => link.getAttribute('href'))).toEqual(['/dashboard/networks']);
  });

  it('marks Overview only on the Overview address', () => {
    renderFrame('/dashboard/projects');
    const selected = navLinks().filter((link) => link.classList.contains('Mui-selected'));
    expect(selected.map((link) => link.getAttribute('href'))).toEqual(['/dashboard/projects']);
  });

  it('names the tier the account holds in the footer chip', () => {
    renderFrame('/dashboard');
    expect(screen.getByText('Dana')).toBeInTheDocument();
    expect(screen.getByText('PUBLIC DAPPS')).toBeInTheDocument();
  });

  it('shows a retired tier id as itself and No plan for a free account', () => {
    where.user = { name: 'Dana Mehta', plan: 'plan_starter' };
    const first = renderFrame('/dashboard');
    expect(screen.getByText('PLAN_STARTER')).toBeInTheDocument();
    first.unmount();
    where.user = { name: 'Dana Mehta', plan: 'free' };
    renderFrame('/dashboard');
    expect(screen.getByText('NO PLAN')).toBeInTheDocument();
  });

  it('opens the Studio chooser on the current origin for a new project', async () => {
    const assigned: string[] = [];
    const realHref = window.location.href;
    const location = { ...window.location, origin: window.location.origin };
    Object.defineProperty(location, 'href', {
      set: (value: string) => assigned.push(value),
      get: () => realHref,
    });
    vi.stubGlobal('location', location);
    renderFrame('/dashboard');
    await userEvent.click(screen.getByText('New Project'));
    expect(assigned).toEqual([`${window.location.origin}/`]);
  });

  it('collapses to icons with a tooltip on each entry', async () => {
    renderFrame('/dashboard');
    await userEvent.click(screen.getByTestId('ChevronLeftIcon'));
    expect(screen.queryByText('PLATFORM')).toBeNull();
    expect(navLinks()).toHaveLength(EXPECTED.length);
    await userEvent.click(screen.getByTestId('ChevronRightIcon'));
    expect(screen.getByText('PLATFORM')).toBeInTheDocument();
  });
});
