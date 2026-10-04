import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SUITE_CATALOGUE } from '@/components/billing/catalogue.fixture';
import PricingPage, { pricingDivision, tierAccent } from './PricingPage';

/**
 * The pricing screen over the priced catalogue.
 *
 * The tiers and add-ons on the screen come from the catalogue route alone,
 * filtered to the division the address, the path or the cookie names. The
 * checkout sends that division with the tier.
 */

const state = vi.hoisted(() => ({ search: '', signedIn: false }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.search),
}));

const opened = vi.hoisted(() => vi.fn());

vi.mock('@/components/billing/open-address', () => ({ openAddress: opened }));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: state.signedIn ? { user: { email: 'bela@cerulea.test' } } : null,
    status: state.signedIn ? 'authenticated' : 'unauthenticated',
  }),
}));

function serve(table: Record<string, { status?: number; body: unknown }>) {
  const seen: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      seen.push({ url, method, body: typeof init.body === 'string' ? JSON.parse(init.body) : null });
      const planned = table[`${method} ${url}`] ?? table[`${method} ${url.split('?')[0]}`];
      const answer = planned ?? { status: 500, body: { ok: false, error: `No answer planned for ${method} ${url}.` } };
      return new Response(JSON.stringify(answer.body), {
        status: answer.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return seen;
}

// The test browser has no smooth scroll.
Element.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  vi.unstubAllGlobals();
  state.search = '';
  state.signedIn = false;
  opened.mockReset();
});

describe('the pricing division', () => {
  it('reads the address first, then the path or cookie, then the dApps ladder', () => {
    expect(pricingDivision('govt', 'dapp')).toBe('govt');
    expect(pricingDivision('unknown', 'enterprise')).toBe('enterprise');
    expect(pricingDivision(null, null)).toBe('dapp');
  });

  it('gives every tier an accent colour', () => {
    expect(tierAccent('public_dapps')).toBe('#3b82f6');
    expect(tierAccent('a_new_tier')).toBe('#004AAD');
  });
});

describe('the pricing screen', () => {
  it('shows the tiers of the division named in the address, from the catalogue', async () => {
    state.search = 'division=govt';
    serve({ 'GET /api/billing/catalogue': { body: { ok: true, ...SUITE_CATALOGUE } } });
    render(<PricingPage />);
    await screen.findByText('Government Standard');
    expect(screen.getByText('$25,000')).toBeTruthy();
    expect(screen.queryByText('Public Dapps')).toBeNull();
    // The sales contact card joins the dApps ladder alone.
    expect(screen.queryByText('Contact Sales')).toBeNull();
    expect(screen.getByText(/Controls implemented, certification not held\./)).toBeTruthy();
  });

  it('shows the dApps ladder with the sales card on the main host and sends the division on checkout', async () => {
    const seen = serve({
      'GET /api/billing/catalogue': { body: { ok: true, ...SUITE_CATALOGUE } },
      'POST /api/billing/checkout': { body: { ok: true, url: '/pricing/success?division=dapp' } },
    });
    render(<PricingPage />);
    await screen.findByText('Public Dapps');
    expect(screen.getByText('Private Dapps')).toBeTruthy();
    expect(screen.getByText('Contact Sales')).toBeTruthy();

    await userEvent.click(screen.getAllByRole('button', { name: 'Select plan' })[1]);
    await screen.findByText('Add-ons for Private Dapps');
    // The add-ons of the chosen tier come from the catalogue.
    expect(screen.getByText('Extra RPC node')).toBeTruthy();
    expect(screen.getByText('Custom domain')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Continue without add-ons' }));
    await waitFor(() => expect(opened).toHaveBeenCalledWith('/pricing/success?division=dapp'));
    expect(seen.find((entry) => entry.url === '/api/billing/checkout')?.body).toEqual({
      tierId: 'private_dapps',
      addons: [],
      division: 'dapp',
    });
  });

  it('sends an account already paying in the division to its billing screen', async () => {
    state.signedIn = true;
    state.search = 'division=dapp';
    serve({
      'GET /api/billing/catalogue': { body: { ok: true, ...SUITE_CATALOGUE } },
      'GET /api/billing/subscription?division=dapp': {
        body: { ok: true, subscription: { id: 'sub_1', tierId: 'public_dapps', status: 'active' }, tier: SUITE_CATALOGUE.divisions[0].tiers[0] },
      },
    });
    render(<PricingPage />);
    await waitFor(() => expect(opened).toHaveBeenCalledWith('/dashboard/billing?division=dapp'));
  });

  it('shows the failure and a Read again control when the catalogue read fails', async () => {
    serve({ 'GET /api/billing/catalogue': { status: 503, body: { error: 'Cerulea APIs at x did not answer. Start it.' } } });
    render(<PricingPage />);
    await screen.findByText('Cerulea APIs at x did not answer. Start it.');
    expect(screen.getByRole('button', { name: 'Read again' })).toBeTruthy();
  });
});
