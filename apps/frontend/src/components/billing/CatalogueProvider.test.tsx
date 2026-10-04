import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { SUITE_CATALOGUE } from './catalogue.fixture';
import {
  CatalogueProvider,
  catalogueHelpers,
  formatCents,
  useCatalogue,
} from './CatalogueProvider';
import { billingDivisionChoice, holdsActivePlan, paidDivisions } from './plan-standing';

describe('the catalogue helpers', () => {
  const helpers = catalogueHelpers(SUITE_CATALOGUE);

  it('finds tiers and add-ons across every division', () => {
    expect(helpers.tiers.map((tier) => tier.id)).toEqual(['public_dapps', 'private_dapps', 'govt_standard']);
    expect(helpers.tierById('govt_standard')?.name).toBe('Government Standard');
    expect(helpers.tierById(null)).toBeUndefined();
    expect(helpers.addonById('extra_rpc')?.maxQuantity).toBe(4);
    expect(helpers.divisionForTier('govt_standard')).toBe('govt');
    expect(helpers.tiersForDivision('dapp')).toHaveLength(2);
    expect(helpers.addonsForDivision('govt')).toHaveLength(0);
  });

  it('offers each add-on to its eligible tiers alone', () => {
    expect(helpers.eligibleAddons('public_dapps').map((addon) => addon.id)).toEqual(['extra_rpc']);
    expect(helpers.eligibleAddons('private_dapps').map((addon) => addon.id)).toEqual(['extra_rpc', 'custom_domain']);
    expect(helpers.eligibleAddons(null)).toEqual([]);
    expect(helpers.isAddonEligible('custom_domain', 'public_dapps')).toBe(false);
  });

  it('keeps the add-ons a new tier offers and names the ones it drops', () => {
    const outcome = helpers.reconcile(
      [{ addonId: 'extra_rpc', quantity: 2 }, { addonId: 'custom_domain', quantity: 1 }, { addonId: 'unknown', quantity: 1 }],
      'public_dapps',
    );
    expect(outcome.kept).toEqual([{ addonId: 'extra_rpc', quantity: 2 }]);
    expect(outcome.removedNames).toEqual(['Custom domain', 'unknown']);
  });

  it('adds the tier, the recurring add-ons and the one time parts into the amounts due', () => {
    const breakdown = helpers.breakdown('private_dapps', [
      { addonId: 'extra_rpc', quantity: 9 },
      { addonId: 'custom_domain', quantity: 1 },
    ]);
    // The quantity is capped at the add-on maximum of 4.
    expect(breakdown.tierCents).toBe(9000);
    expect(breakdown.addonsRecurringCents).toBe(1500 * 4 + 500);
    expect(breakdown.addonsOneTimeCents).toBe(2000);
    expect(breakdown.dueNowCents).toBe(9000 + 6500 + 2000);
    expect(breakdown.monthlyCents).toBe(9000 + 6500);
  });

  it('names the export action of a division', () => {
    expect(helpers.exportActionFor('dapp')?.eligibleTierIds).toEqual(['private_dapps']);
    expect(helpers.exportActionFor('govt')).toBeNull();
  });

  it('formats cents as US dollars', () => {
    expect(formatCents(4000)).toBe('$40');
    expect(formatCents(1250)).toBe('$12.5');
  });
});

describe('the plan standing', () => {
  const answer = {
    ok: true,
    divisions: [
      { division: 'dapp' as const, access: true, tierId: 'public_dapps', tierName: 'Public Dapps', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: null, workspaceId: 'w1', pricingPath: '/pricing?division=dapp' },
      { division: 'enterprise' as const, access: false, tierId: null, tierName: null, status: null, cancelAtPeriodEnd: false, currentPeriodEnd: null, workspaceId: null, pricingPath: '/pricing?division=enterprise' },
      { division: 'govt' as const, access: true, tierId: 'govt_standard', tierName: 'Government Standard', status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: null, workspaceId: 'w3', pricingPath: '/pricing?division=govt' },
    ],
  };

  it('sees an active plan and lists the paid divisions', () => {
    expect(holdsActivePlan(answer)).toBe(true);
    expect(holdsActivePlan({ ok: true, divisions: [] })).toBe(false);
    expect(holdsActivePlan(null)).toBe(false);
    expect(paidDivisions(answer)).toEqual(['dapp', 'govt']);
  });

  it('opens the billing screen on the named division when paid, else the cookie, else the first paid, else the named', () => {
    expect(billingDivisionChoice(answer, 'govt', 'dapp')).toBe('govt');
    expect(billingDivisionChoice(answer, 'enterprise', 'govt')).toBe('govt');
    expect(billingDivisionChoice(answer, 'enterprise', null)).toBe('dapp');
    expect(billingDivisionChoice({ ok: true, divisions: [] }, 'enterprise', null)).toBe('enterprise');
    expect(billingDivisionChoice(null, null, null)).toBe('dapp');
  });
});

function Reader() {
  const catalogue = useCatalogue();
  if (!catalogue.ready) return <p>reading</p>;
  if (catalogue.error) return <p>failure: {catalogue.error}</p>;
  return <p>tiers: {catalogue.tiers.map((tier) => tier.name).join(', ')}</p>;
}

describe('the catalogue provider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the catalogue once and serves it to every reader', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, ...SUITE_CATALOGUE }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CatalogueProvider>
        <Reader />
        <Reader />
      </CatalogueProvider>,
    );
    await waitFor(() => expect(screen.getAllByText('tiers: Public Dapps, Private Dapps, Government Standard')).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls as unknown[][])[0][0])).toBe('/api/billing/catalogue');
  });

  it('names the failure when Cerulea APIs refuses the catalogue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Cerulea APIs at x did not answer. Start it.', code: 'service.unreachable' }), { status: 503, headers: { 'content-type': 'application/json' } })));
    render(
      <CatalogueProvider>
        <Reader />
      </CatalogueProvider>,
    );
    await waitFor(() => expect(screen.getByText('failure: Cerulea APIs at x did not answer. Start it.')).toBeTruthy());
  });

  it('reads an empty catalogue outside a provider', () => {
    render(<Reader />);
    expect(screen.getByText('reading')).toBeTruthy();
  });
});
