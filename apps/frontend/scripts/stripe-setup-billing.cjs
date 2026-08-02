/**
 * One-time setup script: creates the Stripe Products/Prices for every
 * Cerulea Studio tier and add-on, then prints the env vars to set.
 *
 * Run: node scripts/stripe-setup-billing.cjs
 * Requires STRIPE_SECRET_KEY in apps/frontend/.env.local (test or live key).
 *
 * Safe to re-run: it looks up existing Products by metadata.catalogId
 * before creating new ones, so running this twice won't create duplicates.
 *
 * NOTE: this script intentionally keeps its OWN copy of the catalog data
 * (rather than importing src/config/billing-catalog.ts) because that file
 * is TypeScript and this is a plain Node script with no extra build step.
 * If you change pricing/eligibility in billing-catalog.ts, mirror the
 * price numbers here too before re-running.
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in .env.local — add it first, then re-run this script.');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' });

// ─── catalog (mirrors src/config/billing-catalog.ts) ─────────────────────────

const TIERS = [
  // Dapp — recurring monthly
  { catalogId: 'public_dapps', name: 'Public Dapps', priceCents: 4000, billing: 'recurring', envVar: 'STRIPE_PRICE_PUBLIC_DAPPS' },
  { catalogId: 'private_dapps', name: 'Private Dapps', priceCents: 3000, billing: 'recurring', envVar: 'STRIPE_PRICE_PRIVATE_DAPPS' },
  { catalogId: 'private_dapps_pro', name: 'Private Dapps Pro', priceCents: 6000, billing: 'recurring', envVar: 'STRIPE_PRICE_PRIVATE_DAPPS_PRO' },
  // Enterprise — one-time license
  { catalogId: 'ent_sme', name: 'Cerulea Enterprise — SME', priceCents: 600000, billing: 'one_time', envVar: 'STRIPE_PRICE_ENT_SME' },
  { catalogId: 'ent_growth', name: 'Cerulea Enterprise — Growth', priceCents: 1800000, billing: 'one_time', envVar: 'STRIPE_PRICE_ENT_GROWTH' },
  { catalogId: 'ent_enterprise', name: 'Cerulea Enterprise — Enterprise', priceCents: 3000000, billing: 'one_time', envVar: 'STRIPE_PRICE_ENT_ENTERPRISE' },
  // Govt — one-time license
  { catalogId: 'govt_standard', name: 'Cerulea Government', priceCents: 1200000, billing: 'one_time', envVar: 'STRIPE_PRICE_GOVT_STANDARD' },
];

// Each entry creates one Product. `prices` lists the Price(s) to create on
// it — most add-ons have exactly one; the block explorer add-on has two
// (one-time setup fee + recurring hosting), both attached to one Product.
const ADDONS = [
  {
    catalogId: 'addon_validator_single', name: '+1 validator',
    prices: [{ kind: 'recurring', cents: 1000, envVar: 'STRIPE_PRICE_ADDON_VALIDATOR_SINGLE' }],
  },
  {
    catalogId: 'addon_validator_multi', name: 'Additional validators (up to +3)',
    prices: [{ kind: 'recurring', cents: 1000, envVar: 'STRIPE_PRICE_ADDON_VALIDATOR_MULTI' }],
  },
  {
    catalogId: 'addon_storage_10gb', name: '+10 GB storage',
    prices: [{ kind: 'recurring', cents: 300, envVar: 'STRIPE_PRICE_ADDON_STORAGE_10GB' }],
  },
  {
    catalogId: 'addon_dedicated_rpc', name: 'Dedicated RPC node',
    prices: [{ kind: 'recurring', cents: 1200, envVar: 'STRIPE_PRICE_ADDON_DEDICATED_RPC' }],
  },
  {
    catalogId: 'addon_custom_domain', name: 'Custom domain for Dapp frontend',
    prices: [{ kind: 'one_time', cents: 3500, envVar: 'STRIPE_PRICE_ADDON_CUSTOM_DOMAIN' }],
  },
  {
    catalogId: 'addon_block_explorer', name: 'Dedicated branded block explorer',
    prices: [
      { kind: 'one_time', cents: 4000, envVar: 'STRIPE_PRICE_ADDON_BLOCK_EXPLORER_SETUP', nickname: 'Setup fee' },
      { kind: 'recurring', cents: 700, envVar: 'STRIPE_PRICE_ADDON_BLOCK_EXPLORER_HOSTING', nickname: 'Hosting' },
    ],
  },
  {
    catalogId: 'addon_api_key', name: 'Additional API key',
    prices: [{ kind: 'recurring', cents: 1500, envVar: 'STRIPE_PRICE_ADDON_API_KEY' }],
  },
  {
    catalogId: 'addon_studio_seat', name: 'Additional Studio seats',
    prices: [{ kind: 'recurring', cents: 1000, envVar: 'STRIPE_PRICE_ADDON_STUDIO_SEAT' }],
  },

  // ─── Enterprise add-ons (all recurring monthly) ───────────────────────────
  { catalogId: 'ent_addon_validator', name: 'Enterprise +1 Validator', prices: [{ kind: 'recurring', cents: 10000, envVar: 'STRIPE_PRICE_ENT_ADDON_VALIDATOR' }] },
  { catalogId: 'ent_addon_seats', name: 'Enterprise +5 Seats', prices: [{ kind: 'recurring', cents: 12500, envVar: 'STRIPE_PRICE_ENT_ADDON_SEATS' }] },
  { catalogId: 'ent_addon_storage', name: 'Enterprise +50 GB storage', prices: [{ kind: 'recurring', cents: 6000, envVar: 'STRIPE_PRICE_ENT_ADDON_STORAGE' }] },
  { catalogId: 'ent_addon_dedicated_rpc', name: 'Enterprise Dedicated RPC node', prices: [{ kind: 'recurring', cents: 18000, envVar: 'STRIPE_PRICE_ENT_ADDON_DEDICATED_RPC' }] },
  { catalogId: 'ent_addon_staging', name: 'Enterprise Staging / UAT environment', prices: [{ kind: 'recurring', cents: 25000, envVar: 'STRIPE_PRICE_ENT_ADDON_STAGING' }] },
  { catalogId: 'ent_addon_api_key', name: 'Enterprise Additional API key', prices: [{ kind: 'recurring', cents: 4000, envVar: 'STRIPE_PRICE_ENT_ADDON_API_KEY' }] },
  { catalogId: 'ent_addon_managed_ops', name: 'Enterprise Managed ops', prices: [{ kind: 'recurring', cents: 60000, envVar: 'STRIPE_PRICE_ENT_ADDON_MANAGED_OPS' }] },
  { catalogId: 'ent_addon_sso', name: 'Enterprise SSO (SAML)', prices: [{ kind: 'recurring', cents: 15000, envVar: 'STRIPE_PRICE_ENT_ADDON_SSO' }] },
  { catalogId: 'ent_addon_whitelabel', name: 'Enterprise White-label', prices: [{ kind: 'recurring', cents: 18000, envVar: 'STRIPE_PRICE_ENT_ADDON_WHITELABEL' }] },
  { catalogId: 'ent_addon_audit_retention', name: 'Enterprise Extended audit retention (+1 yr)', prices: [{ kind: 'recurring', cents: 7500, envVar: 'STRIPE_PRICE_ENT_ADDON_AUDIT_RETENTION' }] },
  { catalogId: 'ent_addon_custom_integration', name: 'Enterprise Custom integration slot', prices: [{ kind: 'recurring', cents: 22000, envVar: 'STRIPE_PRICE_ENT_ADDON_CUSTOM_INTEGRATION' }] },
  { catalogId: 'ent_addon_premium_support', name: 'Enterprise Premium 24/7 support', prices: [{ kind: 'recurring', cents: 50000, envVar: 'STRIPE_PRICE_ENT_ADDON_PREMIUM_SUPPORT' }] },
  { catalogId: 'ent_addon_compliance_pack', name: 'Enterprise Compliance certification pack', prices: [{ kind: 'recurring', cents: 45000, envVar: 'STRIPE_PRICE_ENT_ADDON_COMPLIANCE_PACK' }] },
  { catalogId: 'ent_addon_private_ai', name: 'Enterprise Private CeruleAI', prices: [{ kind: 'recurring', cents: 60000, envVar: 'STRIPE_PRICE_ENT_ADDON_PRIVATE_AI' }] },
  { catalogId: 'ent_addon_chain_analytics', name: 'Enterprise Chain analytics & BI', prices: [{ kind: 'recurring', cents: 20000, envVar: 'STRIPE_PRICE_ENT_ADDON_CHAIN_ANALYTICS' }] },
  { catalogId: 'ent_addon_audit_credits', name: 'Enterprise Smart-contract audit credits', prices: [{ kind: 'recurring', cents: 35000, envVar: 'STRIPE_PRICE_ENT_ADDON_AUDIT_CREDITS' }] },
  { catalogId: 'ent_addon_sla_9999', name: 'Enterprise 99.99% SLA upgrade', prices: [{ kind: 'recurring', cents: 50000, envVar: 'STRIPE_PRICE_ENT_ADDON_SLA_9999' }] },

  // ─── Govt add-ons (all recurring monthly) ─────────────────────────────────
  { catalogId: 'govt_addon_department', name: 'Govt +1 Department workspace', prices: [{ kind: 'recurring', cents: 18000, envVar: 'STRIPE_PRICE_GOVT_ADDON_DEPARTMENT' }] },
  { catalogId: 'govt_addon_seats', name: 'Govt +10 Officer seats', prices: [{ kind: 'recurring', cents: 10000, envVar: 'STRIPE_PRICE_GOVT_ADDON_SEATS' }] },
  { catalogId: 'govt_addon_storage', name: 'Govt +100 GB secure records storage', prices: [{ kind: 'recurring', cents: 12000, envVar: 'STRIPE_PRICE_GOVT_ADDON_STORAGE' }] },
  { catalogId: 'govt_addon_validator', name: 'Govt +1 Validator', prices: [{ kind: 'recurring', cents: 12000, envVar: 'STRIPE_PRICE_GOVT_ADDON_VALIDATOR' }] },
  { catalogId: 'govt_addon_transparency_node', name: 'Govt Additional transparency node', prices: [{ kind: 'recurring', cents: 15000, envVar: 'STRIPE_PRICE_GOVT_ADDON_TRANSPARENCY_NODE' }] },
  { catalogId: 'govt_addon_interdept_connector', name: 'Govt Additional inter-department connector', prices: [{ kind: 'recurring', cents: 18000, envVar: 'STRIPE_PRICE_GOVT_ADDON_INTERDEPT_CONNECTOR' }] },
  { catalogId: 'govt_addon_audit_retention', name: 'Govt Extended legal-grade audit retention', prices: [{ kind: 'recurring', cents: 12000, envVar: 'STRIPE_PRICE_GOVT_ADDON_AUDIT_RETENTION' }] },
  { catalogId: 'govt_addon_aadhaar_volume', name: 'Govt Aadhaar verification volume pack', prices: [{ kind: 'recurring', cents: 25000, envVar: 'STRIPE_PRICE_GOVT_ADDON_AADHAAR_VOLUME' }] },
  { catalogId: 'govt_addon_esign', name: 'Govt eSign / digital-signature integration', prices: [{ kind: 'recurring', cents: 30000, envVar: 'STRIPE_PRICE_GOVT_ADDON_ESIGN' }] },
  { catalogId: 'govt_addon_regulatory_reporting', name: 'Govt Regulatory reporting automation', prices: [{ kind: 'recurring', cents: 35000, envVar: 'STRIPE_PRICE_GOVT_ADDON_REGULATORY_REPORTING' }] },
];

const EXPORT_ACTION = {
  catalogId: 'export_chain_data', name: 'Chain data export (CSV/PDF)',
  prices: [{ kind: 'one_time', cents: 1000, envVar: 'STRIPE_PRICE_EXPORT_CHAIN_DATA' }],
};

// ─── helpers ───────────────────────────────────────────────────────────────

async function findProductByCatalogId(catalogId) {
  const list = await stripe.products.search({ query: `metadata['catalogId']:'${catalogId}'` }).catch(() => null);
  return list?.data?.[0] ?? null;
}

async function ensureProduct(catalogId, name) {
  const existing = await findProductByCatalogId(catalogId);
  if (existing) {
    console.log(`  Product exists: ${name} (${existing.id})`);
    return existing;
  }
  const product = await stripe.products.create({ name, metadata: { catalogId } });
  console.log(`  Created product: ${name} (${product.id})`);
  return product;
}

async function findPriceForProduct(productId, unitAmount, recurring) {
  const prices = await stripe.prices.list({ product: productId, limit: 100 });
  return prices.data.find(
    (p) => p.unit_amount === unitAmount && !!p.recurring === !!recurring && (!recurring || p.recurring.interval === 'month')
  ) ?? null;
}

async function ensurePrice(productId, priceSpec) {
  const existing = await findPriceForProduct(productId, priceSpec.cents, priceSpec.kind === 'recurring');
  if (existing) {
    console.log(`    Price exists (${priceSpec.envVar}): ${existing.id}`);
    return existing;
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: priceSpec.cents,
    nickname: priceSpec.nickname,
    ...(priceSpec.kind === 'recurring' ? { recurring: { interval: 'month' } } : {}),
  });
  console.log(`    Created price (${priceSpec.envVar}): ${price.id}`);
  return price;
}

// ─── main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Setting up Cerulea Studio billing catalog in Stripe...\n');
  const envLines = [];

  console.log('Tiers:');
  for (const tier of TIERS) {
    const product = await ensureProduct(tier.catalogId, tier.name);
    const price = await ensurePrice(product.id, { kind: tier.billing || 'recurring', cents: tier.priceCents, envVar: tier.envVar });
    envLines.push(`${tier.envVar}=${price.id}`);
  }

  console.log('\nAdd-ons:');
  for (const addon of ADDONS) {
    const product = await ensureProduct(addon.catalogId, addon.name);
    for (const priceSpec of addon.prices) {
      const price = await ensurePrice(product.id, priceSpec);
      envLines.push(`${priceSpec.envVar}=${price.id}`);
    }
  }

  console.log('\nPay-per-use actions:');
  {
    const product = await ensureProduct(EXPORT_ACTION.catalogId, EXPORT_ACTION.name);
    for (const priceSpec of EXPORT_ACTION.prices) {
      const price = await ensurePrice(product.id, priceSpec);
      envLines.push(`${priceSpec.envVar}=${price.id}`);
    }
  }

  console.log('\n\nAdd these to apps/frontend/.env.local (and to Vercel env vars for production):\n');
  console.log(envLines.join('\n'));
  console.log('\nAlso required for live billing (not created by this script):');
  console.log('  STRIPE_SECRET_KEY=sk_...        (already set, since you ran this script)');
  console.log('  STRIPE_WEBHOOK_SECRET=whsec_... (from `stripe listen` locally, or the webhook endpoint in the Stripe Dashboard)');
}

main().catch((err) => {
  console.error('Stripe setup failed:', err);
  process.exit(1);
});
