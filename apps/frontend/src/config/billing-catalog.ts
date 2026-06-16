// apps/frontend/src/config/billing-catalog.ts
//
// Single source of truth for Cerulea Studio's self-serve tiers and add-ons.
// Both the signup flow (PricingPage) and the post-signup dashboard
// (dashboard/billing) read this file — never hardcode a price or an
// eligibility rule anywhere else.
//
// Stripe price IDs are NOT hardcoded here. Each catalog item carries the
// *name* of the env var that holds its live Stripe price id (see
// src/lib/billing/stripe.ts -> getStripePriceId). Run
// `node scripts/stripe-setup-billing.cjs` to create the Stripe
// Products/Prices and print the env vars to set.

export type TierId = 'public_dapps' | 'private_dapps' | 'private_dapps_pro';

export type BillingType =
  | 'recurring'               // simple monthly recurring price
  | 'one_time'                 // single one-time charge
  | 'recurring_plus_one_time'  // one-time setup fee + ongoing monthly hosting (2 Stripe prices)
  | 'pay_per_use';              // charged once per action, never shown in the add-on selector

export interface Tier {
  id: TierId;
  name: string;
  priceCents: number; // monthly, USD
  priceEnvVar: string; // STRIPE price id env var (recurring)
  blurb: string;
  specs: { label: string; value: string }[];
  provisioningActionKey: string;
}

export interface Addon {
  id: string;
  name: string;
  billingType: BillingType;
  /** Cents per unit, recurring component (null if billingType === 'one_time') */
  recurringPriceCents: number | null;
  recurringPriceEnvVar: string | null;
  /** Cents, one-time component (null if billingType === 'recurring') */
  oneTimePriceCents: number | null;
  oneTimePriceEnvVar: string | null;
  /** Which tiers this add-on may be attached to */
  eligibleTierIds: TierId[];
  /**
   * 1 = simple on/off toggle.
   * >1 = quantity stepper, 1..maxQuantity.
   * Caps marked "assumed" below were not specified in the source pricing
   * sheet and exist only so the UI has a sane stepper ceiling — update
   * freely, they are not contractual limits.
   */
  maxQuantity: number;
  blurb: string;
  provisioningActionKey: string;
}

export const TIERS: Tier[] = [
  {
    id: 'public_dapps',
    name: 'Public Dapps',
    priceCents: 4000,
    priceEnvVar: 'STRIPE_PRICE_PUBLIC_DAPPS',
    blurb: 'Deploy dApps to the Cerulea Public L1 with dedicated RPC capacity.',
    specs: [
      { label: 'Validators', value: '7' },
      { label: 'Dedicated RPC nodes', value: '2' },
      { label: 'Transactions / month', value: '100,000' },
      { label: 'Storage', value: '30 GB' },
      { label: 'Network', value: 'Cerulea Public L1' },
    ],
    provisioningActionKey: 'provision_public_dapps_chain',
  },
  {
    id: 'private_dapps',
    name: 'Private Dapps',
    priceCents: 3000,
    priceEnvVar: 'STRIPE_PRICE_PRIVATE_DAPPS',
    blurb: 'Your own sovereign private chain with shared RPC infrastructure.',
    specs: [
      { label: 'Validators', value: '3' },
      { label: 'RPC', value: 'Shared' },
      { label: 'Transactions / month', value: '50,000' },
      { label: 'Storage', value: '15 GB' },
      { label: 'Network', value: 'Sovereign private chain' },
    ],
    provisioningActionKey: 'provision_private_dapps_chain',
  },
  {
    id: 'private_dapps_pro',
    name: 'Private Dapps Pro',
    priceCents: 6000,
    priceEnvVar: 'STRIPE_PRICE_PRIVATE_DAPPS_PRO',
    blurb: 'A larger sovereign private chain with a dedicated RPC node included.',
    specs: [
      { label: 'Validators', value: '6' },
      { label: 'Dedicated RPC nodes', value: '1 included' },
      { label: 'Transactions / month', value: '100,000' },
      { label: 'Storage', value: '40 GB' },
      { label: 'Network', value: 'Sovereign private chain' },
    ],
    provisioningActionKey: 'provision_private_dapps_pro_chain',
  },
];

