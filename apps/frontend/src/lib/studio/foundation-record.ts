// apps/frontend/src/lib/studio/foundation-record.ts
// The Foundation details the build state keeps beside its typed fields.
// The production Foundation asks for the visibility of a dApp and for the
// legacy mode of a private network, and the specification adds the derived
// network with its reason. The typed build state has no field for these three,
// so they sit in its draft area under one key, read and written through here.

/** The draft keys Foundation and the Blueprint canvas write. */
export const FOUNDATION_DRAFT_KEYS = {
  details: 'foundation::details',
  intent: 'foundation::intent',
  /** The collections the last composition installed, so the next one knows what to replace. */
  composed: 'blueprint::composed',
} as const;

export type NetworkKind = 'public-access' | 'private';

export type FoundationDetails = {
  dappVisibility: 'public' | 'private' | null;
  legacyMode: 'none' | 'connect' | 'port';
  network: { kind: NetworkKind; reason: string; overridden: boolean };
};

/** Reads the details out of the draft area, filling every absent part. */
export function readFoundationDetails(value: unknown): FoundationDetails {
  const held = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const network = held.network && typeof held.network === 'object' ? (held.network as Record<string, unknown>) : {};
  return {
    dappVisibility:
      held.dappVisibility === 'public' || held.dappVisibility === 'private' ? held.dappVisibility : null,
    legacyMode: held.legacyMode === 'connect' || held.legacyMode === 'port' ? held.legacyMode : 'none',
    network: {
      kind: network.kind === 'public-access' ? 'public-access' : 'private',
      reason: typeof network.reason === 'string' ? network.reason : '',
      overridden: network.overridden === true,
    },
  };
}

/**
 * The disclosure level a project opens at before anybody changes it.
 * Enterprise and Government carry duties that live in the designer, so both
 * open there. A Dapps project from a template meets the questions; every other
 * Dapps project meets the outcomes.
 */
export function openingLevel(application: string, templateId: string): 1 | 2 | 3 | 4 {
  if (application === 'government' || application === 'enterprise') return 3;
  return templateId.length > 0 ? 1 : 2;
}

/** Reads the collection identifiers the last composition recorded. */
export function readComposedIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}
