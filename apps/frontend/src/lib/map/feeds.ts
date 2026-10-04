// apps/frontend/src/lib/map/feeds.ts
// The feeds link.
// Records move from one part to another. The link draws as an arrow.
//
// Cerulea derives the link where the answer is plain. A receiving part with one
// possible source in this project gets the link without a question. A receiving
// part with two or more possible sources needs a human decision, so Cerulea
// asks which part is the source of record.
//
// Without a feeds link the receiving part sees no record from that source.

import type { CatalogueModule } from '@/lib/catalogue/types';
import { linkIdFor, type MapLink } from './links';
import { edgesWithin, relationReason, type RelationCatalogue, type RelationEdge } from './relations';

export type FeedsOption = {
  from: string;
  /** The name a user reads for the source. */
  fromTitle: string;
  /** One sentence stating what the catalogue records about this pair. */
  reason: string;
  relations: string[];
};

export type FeedsQuestion = {
  to: string;
  /** The name a user reads for the receiving part. */
  toTitle: string;
  /** One plain question a user answers. */
  question: string;
  options: FeedsOption[];
};

export type FeedsResult = {
  /** The links Cerulea drew without asking. */
  derived: MapLink[];
  /** The questions a user answers before the rest of the links appear. */
  questions: FeedsQuestion[];
};

function titlesFor(modules: CatalogueModule[]): Record<string, string> {
  return Object.fromEntries(modules.map((part) => [part.moduleId, part.title]));
}

function linkFromEdge(edge: RelationEdge, titleById: Record<string, string>, origin: 'derived' | 'chosen'): MapLink {
  return {
    linkId: linkIdFor('feeds', edge.from, edge.to),
    from: edge.from,
    to: edge.to,
    type: 'feeds',
    origin,
    reason: relationReason(edge, titleById),
    removable: origin === 'chosen',
  };
}

/**
 * Derives every feeds link the project can settle on its own, and asks about
 * the rest.
 */
export function resolveFeedsLinks(
  installOrder: string[],
  modules: CatalogueModule[],
  catalogue: RelationCatalogue,
): FeedsResult {
  const titleById = titlesFor(modules);
  const edges = edgesWithin(catalogue, 'feeds', installOrder);

  const byTarget = new Map<string, RelationEdge[]>();
  for (const edge of edges) {
    byTarget.set(edge.to, [...(byTarget.get(edge.to) ?? []), edge]);
  }

  const derived: MapLink[] = [];
  const questions: FeedsQuestion[] = [];

  for (const target of Array.from(byTarget.keys()).sort()) {
    const candidates = (byTarget.get(target) ?? []).sort((left, right) =>
      left.from.localeCompare(right.from),
    );
    if (candidates.length === 1) {
      derived.push(linkFromEdge(candidates[0], titleById, 'derived'));
      continue;
    }
    const toTitle = titleById[target] ?? target;
    questions.push({
      to: target,
      toTitle,
      question:
        `${toTitle} can read records from ${candidates.length} parts in this project. ` +
        'Pick the parts it should read from. Cerulea draws an arrow for each one we pick.',
      options: candidates.map((edge) => ({
        from: edge.from,
        fromTitle: titleById[edge.from] ?? edge.from,
        reason: relationReason(edge, titleById),
        relations: edge.relations,
      })),
    });
  }

  return { derived, questions };
}

/** Turns an answer to a feeds question into the links a user chose. */
export function answerFeedsQuestion(
  question: FeedsQuestion,
  chosenSources: string[],
  modules: CatalogueModule[],
  catalogue: RelationCatalogue,
): MapLink[] {
  const titleById = titlesFor(modules);
  const picked = new Set(chosenSources);
  return catalogue.edges
    .filter((edge) => edge.type === 'feeds' && edge.to === question.to && picked.has(edge.from))
    .map((edge) => linkFromEdge(edge, titleById, 'chosen'))
    .sort((left, right) => left.linkId.localeCompare(right.linkId));
}