export const ADDONS: Addon[] = [
  {
    id: 'addon_validator_single',
    name: '+1 validator',
    billingType: 'recurring',
    recurringPriceCents: 1000,
    recurringPriceEnvVar: 'STRIPE_PRICE_ADDON_VALIDATOR_SINGLE',
    oneTimePriceCents: null,
    oneTimePriceEnvVar: null,
    eligibleTierIds: ['private_dapps'],
    maxQuantity: 1,
    blurb: 'Add one extra validator to your Private Dapps chain.',
    provisioningActionKey: 'add_validator',
  },
  {
    id: 'addon_validator_multi',
    name: 'Additional validators (up to +3)',
    billingType: 'recurring',
    recurringPriceCents: 1000, // per validator
    recurringPriceEnvVar: 'STRIPE_PRICE_ADDON_VALIDATOR_MULTI',
    oneTimePriceCents: null,
    oneTimePriceEnvVar: null,
    eligibleTierIds: ['private_dapps_pro'],
    maxQuantity: 3,
    blurb: 'Add up to 3 extra validators to your Private Dapps Pro chain, $10/month each.',
    provisioningActionKey: 'add_validators',
  },
  {
    id: 'addon_storage_10gb',
    name: '+10 GB storage',
    billingType: 'recurring',
    recurringPriceCents: 300,
    recurringPriceEnvVar: 'STRIPE_PRICE_ADDON_STORAGE_10GB',
    oneTimePriceCents: null,
    oneTimePriceEnvVar: null,
    eligibleTierIds: ['private_dapps', 'private_dapps_pro'],
    maxQuantity: 20, // assumed soft cap (+200 GB) — not specified in source sheet
    blurb: 'Add 10 GB of chain storage. Stack multiple units for more.',
    provisioningActionKey: 'add_storage_gb',
  },
  {
    id: 'addon_dedicated_rpc',
    name: 'Dedicated RPC node',
    billingType: 'recurring',
    recurringPriceCents: 1200,
    recurringPriceEnvVar: 'STRIPE_PRICE_ADDON_DEDICATED_RPC',
    oneTimePriceCents: null,
    oneTimePriceEnvVar: null,
    eligibleTierIds: ['private_dapps'],
    maxQuantity: 1,
    blurb: 'Add a dedicated RPC node to your Private Dapps chain.',
    provisioningActionKey: 'provision_dedicated_rpc_node',
  },
  {
    id: 'addon_custom_domain',
    name: 'Custom domain for Dapp frontend',
    billingType: 'one_time',
    recurringPriceCents: null,
    recurringPriceEnvVar: null,
    oneTimePriceCents: 3500,
    oneTimePriceEnvVar: 'STRIPE_PRICE_ADDON_CUSTOM_DOMAIN',
    eligibleTierIds: ['private_dapps', 'private_dapps_pro'],
    maxQuantity: 1,
    blurb: 'Point your own domain at your Dapp frontend. One-time setup charge.',
    provisioningActionKey: 'configure_custom_domain',
  },
  {
    id: 'addon_block_explorer',
    name: 'Dedicated branded block explorer',
    billingType: 'recurring_plus_one_time',
    recurringPriceCents: 700,
    recurringPriceEnvVar: 'STRIPE_PRICE_ADDON_BLOCK_EXPLORER_HOSTING',
    oneTimePriceCents: 4000,
    oneTimePriceEnvVar: 'STRIPE_PRICE_ADDON_BLOCK_EXPLORER_SETUP',
    eligibleTierIds: ['private_dapps', 'private_dapps_pro'],
    maxQuantity: 1,
    blurb: 'A branded block explorer for your chain. One-time setup fee plus monthly hosting.',
    provisioningActionKey: 'setup_block_explorer',
  },
  {
    id: 'addon_api_key',
    name: 'Additional API key',
    billingType: 'recurring',
    recurringPriceCents: 1500,
    recurringPriceEnvVar: 'STRIPE_PRICE_ADDON_API_KEY',
    oneTimePriceCents: null,
    oneTimePriceEnvVar: null,
    eligibleTierIds: ['private_dapps', 'private_dapps_pro'],
    maxQuantity: 20, // assumed soft cap — not specified in source sheet
    blurb: 'Issue an additional API key, $15/month per key.',
    provisioningActionKey: 'provision_api_key',
  },
  {
    id: 'addon_studio_seat',
    name: 'Additional Studio seats (beyond 2 included)',
    billingType: 'recurring',
    recurringPriceCents: 1000,
    recurringPriceEnvVar: 'STRIPE_PRICE_ADDON_STUDIO_SEAT',
    oneTimePriceCents: null,
    oneTimePriceEnvVar: null,
    eligibleTierIds: ['public_dapps', 'private_dapps', 'private_dapps_pro'],
    maxQuantity: 50, // assumed soft cap — not specified in source sheet
    blurb: 'Add a Studio seat beyond the 2 included with every tier, $10/month per seat.',
    provisioningActionKey: 'provision_studio_seats',
  },
];

