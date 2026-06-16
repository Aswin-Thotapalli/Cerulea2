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
  { catalogId: 'public_dapps', name: 'Public Dapps', priceCents: 4000, envVar: 'STRIPE_PRICE_PUBLIC_DAPPS' },
  { catalogId: 'private_dapps', name: 'Private Dapps', priceCents: 3000, envVar: 'STRIPE_PRICE_PRIVATE_DAPPS' },
  { catalogId: 'private_dapps_pro', name: 'Private Dapps Pro', priceCents: 6000, envVar: 'STRIPE_PRICE_PRIVATE_DAPPS_PRO' },
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
    const price = await ensurePrice(product.id, { kind: 'recurring', cents: tier.priceCents, envVar: tier.envVar });
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
