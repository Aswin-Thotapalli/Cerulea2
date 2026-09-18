// apps/frontend/src/lib/map/relations.ts
// The relation catalogue.
//
// The 100 Cerulea templates record a relation between two modules on every edge
// they draw. Thirty-four relation words appear across them. Cerulea sorts each
// word into one of the three link types a relation can carry.
//
// Feeds. Records move from one part to the other.
// Triggers. One part starts work in the other.
// Governs. One part decides who may use the other.
//
// One word, integrates, names a plain association and carries no link.
//
// The catalogue is the evidence behind every derived feeds link and behind
// every pair a triggers picker offers. Cerulea invents no relation.

import type { CatalogueTemplate } from '@/lib/catalogue/types';
import type { LinkType } from './links';

/** Every relation word the templates use, sorted by the link it carries. */
export const RELATION_LINK_TYPE: Record<string, LinkType | 'none'> = {
  feeds: 'feeds',
  emits: 'feeds',
  writes: 'feeds',
  indexes: 'feeds',
  stores: 'feeds',
  lists: 'feeds',
  publishes: 'feeds',
  resolves: 'feeds',
  exposes: 'feeds',
  param: 'feeds',
  submits: 'feeds',
  routes: 'feeds',
  batches: 'feeds',

  triggers: 'triggers',
  notifies: 'triggers',
  alerts: 'triggers',
  executes: 'triggers',
  drives: 'triggers',
  hooks: 'triggers',
  mints: 'triggers',
  challenges: 'triggers',
  settles: 'triggers',
  pays: 'triggers',
  charges: 'triggers',
  funds: 'triggers',

  gates: 'governs',
  governs: 'governs',
  controls: 'governs',
  enforces: 'governs',
  validates: 'governs',
  attests: 'governs',
  manages: 'governs',
  licenses: 'governs',

  integrates: 'none',
};

export type RelationEdge = {
  from: string;
  to: string;
  /** The relation words the templates record for this pair. */
  relations: string[];
  type: LinkType;
  /** The templates that record the relation. */
  templates: string[];
};

export type RelationCatalogue = {
  edges: RelationEdge[];
  /** Every edge of one type, keyed by the part it points at. */
  byTarget: Record<LinkType, Record<string, RelationEdge[]>>;
};

/** Reads the link type a relation word carries. */
export function linkTypeForRelation(relation: string): LinkType | 'none' {
  return RELATION_LINK_TYPE[relation.toLowerCase()] ?? 'none';
}

/** Builds the relation catalogue from the template edges. */
export function buildRelationCatalogue(templates: CatalogueTemplate[]): RelationCatalogue {
  const byPair = new Map<string, { from: string; to: string; relations: Set<string>; templates: Set<string> }>();

  for (const template of templates) {
    for (const edge of template.edges ?? []) {
      const key = `${edge.from}->${edge.to}`;
      const entry = byPair.get(key) ?? {
        from: edge.from,
        to: edge.to,
        relations: new Set<string>(),
        templates: new Set<string>(),
      };
      entry.relations.add(edge.rel);
      entry.templates.add(template.id);
      byPair.set(key, entry);
    }
  }

  const edges: RelationEdge[] = [];
  for (const entry of byPair.values()) {
    const types = new Set(
      Array.from(entry.relations)
        .map(linkTypeForRelation)
        .filter((type): type is LinkType => type !== 'none'),
    );
    for (const type of Array.from(types).sort()) {
      edges.push({
        from: entry.from,
        to: entry.to,
        relations: Array.from(entry.relations)
          .filter((relation) => linkTypeForRelation(relation) === type)
          .sort(),
        type,
        templates: Array.from(entry.templates).sort(),
      });
    }
  }

  edges.sort((left, right) =>
    `${left.type}:${left.from}->${left.to}`.localeCompare(`${right.type}:${right.from}->${right.to}`),
  );

  const byTarget: RelationCatalogue['byTarget'] = {
    requires: {},
    feeds: {},
    triggers: {},
    governs: {},
  };
  for (const edge of edges) {
    const bucket = byTarget[edge.type];
    bucket[edge.to] = [...(bucket[edge.to] ?? []), edge];
  }

  return { edges, byTarget };
}

/** Lists the relation edges of one type between parts the project holds. */
export function edgesWithin(
  catalogue: RelationCatalogue,
  type: LinkType,
  installOrder: string[],
): RelationEdge[] {
  const held = new Set(installOrder);
  return catalogue.edges.filter(
    (edge) => edge.type === type && held.has(edge.from) && held.has(edge.to),
  );
}

/** Writes the plain sentence behind one relation edge. */
export function relationReason(
  edge: RelationEdge,
  titleById: Record<string, string>,
): string {
  const from = titleById[edge.from] ?? edge.from;
  const to = titleById[edge.to] ?? edge.to;
  const verb = edge.relations[0];
  const templates = edge.templates.length;
  return (
    `${from} ${verb} ${to}. ` +
    `${templates} Cerulea ${templates === 1 ? 'template records' : 'templates record'} that relation.`
  );
}