/**
 * "Chain data export" is intentionally NOT in ADDONS — it is a pay-per-use
 * action, never a subscription line item, and must never appear in the
 * signup/checkout add-on selector. It is surfaced only as an on-demand
 * "Export Data" button in the post-signup dashboard.
 */
export const EXPORT_ACTION = {
  id: 'export_chain_data',
  name: 'Chain data export (CSV/PDF)',
  billingType: 'pay_per_use' as const,
  priceCents: 1000,
  priceEnvVar: 'STRIPE_PRICE_EXPORT_CHAIN_DATA',
  eligibleTierIds: ['private_dapps', 'private_dapps_pro'] as TierId[],
  blurb: 'Export your chain data as CSV or PDF. Charged once per export.',
  provisioningActionKey: 'export_chain_data',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getTierById(tierId: string): Tier | undefined {
  return TIERS.find((t) => t.id === tierId);
}

export function getAddonById(addonId: string): Addon | undefined {
  return ADDONS.find((a) => a.id === addonId);
}

/** Add-ons selectable for a given tier, in catalog order. */
export function getEligibleAddons(tierId: TierId | null | undefined): Addon[] {
  if (!tierId) return [];
  return ADDONS.filter((a) => a.eligibleTierIds.includes(tierId));
}

export function isAddonEligibleForTier(addonId: string, tierId: TierId | null | undefined): boolean {
  if (!tierId) return false;
  const addon = getAddonById(addonId);
  return !!addon && addon.eligibleTierIds.includes(tierId);
}

export interface AddonSelection {
  addonId: string;
  quantity: number;
}

/**
 * Drops any selections that are no longer eligible for `tierId` (e.g. user
 * changed tier after picking add-ons). Returns the filtered list plus the
 * names of anything that was dropped, so the caller can show a notice.
 */
export function reconcileSelectionsForTier(
  selections: AddonSelection[],
  tierId: TierId | null | undefined
): { kept: AddonSelection[]; removedNames: string[] } {
  const kept: AddonSelection[] = [];
  const removedNames: string[] = [];
  for (const sel of selections) {
    if (isAddonEligibleForTier(sel.addonId, tierId)) {
      kept.push(sel);
    } else {
      const addon = getAddonById(sel.addonId);
      removedNames.push(addon?.name ?? sel.addonId);
    }
  }
  return { kept, removedNames };
}

export interface PriceBreakdown {
  tierCents: number;
  addonsRecurringCents: number;
  addonsOneTimeCents: number;
  dueNowCents: number; // tier + addons recurring (first period) + addons one-time
  monthlyCents: number; // tier + addons recurring (ongoing, excludes one-time)
}

/** Computes the live running total shown by <PriceSummary />. */
export function computePriceBreakdown(
  tierId: TierId | null | undefined,
  selections: AddonSelection[]
): PriceBreakdown {
  const tier = tierId ? getTierById(tierId) : undefined;
  const tierCents = tier?.priceCents ?? 0;

  let addonsRecurringCents = 0;
  let addonsOneTimeCents = 0;

  for (const sel of selections) {
    const addon = getAddonById(sel.addonId);
    if (!addon) continue;
    const qty = Math.max(1, Math.min(sel.quantity, addon.maxQuantity));
    if (addon.recurringPriceCents != null) {
      addonsRecurringCents += addon.recurringPriceCents * qty;
    }
    if (addon.oneTimePriceCents != null) {
      addonsOneTimeCents += addon.oneTimePriceCents * qty;
    }
  }

  return {
    tierCents,
    addonsRecurringCents,
    addonsOneTimeCents,
    dueNowCents: tierCents + addonsRecurringCents + addonsOneTimeCents,
    monthlyCents: tierCents + addonsRecurringCents,
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
