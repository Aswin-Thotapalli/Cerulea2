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

/** Division a saved project belongs to, derived from its type and template ids. */
export function divisionForProject(projectType: string | null | undefined, templateIds: unknown): Division {
  if (projectType === 'dapp') return 'dapp';
  let ids: string[] = [];
  if (Array.isArray(templateIds)) ids = templateIds as string[];
  else if (typeof templateIds === 'string') {
    try { const p = JSON.parse(templateIds); if (Array.isArray(p)) ids = p; } catch {}
  }
  if (ids.some((t) => String(t).startsWith('govt-'))) return 'govt';
  return 'enterprise';
}

/** Studio URL that opens a saved project inside its division. */
export function studioProjectUrl(base: string, projectId: string, division: string | null | undefined): string {
  const d: Division = division === 'dapp' || division === 'govt' || division === 'enterprise' ? division : 'enterprise';
  return `${base}/${pathSegmentForDivision(d)}?project=${encodeURIComponent(projectId)}`;
}

// Human labels for the studio.cerulea.io chooser.
export const DIVISION_LABELS: Record<Division, { title: string; blurb: string }> = {
  dapp: { title: 'dApps', blurb: 'Decentralised applications on the Cerulea public-access chain or on a private Blockchain.' },
  enterprise: { title: 'Enterprise', blurb: 'Private Blockchain networks with single sign-on, role-based access, audit-grade records and on-premises hosting.' },
  govt: { title: 'Government', blurb: 'Sovereign infrastructure on national soil, with citizen identity and public transparency.' },
};

// ─── Division and workspace application ─────────────────────────────────────
// Cerulea APIs fixes an application on each workspace. The application names
// the division the workspace serves.
export type WorkspaceApplication = 'dapps' | 'enterprise' | 'government';

const APPLICATION_TO_DIVISION: Record<WorkspaceApplication, Division> = {
  dapps: 'dapp',
  enterprise: 'enterprise',
  government: 'govt',
};

const DIVISION_TO_APPLICATION: Record<Division, WorkspaceApplication> = {
  dapp: 'dapps',
  enterprise: 'enterprise',
  govt: 'government',
};

/** The division a workspace application serves, or null for an unknown value. */
export function divisionForApplication(application: string | null | undefined): Division | null {
  if (!application) return null;
  return APPLICATION_TO_DIVISION[application as WorkspaceApplication] ?? null;
}

/** The workspace application a division opens. */
export function applicationForDivision(division: Division): WorkspaceApplication {
  return DIVISION_TO_APPLICATION[division];
}

/** Reads a division id from any value, or null. */
export function asDivision(value: unknown): Division | null {
  return value === 'dapp' || value === 'enterprise' || value === 'govt' ? value : null;
}

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

// The project type a division's studio is locked to. Every division locks its
// type and skips the "dApp vs private blockchain" chooser: the dapp division is
// always dApp; enterprise and govt are always private blockchain.
export function lockedProjectType(division: Division): 'dapp' | 'blockchain' | null {
  switch (division) {
    case 'dapp': return 'dapp';
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
