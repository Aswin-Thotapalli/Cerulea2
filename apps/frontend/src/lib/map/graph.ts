// apps/frontend/src/lib/map/graph.ts
// The module map.
// The canvas stops being a place where a user draws an architecture. It becomes
// a map that explains the architecture Cerulea assembled.
// Every card names the outcome that caused it, what the part contributes and
// what stops working after removal.
// Without the map a user reads a list of parts and learns nothing about why
// each one is there.

import type { CatalogueModule } from '@/lib/catalogue/types';
import { groupLabel } from '@/lib/outcomes/catalogue';
import type { OutcomeResolution } from '@/lib/outcomes/resolve';

export type MapNode = {
  /** The module behind the card. A user never reads this value. */
  moduleId: string;
  /** The name a user reads. */
  title: string;
  /** The plain area this part belongs to. */
  area: string;
  /** One sentence stating what this part contributes. */
  contribution: string;
  /** The outcomes that caused this card to appear. */
  causedBy: string[];
  /** The identifiers behind those outcomes. */
  causedByOutcomeIds: string[];
  /** True while an outcome names this part directly. */
  chosenDirectly: boolean;
  /** The parts that asked for this one. */
  requiredBy: string[];
  /** One sentence stating what stops working after removal. */
  removalConsequence: string;
  /** The depth of this part in the dependency order. Zero needs nothing. */
  depth: number;
};

export type ModuleMapModel = {
  nodes: MapNode[];
  /** The deepest layer in the map. */
  depth: number;
};

/**
 * Measures how far a part sits from the parts that need nothing.
 * A part with no dependency sits at depth zero. Every other part sits one below
 * the deepest part it needs.
 */
export function dependencyDepths(
  installOrder: string[],
  modules: CatalogueModule[],
): Record<string, number> {
  const index = new Map(modules.map((part) => [part.moduleId, part]));
  const held = new Set(installOrder);
  const depths: Record<string, number> = {};
  // installOrder places every dependency before the part that needs it.
  for (const moduleId of installOrder) {
    let depth = 0;
    for (const dependency of index.get(moduleId)?.dependsOn ?? []) {
      if (!held.has(dependency)) continue;
      depth = Math.max(depth, (depths[dependency] ?? 0) + 1);
    }
    depths[moduleId] = depth;
  }
  return depths;
}

/** Builds the map from a resolved project. */
export function buildModuleMap(
  resolution: OutcomeResolution,
  modules: CatalogueModule[],
): ModuleMapModel {
  const index = new Map(modules.map((part) => [part.moduleId, part]));
  const depths = dependencyDepths(resolution.installOrder, modules);

  const nodes: MapNode[] = resolution.modules.map((installed) => ({
    moduleId: installed.moduleId,
    title: installed.title,
    area: groupLabel(index.get(installed.moduleId)?.category ?? ''),
    contribution: installed.contribution,
    causedBy: installed.causedBy,
    causedByOutcomeIds: installed.causedByOutcomeIds,
    chosenDirectly: installed.chosenDirectly,
    requiredBy: installed.requiredBy,
    removalConsequence: installed.removalConsequence,
    depth: depths[installed.moduleId] ?? 0,
  }));

  return {
    nodes,
    depth: nodes.reduce((deepest, node) => Math.max(deepest, node.depth), 0),
  };
}

/** Groups the cards by the outcome that caused them, so the map reads by intent. */
export function groupNodesByOutcome(map: ModuleMapModel): Array<{ outcome: string; nodes: MapNode[] }> {
  const byOutcome = new Map<string, MapNode[]>();
  for (const node of map.nodes) {
    for (const statement of node.causedBy) {
      const list = byOutcome.get(statement) ?? [];
      list.push(node);
      byOutcome.set(statement, list);
    }
  }
  return Array.from(byOutcome.entries())
    .map(([outcome, nodes]) => ({ outcome, nodes }))
    .sort((left, right) => left.outcome.localeCompare(right.outcome));
}

/** Groups the cards by layer, so the map draws dependencies below their dependants. */
export function nodesByDepth(map: ModuleMapModel): MapNode[][] {
  const layers: MapNode[][] = [];
  for (let depth = 0; depth <= map.depth; depth += 1) {
    layers.push(
      map.nodes
        .filter((node) => node.depth === depth)
        .sort((left, right) => left.title.localeCompare(right.title)),
    );
  }
  return layers;
}
