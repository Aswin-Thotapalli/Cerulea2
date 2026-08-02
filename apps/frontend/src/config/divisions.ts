// apps/frontend/src/config/divisions.ts
//
// Bedrock for Cerulea's multi-division architecture.
//
// ONE codebase, ONE Vercel deployment, FOUR marketing front doors. The division
// is decided per-request from the Host header (see middleware) — nothing is
// physically split. Every gate (studio flavor, templates, modules, pricing,
// feature entitlements) reads the division resolved here.
//
// This file is intentionally free of catalog/price/feature specifics so it never
// needs to change when tiers or add-ons are tweaked. Prices live in
// billing-catalog.ts; feature gates live in entitlements.ts.

// ─── Division (the studio + pricing axis) ────────────────────────────────────
// SME is NOT its own division — it is the entry tier of `enterprise`. So there
// are three divisions for studio/pricing purposes, but four marketing sites.
export type Division = 'dapp' | 'enterprise' | 'govt';

export const DIVISIONS: Division[] = ['dapp', 'enterprise', 'govt'];

// ─── Marketing front doors (four) ────────────────────────────────────────────
// `sme` is a marketing skin that drops the visitor into the enterprise division,
// steered at its lowest tier.
export type MarketingSite = 'dapps' | 'sme' | 'enterprise' | 'gov';

export interface MarketingSiteConfig {
  site: MarketingSite;
  division: Division;
  /** Subdomain label under cerulea.io, e.g. "dapps" → dapps.cerulea.io */
  subdomain: string;
  /** Human label for the site */
  label: string;
  /** If set, this front door steers signups toward a specific tier id. */
  steerTierId?: string;
}

export const MARKETING_SITES: Record<MarketingSite, MarketingSiteConfig> = {
  dapps: { site: 'dapps', division: 'dapp', subdomain: 'dapps', label: 'Cerulea for dApps' },
  sme: { site: 'sme', division: 'enterprise', subdomain: 'sme', label: 'Cerulea for SMEs', steerTierId: 'ent_sme' },
  enterprise: { site: 'enterprise', division: 'enterprise', subdomain: 'enterprise', label: 'Cerulea for Enterprise' },
  gov: { site: 'gov', division: 'govt', subdomain: 'gov', label: 'Cerulea for Government' },
};

// ─── Currency (single USD for now; seam kept for the future) ─────────────────
export type Currency = 'usd';
export function currencyForDivision(_division: Division): Currency {
  return 'usd';
}

// ─── Studio flavor (how the studio behaves per division) ──────────────────────
// dapp  → the existing dApp / private-chain studio (projectType chooser)
// enterprise (incl. SME) and govt → the "chain" studio flavor, locked.
export type StudioFlavor = 'dapp' | 'enterprise' | 'govt';
export function studioFlavorForDivision(division: Division): StudioFlavor {
  return division; // 1:1 today; kept as a function so it can diverge later
}

// The project type a division's studio is locked to. `null` = user chooses
// (dapp division only offers the dapp/blockchain chooser today).
export function lockedProjectType(division: Division): 'dapp' | 'blockchain' | null {
  switch (division) {
    case 'dapp': return null;           // dapp division keeps the existing chooser
    case 'enterprise': return 'blockchain';
    case 'govt': return 'blockchain';
  }
}

// ─── Host → marketing site / division resolution ─────────────────────────────
// Handles prod (dapps.cerulea.io), preview, and local (dapps.localhost:3000).
export function marketingSiteFromHost(host: string | null | undefined): MarketingSite | null {
  if (!host) return null;
  const h = host.toLowerCase().split(':')[0]; // strip port
  const label = h.split('.')[0];              // leftmost label
  if (label in MARKETING_SITES) return label as MarketingSite;
  return null;
}

export function divisionFromHost(host: string | null | undefined): Division | null {
  const site = marketingSiteFromHost(host);
  return site ? MARKETING_SITES[site].division : null;
}

// ─── Active-subscription shape carried on the auth token/session ──────────────
// A user may hold up to one active subscription per division. `null` = no
// active sub for that division (→ show that division's pricing).
export type DivisionSubs = Partial<Record<Division, string | null>>;

/** The tier id a user holds in a division, or null if unsubscribed there. */
export function tierForDivision(subs: DivisionSubs | undefined, division: Division): string | null {
  return subs?.[division] ?? null;
}

/** Does the user have an active paid subscription in this division? */
export function hasDivisionAccess(subs: DivisionSubs | undefined, division: Division): boolean {
  return !!tierForDivision(subs, division);
}
