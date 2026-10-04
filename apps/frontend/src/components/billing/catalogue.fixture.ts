// apps/frontend/src/components/billing/catalogue.fixture.ts
// A small catalogue in the shape Cerulea APIs publishes, for the billing and
// pricing tests. The prices are the suite's own and stand for no real tier.

import type { Catalogue } from './CatalogueProvider';

export const SUITE_CATALOGUE: Catalogue = {
  currency: 'usd',
  complianceSentence: 'Controls implemented, certification not held.',
  divisions: [
    {
      division: 'dapp',
      application: 'dapps',
      currency: 'usd',
      tiers: [
        { id: 'public_dapps', division: 'dapp', currency: 'usd', billing: 'recurring', name: 'Public Dapps', priceCents: 4000, priceKey: 'public_dapps', blurb: 'Public.', specs: [{ label: 'Validators', value: '7' }], provisioningActionKey: 'public' },
        { id: 'private_dapps', division: 'dapp', currency: 'usd', billing: 'recurring', name: 'Private Dapps', priceCents: 9000, priceKey: 'private_dapps', blurb: 'Private.', specs: [], provisioningActionKey: 'private' },
      ],
      addons: [
        { id: 'extra_rpc', division: 'dapp', currency: 'usd', name: 'Extra RPC node', billingType: 'recurring', recurringPriceCents: 1500, recurringPriceKey: 'rpc', oneTimePriceCents: null, oneTimePriceKey: null, eligibleTierIds: ['public_dapps', 'private_dapps'], maxQuantity: 4, blurb: 'More capacity.', provisioningActionKey: 'rpc' },
        { id: 'custom_domain', division: 'dapp', currency: 'usd', name: 'Custom domain', billingType: 'recurring_plus_one_time', recurringPriceCents: 500, recurringPriceKey: 'dom', oneTimePriceCents: 2000, oneTimePriceKey: 'dom1', eligibleTierIds: ['private_dapps'], maxQuantity: 1, blurb: 'A name of our own.', provisioningActionKey: 'domain' },
      ],
      exportAction: { id: 'export_chain_data', name: 'Chain data export', billingType: 'pay_per_use', priceCents: 1000, priceKey: 'export', currency: 'usd', eligibleTierIds: ['private_dapps'], blurb: 'Export.', provisioningActionKey: 'export' },
      entitlements: {},
      addonGrants: {},
      complianceSentence: 'Controls implemented, certification not held.',
    },
    {
      division: 'govt',
      application: 'government',
      currency: 'usd',
      tiers: [
        { id: 'govt_standard', division: 'govt', currency: 'usd', billing: 'one_time', name: 'Government Standard', priceCents: 2500000, priceKey: 'govt', blurb: 'Sovereign.', specs: [], provisioningActionKey: 'govt' },
      ],
      addons: [],
      exportAction: null,
      entitlements: {},
      addonGrants: {},
      complianceSentence: 'Controls implemented, certification not held.',
    },
  ],
};
