// apps/frontend/src/lib/map/triggers.ts
// The triggers link.
// One part starts work in another. The link draws as a dashed arrow.
//
// Cerulea derives no triggers link. A trigger is a decision about how the
// organisation wants work to run, so a person always chooses it.
// The picker lists only the pairs the Cerulea catalogue records as a trigger
// relation between two parts the project holds. An invalid pair never appears,
// and an invalid pair is refused when a surface asks for it anyway.
//
// Without a triggers link the work waits for a person instead.

import type { CatalogueModule } from '@/lib/catalogue/types';
import { LinkNotEditable, linkIdFor, type MapLink } from './links';
import { edgesWithin, relationReason, type RelationCatalogue } from './relations';

export type TriggerPair = {
  from: string;
  fromTitle: string;
  to: string;
  toTitle: string;
  /** One sentence stating what the catalogue records about the pair. */
  reason: string;
  relations: string[];
  /** One plain sentence stating what happens once the link exists. */
  effect: string;
};

function titlesFor(modules: CatalogueModule[]): Record<string, string> {
  return Object.fromEntries(modules.map((part) => [part.moduleId, part.title]));
}

/** Lists every pair the picker may offer. Nothing outside this list is valid. */
export function validTriggerPairs(
  installOrder: string[],
  modules: CatalogueModule[],
  catalogue: RelationCatalogue,
): TriggerPair[] {
  const titleById = titlesFor(modules);
  return edgesWithin(catalogue, 'triggers', installOrder)
    .map((edge) => {
      const fromTitle = titleById[edge.from] ?? edge.from;
      const toTitle = titleById[edge.to] ?? edge.to;
      return {
        from: edge.from,
        fromTitle,
        to: edge.to,
        toTitle,
        reason: relationReason(edge, titleById),
        relations: edge.relations,
        effect: `${fromTitle} starts the work in ${toTitle} without a person.`,
      };
    })
    .sort((left, right) => `${left.from}->${left.to}`.localeCompare(`${right.from}->${right.to}`));
}

/** Reports whether a pair may carry a triggers link. */
export function isValidTriggerPair(
  from: string,
  to: string,
  pairs: TriggerPair[],
): boolean {
  return pairs.some((pair) => pair.from === from && pair.to === to);
}

/**
 * Creates the triggers link a user chose.
 * An invalid pair refuses and names the list that holds the valid ones.
 */
export function createTriggerLink(from: string, to: string, pairs: TriggerPair[]): MapLink {
  const pair = pairs.find((candidate) => candidate.from === from && candidate.to === to);
  if (!pair) {
    throw new LinkNotEditable(
      'Cerulea holds no trigger relation between those two parts. ' +
        'Pick a pair from the list the picker shows.',
    );
  }
  return {
    linkId: linkIdFor('triggers', from, to),
    from,
    to,
    type: 'triggers',
    origin: 'chosen',
    reason: `${pair.reason} ${pair.effect}`,
    removable: true,
  };
}

/** Adds a triggers link, and adds one pair once. */
export function addTriggerLink(links: MapLink[], link: MapLink): MapLink[] {
  if (links.some((candidate) => candidate.linkId === link.linkId)) return links;
  return [...links, link].sort((left, right) => left.linkId.localeCompare(right.linkId));
}
