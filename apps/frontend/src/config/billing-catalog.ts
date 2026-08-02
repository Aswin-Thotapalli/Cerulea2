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

import type { Division, Currency } from './divisions';

// Dapp tier ids (recurring, monthly USD) — the original three.
export type DappTierId = 'public_dapps' | 'private_dapps' | 'private_dapps_pro';
// Enterprise tier ids (one-time USD). SME is the entry tier.
export type EnterpriseTierId = 'ent_sme' | 'ent_growth' | 'ent_enterprise';
// Govt tier ids (one-time USD) — single tier today.
export type GovtTierId = 'govt_standard';

export type TierId = DappTierId | EnterpriseTierId | GovtTierId;

export type BillingType =
  | 'recurring'               // simple monthly recurring price
  | 'one_time'                 // single one-time charge
  | 'recurring_plus_one_time'  // one-time setup fee + ongoing monthly hosting (2 Stripe prices)
  | 'pay_per_use';              // charged once per action, never shown in the add-on selector

export interface Tier {
  id: TierId;
  division: Division;
  currency: Currency;
  /** How the tier itself is billed: dapp tiers recur monthly; enterprise/govt tiers are one-time. */
  billing: 'recurring' | 'one_time';
  name: string;
  priceCents: number; // monthly (recurring) or total (one_time), in the tier's currency
  priceEnvVar: string; // STRIPE price id env var
  blurb: string;
  specs: { label: string; value: string }[];
  provisioningActionKey: string;
}

export interface Addon {
  id: string;
  /** Which division this add-on belongs to (drives the per-division selector). */
  division: Division;
  currency: Currency;
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
    division: 'dapp',
    currency: 'usd',
    billing: 'recurring',
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
    division: 'dapp',
    currency: 'usd',
    billing: 'recurring',
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
    division: 'dapp',
    currency: 'usd',
    billing: 'recurring',
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

  // ─── ENTERPRISE (one-time USD). SME is the entry tier. ────────────────────
  {
    id: 'ent_sme',
    division: 'enterprise',
    currency: 'usd',
    billing: 'one_time',
    name: 'SME',
    priceCents: 600000, // $6,000 one-time
    priceEnvVar: 'STRIPE_PRICE_ENT_SME',
    blurb: 'A production private chain on shared cloud, for small & mid-size teams.',
    specs: [
      { label: 'Deployment', value: 'Shared cloud' },
      { label: 'Validators', value: '3' },
      { label: 'Seats', value: '5' },
      { label: 'Access control', value: 'Basic roles' },
      { label: 'Audit retention', value: '30 days' },
      { label: 'Support', value: 'Email, 48h' },
    ],
    provisioningActionKey: 'provision_enterprise_sme',
  },
  {
    id: 'ent_growth',
    division: 'enterprise',
    currency: 'usd',
    billing: 'one_time',
    name: 'Growth',
    priceCents: 1800000, // $18,000 one-time
    priceEnvVar: 'STRIPE_PRICE_ENT_GROWTH',
    blurb: 'A dedicated-cloud chain with full RBAC, SSO, and priority support.',
    specs: [
      { label: 'Deployment', value: 'Dedicated cloud' },
      { label: 'Validators', value: '7' },
      { label: 'Seats', value: '25' },
      { label: 'Access control', value: 'Full RBAC' },
      { label: 'SSO', value: 'Google / Microsoft' },
      { label: 'Audit retention', value: '1 year' },
      { label: 'Support', value: 'Priority, 24h' },
    ],
    provisioningActionKey: 'provision_enterprise_growth',
  },
  {
    id: 'ent_enterprise',
    division: 'enterprise',
    currency: 'usd',
    billing: 'one_time',
    name: 'Enterprise',
    priceCents: 3000000, // $30,000 one-time
    priceEnvVar: 'STRIPE_PRICE_ENT_ENTERPRISE',
    blurb: 'On-prem / air-gap capable, SAML+SCIM, dedicated CSM, and 99.9% SLA. Everything included.',
    specs: [
      { label: 'Deployment', value: 'On-prem / private cloud / air-gap' },
      { label: 'Validators', value: '15+ / custom' },
      { label: 'Seats', value: 'Unlimited' },
      { label: 'Access control', value: 'RBAC + custom roles + approvals' },
      { label: 'SSO', value: 'SAML + SCIM' },
      { label: 'Audit retention', value: 'Unlimited + legal-grade export' },
      { label: 'Support', value: 'Dedicated CSM + 99.9% SLA' },
    ],
    provisioningActionKey: 'provision_enterprise_enterprise',
  },

