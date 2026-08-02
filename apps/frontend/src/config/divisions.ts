// apps/frontend/src/config/divisions.ts
//
// Bedrock for Cerulea's multi-division architecture.
//
// ONE codebase, ONE studio host. The division is decided per-request from the
// URL PATH under studio.cerulea.io:
//
//   studio.cerulea.io/           → 3-option chooser (Dapps / Enterprise / Govt)
//   studio.cerulea.io/dapps      → dapp studio
//   studio.cerulea.io/enterprise → enterprise studio (SME enters here too)
//   studio.cerulea.io/govt       → government studio
//
// Every gate (studio flavor, templates, modules, pricing, feature entitlements)
// reads the division resolved here. No catalog/price/feature specifics live in
// this file so it never changes when tiers or add-ons are tweaked.

// ─── Division (the studio + pricing axis) ────────────────────────────────────
// SME is NOT its own division — it is the entry tier of `enterprise`.
export type Division = 'dapp' | 'enterprise' | 'govt';

export const DIVISIONS: Division[] = ['dapp', 'enterprise', 'govt'];

// ─── Path segment ↔ division ─────────────────────────────────────────────────
// The URL uses `dapps` (plural) and `govt`; the division ids are `dapp`/`govt`.
export const DIVISION_PATH_SEGMENTS: Record<string, Division> = {
  dapps: 'dapp',
  enterprise: 'enterprise',
  govt: 'govt',
};

const DIVISION_TO_SEGMENT: Record<Division, string> = {
  dapp: 'dapps',
  enterprise: 'enterprise',
  govt: 'govt',
};

/** The URL path segment for a division, e.g. 'dapp' → 'dapps'. */
export function pathSegmentForDivision(division: Division): string {
  return DIVISION_TO_SEGMENT[division];
}

/** Resolve the division from a URL pathname's first segment, or null. */
export function divisionFromPath(pathname: string | null | undefined): Division | null {
  if (!pathname) return null;
  const seg = pathname.replace(/^\/+/, '').split('/')[0]?.toLowerCase();
  if (!seg) return null;
  return DIVISION_PATH_SEGMENTS[seg] ?? null;
}

// Human labels for the studio.cerulea.io chooser.
export const DIVISION_LABELS: Record<Division, { title: string; blurb: string }> = {
  dapp: { title: 'dApps', blurb: 'Build and deploy decentralized apps on Cerulea L1 or your own chain.' },
  enterprise: { title: 'Enterprise', blurb: 'Sovereign chains with SSO, RBAC, audit-grade logging, and on-prem options.' },
  govt: { title: 'Government', blurb: 'Sovereign, on-soil infrastructure with citizen identity and public transparency.' },
};

// ─── Currency (single USD for now; seam kept for the future) ─────────────────
export type Currency = 'usd';
export function currencyForDivision(_division: Division): Currency {
  return 'usd';
}

// ─── Studio flavor (how the studio behaves per division) ──────────────────────
export type StudioFlavor = 'dapp' | 'enterprise' | 'govt';
export function studioFlavorForDivision(division: Division): StudioFlavor {
  return division; // 1:1 today; kept as a function so it can diverge later
}

// The project type a division's studio is locked to. `null` = user chooses.
export function lockedProjectType(division: Division): 'dapp' | 'blockchain' | null {
  switch (division) {
    case 'dapp': return null;           // dapp division keeps the existing chooser
    case 'enterprise': return 'blockchain';
    case 'govt': return 'blockchain';
  }
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
