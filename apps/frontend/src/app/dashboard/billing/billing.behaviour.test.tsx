import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SUITE_CATALOGUE } from '@/components/billing/catalogue.fixture';
import BillingPage from './page';

/**
 * The billing screen over the Studio billing routes.
 *
 * Every test answers the routes the screen reads and checks what the screen
 * shows and sends. No figure on the screen comes from anywhere but those
 * answers.
 */

const search = vi.hoisted(() => ({ value: '' }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search.value),
}));

type Answer = { status?: number; body: unknown };

function serve(table: Record<string, Answer | ((init: RequestInit) => Answer)>) {
  const seen: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      const key = `${method} ${url}`;
      seen.push({ url, method, body: typeof init.body === 'string' ? JSON.parse(init.body) : null });
      const planned = table[key] ?? table[`${method} ${url.split('?')[0]}`];
      const answer = planned
        ? typeof planned === 'function'
          ? planned(init)
          : planned
        : { status: 500, body: { ok: false, error: `No answer planned for ${key}.` } };
      return new Response(JSON.stringify(answer.body), {
        status: answer.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return seen;
}

const access = (divisions: { division: string; tierId: string | null; status?: string; cancelAtPeriodEnd?: boolean }[]) => ({
  ok: true,
  operator: false,
  divisions: divisions.map((entry) => ({
    division: entry.division,
    access: entry.tierId !== null,
    tierId: entry.tierId,
    tierName: null,
    status: entry.status ?? (entry.tierId ? 'active' : null),
    cancelAtPeriodEnd: entry.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: null,
    workspaceId: entry.tierId ? `w_${entry.division}` : null,
    pricingPath: `/pricing?division=${entry.division}`,
  })),
});

const dappSubscription = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  division: 'dapp',
  application: 'dapps',
  workspaceId: 'w_dapp',
  subscription: {
    id: 'sub_1',
    tierId: 'private_dapps',
    status: 'active',
    billing: 'recurring',
    currentPeriodEnd: '2026-11-02T06:58:06.172Z',
    cancelAtPeriodEnd: false,
    ...overrides,
  },
  tier: SUITE_CATALOGUE.divisions[0].tiers[1],
  addons: [{ addonId: 'extra_rpc', quantity: 2 }],
  oneTimePurchases: [],
  entitlement: { features: [], limits: {} },
});

const customer = { ok: true, name: 'Bela Nair', phone: null, address: { line1: '1 Road', line2: null, city: 'Hyderabad', state: 'Telangana', postal_code: '500001', country: 'IN' }, taxIds: [{ id: 'tax_1', type: 'in_gst', value: '36AAAAA0000A1Z5', verification: 'verified' }] };

const invoices = {
  ok: true,
  hasMore: false,
  invoices: [
    { id: 'inv_1', number: 'CB-0001', date: 1760000000, amountPaid: 9000, amountDue: 0, currency: 'usd', status: 'paid', pdfUrl: '/api/billing/invoices/inv_1/document?format=pdf', viewUrl: '/api/billing/invoices/inv_1/document?format=html', description: null },
  ],
};

const catalogue = { ok: true, ...SUITE_CATALOGUE };

afterEach(() => {
  vi.unstubAllGlobals();
  search.value = '';
});

