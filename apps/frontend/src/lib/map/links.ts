// apps/frontend/src/lib/map/links.ts
// The four link types on the module map.
//
// Requires. Derived from the dependency lists. Drawn as a solid line. A user
// creates none and deletes none. Removing the outcome removes the link.
// Feeds. Data moves from one part to another. Drawn as an arrow.
// Triggers. One part starts work in another. Always chosen. Drawn as a dashed
// arrow.
// Governs. One part authorises another. Derived from the permission matrix.
// Drawn as a dotted line.
//
// Separating the four removes the ambiguity that one undifferentiated wire
// carries. Two of the four are fully automatic.

import type { CatalogueModule } from '@/lib/catalogue/types';

export type LinkType = 'requires' | 'feeds' | 'triggers' | 'governs';

/** How a link came to exist. */
export type LinkOrigin = 'derived' | 'chosen';

export type MapLink = {
  linkId: string;
  from: string;
  to: string;
  type: LinkType;
  origin: LinkOrigin;
  /** One sentence stating why the link is there. */
  reason: string;
  /** True while a user may delete this link. */
  removable: boolean;
};

export type LinkStyle = {
  /** The name a user reads. */
  label: string;
  /** One sentence stating what the link means and what breaks without it. */
  meaning: string;
  stroke: 'solid' | 'dashed' | 'dotted';
  arrow: boolean;
  /** True while a user may draw a link of this type. */
  userCreates: boolean;
};

export const LINK_STYLE: Record<LinkType, LinkStyle> = {
  requires: {
    label: 'Requires',
    meaning:
      'This part needs the part at the other end. Cerulea installs both. Remove the other end and ' +
      'this part stops working.',
    stroke: 'solid',
    arrow: false,
    userCreates: false,
  },
  feeds: {
    label: 'Feeds',
    meaning:
      'Records move from one part to the other. Remove the link and the receiving part sees no ' +
      'record from that source.',
    stroke: 'solid',
    arrow: true,
    userCreates: true,
  },
  triggers: {
    label: 'Triggers',
    meaning:
      'One part starts work in the other. Remove the link and the work waits for a person instead.',
    stroke: 'dashed',
    arrow: true,
    userCreates: true,
  },
  governs: {
    label: 'Governs',
    meaning:
      'One part decides who may use the other. Remove the link and the other part accepts every ' +
      'caller.',
    stroke: 'dotted',
    arrow: false,
    userCreates: false,
  },
};

/** Builds the identifier of one link. */
export function linkIdFor(type: LinkType, from: string, to: string): string {
  return `${type}:${from}->${to}`;
}

/**
 * Derives every requires link from the dependency lists.
 * The link exists because the catalogue records the dependency. A user neither
 * draws one nor deletes one.
 */
export function deriveRequiresLinks(installOrder: string[], modules: CatalogueModule[]): MapLink[] {
  const index = new Map(modules.map((part) => [part.moduleId, part]));
  const held = new Set(installOrder);
  const links: MapLink[] = [];

  for (const moduleId of installOrder) {
    const part = index.get(moduleId);
    if (!part) continue;
    for (const dependency of [...(part.dependsOn ?? [])].sort()) {
      if (!held.has(dependency)) continue;
      const reason =
        part.reasonByDepId?.[dependency] ??
        `${part.title} needs ${index.get(dependency)?.title ?? dependency} to work.`;
      links.push({
        linkId: linkIdFor('requires', moduleId, dependency),
        from: moduleId,
        to: dependency,
        type: 'requires',
        origin: 'derived',
        reason,
        removable: false,
      });
    }
  }

  return links.sort((left, right) => left.linkId.localeCompare(right.linkId));
}

/** Reports whether a user may draw a link of this type. */
export function userMayCreate(type: LinkType): boolean {
  return LINK_STYLE[type].userCreates;
}

/** Reports whether a user may delete this link. */
export function userMayDelete(link: MapLink): boolean {
  return link.removable;
}

/**
 * Raised when a surface asks for a link a user may not draw or delete.
 * The message names the action that reaches the same result.
 */
export class LinkNotEditable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkNotEditable';
  }
}

/** Creates a link a user drew. A derived type refuses and names the fix. */
export function createUserLink(
  type: LinkType,
  from: string,
  to: string,
  reason: string,
): MapLink {
  if (!userMayCreate(type)) {
    throw new LinkNotEditable(
      `Cerulea draws every ${LINK_STYLE[type].label.toLowerCase()} link itself. ` +
        'Add or remove an outcome to change these links.',
    );
  }
  return {
    linkId: linkIdFor(type, from, to),
    from,
    to,
    type,
    origin: 'chosen',
    reason,
    removable: true,
  };
}

/** Deletes a link a user drew. A derived link refuses and names the fix. */
export function deleteUserLink(links: MapLink[], linkId: string): MapLink[] {
  const link = links.find((candidate) => candidate.linkId === linkId);
  if (!link) return links;
  if (!userMayDelete(link)) {
    throw new LinkNotEditable(
      `Cerulea draws this ${LINK_STYLE[link.type].label.toLowerCase()} link itself. ` +
        'Remove the outcome that installed these parts to remove the link.',
    );
  }
  return links.filter((candidate) => candidate.linkId !== linkId);
}