  // ─── GOVT (one-time USD). Single tier today. ──────────────────────────────
  {
    id: 'govt_standard',
    division: 'govt',
    currency: 'usd',
    billing: 'one_time',
    name: 'Government',
    priceCents: 1200000, // $12,000 one-time
    priceEnvVar: 'STRIPE_PRICE_GOVT_STANDARD',
    blurb: 'Sovereign, on-soil deployment with citizen identity, public transparency, and legal-grade audit.',
    specs: [
      { label: 'Deployment', value: 'Sovereign / on-soil / air-gapped' },
      { label: 'Identity', value: 'Aadhaar / DigiLocker citizen module' },
      { label: 'Transparency', value: 'Public portal + citizen explorer' },
      { label: 'Records', value: 'Tamper-proof public registry' },
      { label: 'Audit', value: 'Legal-grade immutable trail' },
      { label: 'Access', value: 'Multi-department hierarchy' },
    ],
    provisioningActionKey: 'provision_govt_standard',
  },
];

export const ADDONS: Addon[] = [
  {
    id: 'addon_validator_single',
    division: 'dapp',
    currency: 'usd',
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
    division: 'dapp',
    currency: 'usd',
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
    division: 'dapp',
    currency: 'usd',
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
    division: 'dapp',
    currency: 'usd',
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
    division: 'dapp',
    currency: 'usd',
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
    division: 'dapp',
    currency: 'usd',
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
    division: 'dapp',
    currency: 'usd',
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
    division: 'dapp',
    currency: 'usd',
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

  // ══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE ADD-ONS (all monthly recurring, USD)
  // ══════════════════════════════════════════════════════════════════════════
  // — Capacity —
  {
    id: 'ent_addon_validator', division: 'enterprise', currency: 'usd', name: '+1 Validator',
    billingType: 'recurring', recurringPriceCents: 10000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_VALIDATOR',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 20,
    blurb: 'Add one validator to your enterprise chain, $100/month each.', provisioningActionKey: 'ent_add_validator',
  },
  {
    id: 'ent_addon_seats', division: 'enterprise', currency: 'usd', name: '+5 Seats',
    billingType: 'recurring', recurringPriceCents: 12500, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_SEATS',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 20,
    blurb: 'Add 5 Studio seats, $125/month per pack.', provisioningActionKey: 'ent_add_seats',
  },
  {
    id: 'ent_addon_storage', division: 'enterprise', currency: 'usd', name: '+50 GB storage',
    billingType: 'recurring', recurringPriceCents: 6000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_STORAGE',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 20,
    blurb: 'Add 50 GB of chain storage, $60/month per pack.', provisioningActionKey: 'ent_add_storage',
  },
  {
    id: 'ent_addon_dedicated_rpc', division: 'enterprise', currency: 'usd', name: 'Dedicated RPC node',
    billingType: 'recurring', recurringPriceCents: 18000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_DEDICATED_RPC',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 5,
    blurb: 'Add a dedicated RPC node, $180/month each.', provisioningActionKey: 'ent_provision_dedicated_rpc',
  },
  {
    id: 'ent_addon_staging', division: 'enterprise', currency: 'usd', name: 'Staging / UAT environment',
    billingType: 'recurring', recurringPriceCents: 25000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_STAGING',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_growth', 'ent_enterprise'], maxQuantity: 3,
    blurb: 'A separate staging/UAT chain environment, $250/month each.', provisioningActionKey: 'ent_provision_staging',
  },
  {
    id: 'ent_addon_api_key', division: 'enterprise', currency: 'usd', name: 'Additional API key',
    billingType: 'recurring', recurringPriceCents: 4000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_API_KEY',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 50,
    blurb: 'Issue an additional API key, $40/month per key.', provisioningActionKey: 'ent_provision_api_key',
  },
  {
    id: 'ent_addon_managed_ops', division: 'enterprise', currency: 'usd', name: 'Managed ops (dedicated engineer)',
    billingType: 'recurring', recurringPriceCents: 60000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_MANAGED_OPS',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 5,
    blurb: 'A dedicated engineer managing your deployment, $600/month.', provisioningActionKey: 'ent_managed_ops',
  },
  // — Capability upsells (included in top tier, purchasable below it) —
  {
    id: 'ent_addon_sso', division: 'enterprise', currency: 'usd', name: 'SSO (SAML)',
    billingType: 'recurring', recurringPriceCents: 15000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_SSO',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth'], maxQuantity: 1,
    blurb: 'SAML single sign-on, $150/month. Included in the Enterprise tier.', provisioningActionKey: 'ent_enable_sso',
  },
  {
    id: 'ent_addon_whitelabel', division: 'enterprise', currency: 'usd', name: 'White-label',
    billingType: 'recurring', recurringPriceCents: 18000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_WHITELABEL',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth'], maxQuantity: 1,
    blurb: 'Full white-label branding, $180/month. Included in the Enterprise tier.', provisioningActionKey: 'ent_enable_whitelabel',
  },
  {
    id: 'ent_addon_audit_retention', division: 'enterprise', currency: 'usd', name: 'Extended audit retention (+1 yr)',
    billingType: 'recurring', recurringPriceCents: 7500, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_AUDIT_RETENTION',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth'], maxQuantity: 5,
    blurb: 'Add a year of audit-log retention, $75/month per year.', provisioningActionKey: 'ent_extend_audit_retention',
  },
  {
    id: 'ent_addon_custom_integration', division: 'enterprise', currency: 'usd', name: 'Custom integration slot',
    billingType: 'recurring', recurringPriceCents: 22000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_CUSTOM_INTEGRATION',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_growth', 'ent_enterprise'], maxQuantity: 10,
    blurb: 'A bespoke integration / ERP connector, $220/month per slot.', provisioningActionKey: 'ent_custom_integration',
  },
  {
    id: 'ent_addon_premium_support', division: 'enterprise', currency: 'usd', name: 'Premium 24/7 support',
    billingType: 'recurring', recurringPriceCents: 50000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_PREMIUM_SUPPORT',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth'], maxQuantity: 1,
    blurb: '24/7 priority support, $500/month. Included at the Enterprise tier.', provisioningActionKey: 'ent_premium_support',
  },
  // — Enticing / outcome add-ons —
  {
    id: 'ent_addon_compliance_pack', division: 'enterprise', currency: 'usd', name: 'Compliance certification pack',
    billingType: 'recurring', recurringPriceCents: 45000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_COMPLIANCE_PACK',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 1,
    blurb: 'SOC2 / ISO27001 evidence auto-collection + report generation, $450/month.', provisioningActionKey: 'ent_compliance_pack',
  },
  {
    id: 'ent_addon_private_ai', division: 'enterprise', currency: 'usd', name: 'Private CeruleAI',
    billingType: 'recurring', recurringPriceCents: 60000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_PRIVATE_AI',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 1,
    blurb: 'Isolated / on-prem CeruleAI inference, $600/month.', provisioningActionKey: 'ent_private_ai',
  },
  {
    id: 'ent_addon_chain_analytics', division: 'enterprise', currency: 'usd', name: 'Chain analytics & BI dashboard',
    billingType: 'recurring', recurringPriceCents: 20000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_CHAIN_ANALYTICS',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 1,
    blurb: 'Executive analytics & BI over your chain data, $200/month.', provisioningActionKey: 'ent_chain_analytics',
  },
  {
    id: 'ent_addon_audit_credits', division: 'enterprise', currency: 'usd', name: 'Smart-contract audit credits',
    billingType: 'recurring', recurringPriceCents: 35000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_AUDIT_CREDITS',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_sme', 'ent_growth', 'ent_enterprise'], maxQuantity: 20,
    blurb: 'Automated + manual security audit passes, $350/month per credit pack.', provisioningActionKey: 'ent_audit_credits',
  },
  {
    id: 'ent_addon_sla_9999', division: 'enterprise', currency: 'usd', name: '99.99% SLA upgrade',
    billingType: 'recurring', recurringPriceCents: 50000, recurringPriceEnvVar: 'STRIPE_PRICE_ENT_ADDON_SLA_9999',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['ent_enterprise'], maxQuantity: 1,
    blurb: 'Upgrade the 99.9% SLA to 99.99%, $500/month.', provisioningActionKey: 'ent_sla_9999',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GOVT ADD-ONS (all monthly recurring, USD) — eligible: govt_standard
  // ══════════════════════════════════════════════════════════════════════════
  // — Capacity —
  {
    id: 'govt_addon_department', division: 'govt', currency: 'usd', name: '+1 Department workspace',
    billingType: 'recurring', recurringPriceCents: 18000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_DEPARTMENT',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 20,
    blurb: 'Add a department workspace, $180/month each.', provisioningActionKey: 'govt_add_department',
  },
  {
    id: 'govt_addon_seats', division: 'govt', currency: 'usd', name: '+10 Officer seats',
    billingType: 'recurring', recurringPriceCents: 10000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_SEATS',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 20,
    blurb: 'Add 10 officer seats, $100/month per pack.', provisioningActionKey: 'govt_add_seats',
  },
  {
    id: 'govt_addon_storage', division: 'govt', currency: 'usd', name: '+100 GB secure records storage',
    billingType: 'recurring', recurringPriceCents: 12000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_STORAGE',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 20,
    blurb: 'Add 100 GB of secure records storage, $120/month per pack.', provisioningActionKey: 'govt_add_storage',
  },
  {
    id: 'govt_addon_validator', division: 'govt', currency: 'usd', name: '+1 Validator',
    billingType: 'recurring', recurringPriceCents: 12000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_VALIDATOR',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 20,
    blurb: 'Add one validator, $120/month each.', provisioningActionKey: 'govt_add_validator',
  },
  {
    id: 'govt_addon_transparency_node', division: 'govt', currency: 'usd', name: 'Additional public / transparency node',
    billingType: 'recurring', recurringPriceCents: 15000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_TRANSPARENCY_NODE',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 10,
    blurb: 'An extra public transparency node, $150/month each.', provisioningActionKey: 'govt_transparency_node',
  },
  {
    id: 'govt_addon_interdept_connector', division: 'govt', currency: 'usd', name: 'Additional inter-department connector',
    billingType: 'recurring', recurringPriceCents: 18000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_INTERDEPT_CONNECTOR',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 20,
    blurb: 'A permissioned inter-department data connector, $180/month each.', provisioningActionKey: 'govt_interdept_connector',
  },
  {
    id: 'govt_addon_audit_retention', division: 'govt', currency: 'usd', name: 'Extended legal-grade audit retention',
    billingType: 'recurring', recurringPriceCents: 12000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_AUDIT_RETENTION',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 5,
    blurb: 'Extend legal-grade audit retention, $120/month per year.', provisioningActionKey: 'govt_extend_audit_retention',
  },
  // — Enticing / exclusive —
  {
    id: 'govt_addon_aadhaar_volume', division: 'govt', currency: 'usd', name: 'Aadhaar verification volume pack (per 10k/mo)',
    billingType: 'recurring', recurringPriceCents: 25000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_AADHAAR_VOLUME',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 50,
    blurb: '10,000 additional Aadhaar verifications/month, $250/month per pack.', provisioningActionKey: 'govt_aadhaar_volume',
  },
  {
    id: 'govt_addon_esign', division: 'govt', currency: 'usd', name: 'eSign / digital-signature integration',
    billingType: 'recurring', recurringPriceCents: 30000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_ESIGN',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 1,
    blurb: 'Legally-binding eSign integration for on-chain records, $300/month.', provisioningActionKey: 'govt_esign',
  },
  {
    id: 'govt_addon_regulatory_reporting', division: 'govt', currency: 'usd', name: 'Regulatory reporting automation',
    billingType: 'recurring', recurringPriceCents: 35000, recurringPriceEnvVar: 'STRIPE_PRICE_GOVT_ADDON_REGULATORY_REPORTING',
    oneTimePriceCents: null, oneTimePriceEnvVar: null,
    eligibleTierIds: ['govt_standard'], maxQuantity: 1,
    blurb: 'Auto-generate compliance reports for oversight bodies, $350/month.', provisioningActionKey: 'govt_regulatory_reporting',
  },
  // NOTE: Sovereign on-soil backup & archival is NOT an add-on — Indian law
  // mandates on-soil data residency, so it is included in the govt tier baseline
  // (see 'sovereign_backup' in TIER_ENTITLEMENTS.govt_standard), never sold.
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

// ─── Division-aware helpers ───────────────────────────────────────────────────
// The pricing page and studio gating filter by division so a dapp visitor never
// sees enterprise plans and cannot buy out-of-division.

/** All tiers belonging to a division, in catalog order. */
export function getTiersForDivision(division: Division): Tier[] {
  return TIERS.filter((t) => t.division === division);
}

/** All add-ons belonging to a division, in catalog order. */
export function getAddonsForDivision(division: Division): Addon[] {
  return ADDONS.filter((a) => a.division === division);
}

/** The division a tier id belongs to, or null if unknown. */
export function divisionForTierId(tierId: string): Division | null {
  return getTierById(tierId)?.division ?? null;
}

/** Guard: is this tier id valid for this division? (server-side checkout guard) */
export function isTierInDivision(tierId: string, division: Division): boolean {
  return divisionForTierId(tierId) === division;
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
