// apps/frontend/src/lib/modules/resolve.ts
// Resolves the full dependency closure of a module set, in the manner of a
// package manager. Cerulea installs every module a chosen module needs, and
// states which module asked for it.
// Without the closure a project installs a module whose support is absent, and
// the module fails on first use.

import type { CatalogueModule } from '@/lib/catalogue/types';

export type ModuleIndex = Map<string, CatalogueModule>;

/** Builds the lookup Cerulea resolves against. */
export function indexModules(modules: CatalogueModule[]): ModuleIndex {
  return new Map(modules.map((part) => [part.moduleId, part]));
}

export type ClosureResult = {
  /** Every module to install, dependencies before the module that needs them. */
  installed: string[];
  /** The modules a user chose, in the order they were given. */
  chosen: string[];
  /** For each installed module, the modules that asked for it. */
  requiredBy: Record<string, string[]>;
  /** The reason a module was pulled in, taken from the seed. */
  reasonById: Record<string, string>;
  /** Module identifiers a dependency list names that the catalogue does not hold. */
  missing: string[];
};

/**
 * Walks the dependency lists and returns every module to install.
 * Dependencies land before the module that needs them, so an install order is
 * safe to follow. Equal candidates keep alphabetical order, so the same input
 * always produces the same list.
 */
export function resolveDependencyClosure(seedIds: string[], index: ModuleIndex): ClosureResult {
  const installed: string[] = [];
  const visited = new Set<string>();
  const onPath = new Set<string>();
  const requiredBy: Record<string, string[]> = {};
  const reasonById: Record<string, string> = {};
  const missing = new Set<string>();

  const chosen = Array.from(new Set(seedIds));

  const visit = (moduleId: string, askedBy: string | null) => {
    if (askedBy) {
      const list = requiredBy[moduleId] ?? [];
      if (!list.includes(askedBy)) list.push(askedBy);
      requiredBy[moduleId] = list;
      const reason = index.get(askedBy)?.reasonByDepId?.[moduleId];
      if (reason && !reasonById[moduleId]) reasonById[moduleId] = reason;
    }
    if (visited.has(moduleId) || onPath.has(moduleId)) return;
    const part = index.get(moduleId);
    if (!part) {
      missing.add(moduleId);
      return;
    }
    onPath.add(moduleId);
    for (const dependency of [...(part.dependsOn ?? [])].sort()) {
      visit(dependency, moduleId);
    }
    onPath.delete(moduleId);
    visited.add(moduleId);
    installed.push(moduleId);
  };

  for (const moduleId of chosen) visit(moduleId, null);

  return {
    installed,
    chosen,
    requiredBy,
    reasonById,
    missing: Array.from(missing).sort(),
  };
}

/** Lists the modules that would stop working after one module is removed. */
export function dependantsOf(moduleId: string, modules: CatalogueModule[]): CatalogueModule[] {
  return modules.filter((candidate) => (candidate.dependsOn ?? []).includes(moduleId));
}

/**
 * Lists the modules a set recommends and does not yet hold.
 * The catalogue records a recommendation list per module. A gap is a real gap.
 */
export function recommendationGaps(installed: string[], index: ModuleIndex): Array<{
  moduleId: string;
  recommendedBy: string[];
}> {
  const held = new Set(installed);
  const byModule = new Map<string, string[]>();
  for (const moduleId of installed) {
    for (const recommended of index.get(moduleId)?.recommends ?? []) {
      if (held.has(recommended)) continue;
      if (!index.has(recommended)) continue;
      const list = byModule.get(recommended) ?? [];
      if (!list.includes(moduleId)) list.push(moduleId);
      byModule.set(recommended, list);
    }
  }
  return Array.from(byModule.entries())
    .map(([moduleId, recommendedBy]) => ({ moduleId, recommendedBy: recommendedBy.sort() }))
    .sort((left, right) => left.moduleId.localeCompare(right.moduleId));
}
