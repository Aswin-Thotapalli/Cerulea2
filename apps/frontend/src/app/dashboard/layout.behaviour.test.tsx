import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The Dashboard frame reads the current address from the router.
// Each test sets the address it needs before rendering.
const where = vi.hoisted(() => ({ pathname: '/dashboard' as string | null }));

vi.mock('next/navigation', () => ({
  usePathname: () => where.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

import DashboardLayout from './layout';
import Loading from './loading';

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

function selectedLabels(): string[] {
  const nav = screen.getByRole('navigation');
  return within(nav)
    .getAllByRole('link')
    .filter((link) => link.classList.contains('Mui-selected'))
    .map((link) => link.getAttribute('href') ?? '');
}

afterEach(() => {
  where.pathname = '/dashboard';
});

describe('the Dashboard frame', { timeout: 30000 }, () => {
  it('lists every Dashboard area in order with its address', () => {
    renderFrame('/dashboard');
    const nav = screen.getByRole('navigation');
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(
      EXPECTED.map(([label, href]) => [label, href]),
    );
    expect(within(nav).getByText('Cerulea')).toBeInTheDocument();
    expect(within(nav).getByText('New Project')).toBeInTheDocument();
    expect(within(nav).getByText('Cerulea Studio v0.1')).toBeInTheDocument();
  });

  it('renders the panel it wraps inside the main region', () => {
    renderFrame('/dashboard');
    expect(within(screen.getByRole('main')).getByText('Panel body')).toBeInTheDocument();
  });

  it('marks only the Overview as active on the Dashboard root', () => {
    renderFrame('/dashboard');
    expect(selectedLabels()).toEqual(['/dashboard']);
  });

  it('marks the area whose address opens the current path', () => {
    renderFrame('/dashboard/keys');
    expect(selectedLabels()).toEqual(['/dashboard/keys']);
  });

  it('keeps an area active on a deeper address beneath it', () => {
    renderFrame('/dashboard/projects/p-7/history');
    expect(selectedLabels()).toEqual(['/dashboard/projects']);
  });

  it('marks nothing active when the router holds no path', () => {
    renderFrame(null);
    expect(selectedLabels()).toEqual([]);
  });

  it('narrows to icons and back when the edge control is pressed', async () => {
    const person = userEvent.setup();
    renderFrame('/dashboard/state');
    const nav = screen.getByRole('navigation');

    const narrow = within(nav).getByTestId('ChevronLeftIcon').closest('button');
    expect(narrow).not.toBeNull();
    await person.click(narrow as HTMLButtonElement);

    expect(within(nav).queryByText('Cerulea')).toBeNull();
    expect(within(nav).queryByText('New Project')).toBeNull();
    expect(within(nav).queryByText('Cerulea Studio v0.1')).toBeNull();
    expect(within(nav).queryByText('State Snapshots')).toBeNull();
    // The links stay in place and the active one keeps its mark.
    expect(within(nav).getAllByRole('link')).toHaveLength(EXPECTED.length);
    expect(selectedLabels()).toEqual(['/dashboard/state']);

    const widen = within(nav).getByTestId('ChevronRightIcon').closest('button');
    await person.click(widen as HTMLButtonElement);
    expect(within(nav).getByText('State Snapshots')).toBeInTheDocument();
    expect(within(nav).getByText('New Project')).toBeInTheDocument();
  });

  it('names each area in a tooltip while the list is narrow', async () => {
    const person = userEvent.setup();
    renderFrame('/dashboard');
    const nav = screen.getByRole('navigation');
    await person.click(within(nav).getByTestId('ChevronLeftIcon').closest('button') as HTMLElement);

    // The narrow list labels each row with the area name.
    expect(within(nav).getByLabelText('Governance')).toBeInTheDocument();
    await person.hover(within(nav).getByLabelText('Governance'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Governance');
  });

  it('shows no tooltip while the list is wide', async () => {
    const person = userEvent.setup();
    renderFrame('/dashboard');
    await person.hover(screen.getByRole('link', { name: 'Governance' }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  describe('the New Project control', () => {
    function withLocation(hostname: string, run: (target: { href: string }) => Promise<void>) {
      const original = window.location;
      const target = { hostname, href: `http://${hostname}/dashboard` };
      Object.defineProperty(window, 'location', { configurable: true, value: target });
      return run(target).finally(() => {
        Object.defineProperty(window, 'location', { configurable: true, value: original });
      });
    }

    it('opens the local Studio when the Dashboard runs on this machine', async () => {
      const person = userEvent.setup();
      renderFrame('/dashboard');
      await withLocation('dashboard.localhost', async (target) => {
        await person.click(screen.getByText('New Project'));
        expect(target.href).toBe('http://studio.localhost:3000');
      });
    });

    it('opens the hosted Studio from any other address', async () => {
      const person = userEvent.setup();
      renderFrame('/dashboard');
      await withLocation('dashboard.cerulea.io', async (target) => {
        await person.click(screen.getByText('New Project'));
        expect(target.href).toBe('https://studio.cerulea.io');
      });
    });
  });
});

describe('the Dashboard loading frame', () => {
  it('draws four figure cards and two lists of placeholder rows', () => {
    const { container } = render(<Loading />);
    const cards = container.querySelectorAll('.MuiCard-root');
    expect(cards).toHaveLength(6);
    // Two heading bars, two bars inside each of the four figure cards, five rows in each list.
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(2 + 4 * 2 + 5 + 5);
    expect(cards[4].querySelectorAll('.MuiSkeleton-root')).toHaveLength(5);
    expect(cards[5].querySelectorAll('.MuiSkeleton-root')).toHaveLength(5);
  });
});
