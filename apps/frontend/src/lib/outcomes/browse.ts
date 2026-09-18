// apps/frontend/src/lib/outcomes/browse.ts
// Presents the outcome catalogue to a user.
// A user reads plain statements, grouped by the area each belongs to, and
// selects the ones the system should deliver.
// Each statement names the module bundle Cerulea installs for it.
// Without the statements a user must decompose the work into modules, which is
// software architecture.

import type { CatalogueModule, ProjectTrack } from '@/lib/catalogue/types';
import { indexModules, resolveDependencyClosure, type ModuleIndex } from '@/lib/modules/resolve';
import { termSet, tokenise } from '@/lib/intent/tokenise';
import { deriveOutcomes, type Outcome } from './catalogue';

/** One module of the bundle an outcome installs. */
export type BundlePart = {
  moduleId: string;
  title: string;
  /** One sentence stating what this module contributes. */
  contribution: string;
  /** True while this module is the one the statement came from. */
  anchor: boolean;
  /** The reason the seed records for pulling this module in. */
  reason: string | null;
};

/** One outcome, ready to read and to select. */
export type OutcomeCard = {
  outcome: Outcome;
  /** Every module Cerulea installs for this statement, dependencies included. */
  bundle: BundlePart[];
  /** Module names the bundle asks for that the catalogue does not hold. */
  missingParts: string[];
  /** The terms this card answers a search with. */
  searchTerms: Set<string>;
};

/** Builds the module bundle one outcome resolves to. */
export function outcomeBundle(outcome: Outcome, index: ModuleIndex): {
  bundle: BundlePart[];
  missingParts: string[];
} {
  const closure = resolveDependencyClosure([outcome.anchorModuleId], index);
  const bundle = closure.installed.map((moduleId) => {
    const part = index.get(moduleId) as CatalogueModule;
    return {
      moduleId,
      title: part.title,
      contribution: part.blurb ?? part.longDescription?.[0] ?? part.title,
      anchor: moduleId === outcome.anchorModuleId,
      reason: closure.reasonById[moduleId] ?? null,
    };
  });
  return { bundle, missingParts: closure.missing };
}

/** Describes one outcome for the catalogue surface. */
export function describeOutcome(outcome: Outcome, index: ModuleIndex): OutcomeCard {
  const { bundle, missingParts } = outcomeBundle(outcome, index);
  return {
    outcome,
    bundle,
    missingParts,
    searchTerms: termSet([
      outcome.statement,
      outcome.contribution,
      outcome.group,
      ...outcome.tags,
      ...bundle.map((part) => part.title),
    ]),
  };
}

/** Describes the whole outcome catalogue. */
export function describeOutcomes(modules: CatalogueModule[]): OutcomeCard[] {
  const index = indexModules(modules);
  return deriveOutcomes(modules).map((outcome) => describeOutcome(outcome, index));
}

export type OutcomeFilter = {
  query?: string;
  group?: string;
  track?: ProjectTrack | 'any';
};

/** Narrows the outcome catalogue. A search matches when the card answers every word. */
export function filterOutcomes(cards: OutcomeCard[], filter: OutcomeFilter): OutcomeCard[] {
  const terms = tokenise(filter.query ?? '');
  return cards.filter((card) => {
    if (filter.track && filter.track !== 'any' && card.outcome.projectType !== filter.track) return false;
    if (filter.group && filter.group !== 'any' && card.outcome.group !== filter.group) return false;
    return terms.every((term) => card.searchTerms.has(term));
  });
}

/** Groups outcome cards by area, ordered by how many outcomes sit in each. */
export function groupOutcomeCards(cards: OutcomeCard[]): Array<{ group: string; cards: OutcomeCard[] }> {
  const byGroup = new Map<string, OutcomeCard[]>();
  for (const card of cards) {
    const list = byGroup.get(card.outcome.group);
    if (list) list.push(card);
    else byGroup.set(card.outcome.group, [card]);
  }
  return Array.from(byGroup.entries())
    .map(([group, list]) => ({ group, cards: list }))
    .sort((left, right) => (right.cards.length - left.cards.length) || left.group.localeCompare(right.group));
}