describe('the billing screen', () => {
  it('shows the plan, the division tiers, the add-ons, the details and the invoices from the routes', async () => {
    const seen = serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'private_dapps' }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=dapp': { body: dappSubscription() },
      'GET /api/billing/customer?division=dapp': { body: customer },
      'GET /api/billing/invoices?division=dapp': { body: invoices },
    });
    render(<BillingPage />);

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Private Dapps' }).length).toBeGreaterThan(0));
    // The tier switcher lists the tiers of the division alone.
    expect(screen.getByText('Current plan')).toBeTruthy();
    expect(screen.getByText('Public Dapps')).toBeTruthy();
    expect(screen.queryByText('Government Standard')).toBeNull();
    // The export card shows for a tier the export action names.
    expect(screen.getByText('Chain data export')).toBeTruthy();
    // The add-on the subscription holds is on, with its quantity.
    expect(screen.getByText('Extra RPC node')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    // The billing details and the invoice from the routes.
    expect(await screen.findByText('1 Road, Hyderabad, Telangana, 500001, IN')).toBeTruthy();
    expect(screen.getByText('36AAAAA0000A1Z5')).toBeTruthy();
    expect(await screen.findByText('CB-0001')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Download invoice CB-0001 as PDF' }).getAttribute('href')).toBe('/api/billing/invoices/inv_1/document?format=pdf');
    // One division paid means no switcher.
    expect(screen.queryByRole('tablist', { name: 'Division' })).toBeNull();
    expect(seen.map((entry) => entry.url)).toContain('/api/billing/subscription?division=dapp');
  });

  it('offers the paid divisions and reads the other one on a switch', async () => {
    const seen = serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'private_dapps' }, { division: 'govt', tierId: 'govt_standard' }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=dapp': { body: dappSubscription() },
      'GET /api/billing/subscription?division=govt': {
        body: { ...dappSubscription(), division: 'govt', subscription: { id: 'sub_2', tierId: 'govt_standard', status: 'active', billing: 'one_time', currentPeriodEnd: null, cancelAtPeriodEnd: false }, tier: SUITE_CATALOGUE.divisions[1].tiers[0], addons: [] },
      },
      'GET /api/billing/customer': { body: customer },
      'GET /api/billing/invoices': { body: invoices },
    });
    render(<BillingPage />);
    const switcher = await screen.findByRole('tablist', { name: 'Division' });
    await userEvent.click(within(switcher).getByText('Government'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Government Standard' }).length).toBeGreaterThan(0));
    expect(screen.getByText('$25,000 one time licence, base plan')).toBeTruthy();
    expect(seen.map((entry) => entry.url)).toContain('/api/billing/subscription?division=govt');
  });

  it('opens on the division named in the address when the account pays there', async () => {
    search.value = 'division=govt';
    serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'private_dapps' }, { division: 'govt', tierId: 'govt_standard' }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=govt': {
        body: { ...dappSubscription(), division: 'govt', subscription: { id: 'sub_2', tierId: 'govt_standard', status: 'active', billing: 'one_time', currentPeriodEnd: null, cancelAtPeriodEnd: false }, tier: SUITE_CATALOGUE.divisions[1].tiers[0], addons: [] },
      },
      'GET /api/billing/customer': { body: customer },
      'GET /api/billing/invoices': { body: invoices },
    });
    render(<BillingPage />);
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Government Standard' }).length).toBeGreaterThan(0));
  });

  it('shows the pending end with Resume, which calls the resume route with the division', async () => {
    const seen = serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'private_dapps', cancelAtPeriodEnd: true }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=dapp': { body: dappSubscription({ cancelAtPeriodEnd: true }) },
      'GET /api/billing/customer': { body: customer },
      'GET /api/billing/invoices': { body: invoices },
      'POST /api/billing/subscription/resume': { body: { ok: true } },
    });
    render(<BillingPage />);
    const resume = await screen.findByRole('button', { name: 'Resume subscription' });
    expect(screen.getByText(/The subscription ends at the close of the current billing period/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel subscription' })).toBeNull();
    await userEvent.click(resume);
    await waitFor(() => expect(seen.find((entry) => entry.url === '/api/billing/subscription/resume')).toBeTruthy());
    expect(seen.find((entry) => entry.url === '/api/billing/subscription/resume')?.body).toEqual({ division: 'dapp' });
    await screen.findByText('Subscription resumed.');
  });

  it('cancels at the end of the period after the confirm dialog', async () => {
    const seen = serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'private_dapps' }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=dapp': { body: dappSubscription() },
      'GET /api/billing/customer': { body: customer },
      'GET /api/billing/invoices': { body: invoices },
      'POST /api/billing/subscription/cancel': { body: { ok: true, atPeriodEnd: true } },
    });
    render(<BillingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel subscription' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Access to Private Dapps and every add-on stays/)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel subscription' }));
    await waitFor(() => expect(seen.find((entry) => entry.url === '/api/billing/subscription/cancel')?.body).toEqual({ atPeriodEnd: true, division: 'dapp' }));
  });

  it('names the add-ons a tier switch keeps and drops, then sends the change', async () => {
    const seen = serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'private_dapps' }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=dapp': { body: { ...dappSubscription(), addons: [{ addonId: 'extra_rpc', quantity: 1 }, { addonId: 'custom_domain', quantity: 1 }] } },
      'GET /api/billing/customer': { body: customer },
      'GET /api/billing/invoices': { body: invoices },
      'POST /api/billing/subscription/change-tier': { body: { ok: true, tierId: 'public_dapps', removedAddons: ['Custom domain'] } },
    });
    render(<BillingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Switch to this plan' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Removed, since this plan offers none of these')).toBeTruthy();
    expect(within(dialog).getByText('Custom domain')).toBeTruthy();
    expect(within(dialog).getByText('Continued, unchanged')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm switch' }));
    await waitFor(() => expect(seen.find((entry) => entry.url === '/api/billing/subscription/change-tier')?.body).toEqual({ tierId: 'public_dapps', division: 'dapp' }));
    await screen.findByText(/Switched to Public Dapps\. Removed: Custom domain\./);
  });

  it('sends the reader to the pricing of the division when no subscription exists', async () => {
    serve({
      'GET /api/billing/access': { body: access([{ division: 'enterprise', tierId: null }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=enterprise': { body: { ok: true, division: 'enterprise', subscription: null, tier: null, addons: [], oneTimePurchases: [] } },
    });
    document.cookie = 'cerulea.division=enterprise';
    render(<BillingPage />);
    const link = await screen.findByRole('link', { name: 'Choose a plan' });
    expect(link.getAttribute('href')).toBe('/pricing?division=enterprise');
    expect(screen.getByText(/no active Enterprise subscription yet/)).toBeTruthy();
    document.cookie = 'cerulea.division=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('names a plan outside the catalogue rather than inventing a tier', async () => {
    serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'plan_starter' }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=dapp': { body: { ...dappSubscription({ tierId: 'plan_starter' }), tier: null } },
    });
    render(<BillingPage />);
    await screen.findByText(/runs on a plan outside the current catalogue/);
  });

  it('shows the failure and a Read again control when the subscription read fails', async () => {
    serve({
      'GET /api/billing/access': { body: access([{ division: 'dapp', tierId: 'private_dapps' }]) },
      'GET /api/billing/catalogue': { body: catalogue },
      'GET /api/billing/subscription?division=dapp': { status: 503, body: { ok: false, error: 'Cerulea APIs at x did not answer. Start Cerulea APIs.' } },
    });
    render(<BillingPage />);
    await screen.findByText('Cerulea APIs at x did not answer. Start Cerulea APIs.');
    expect(screen.getByRole('button', { name: 'Read again' })).toBeTruthy();
  });
});
