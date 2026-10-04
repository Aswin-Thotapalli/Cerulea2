// apps/frontend/src/lib/outcomes/reflect.ts
// Reading a part set back as the statements that explain it.
//
// Level one installs parts from a template and records no statement. Level two
// shows statements and a map. Without a reflection the map would open empty
// for a project built at level one, and a person moving up a level would see
// nothing of the system they already have.
//
// The rule. A root part is a part no other installed part depends on. Every
// root part names one statement, the statement the catalogue derives from that
// part. Every other installed part arrived through a dependency, so its own
// statement would repeat what a root already says.

import type { CatalogueModule } from '@/lib/catalogue/types';
import { indexModules } from '@/lib/modules/resolve';
import { outcomeFromModule, type Outcome } from './catalogue';

/** The parts no other installed part depends on. */
export function rootModules(moduleIds: string[], modules: CatalogueModule[]): string[] {
  const index = indexModules(modules);
  const installed = moduleIds.filter((moduleId) => index.has(moduleId));
  const held = new Set(installed);
  const needed = new Set<string>();
  for (const moduleId of installed) {
    for (const dependency of index.get(moduleId)?.dependsOn ?? []) {
      if (held.has(dependency)) needed.add(dependency);
    }
  }
  return installed.filter((moduleId) => needed.has(moduleId) === false);
}

/** The statements that explain one installed part set. */
export function outcomesForModules(
  moduleIds: string[],
  modules: CatalogueModule[],
): Outcome[] {
  const index = indexModules(modules);
  return rootModules(moduleIds, modules)
    .map((moduleId) => index.get(moduleId))
    .filter((part): part is CatalogueModule => part !== undefined)
    .map((part) => outcomeFromModule(part, modules));
}

/**
 * The statement selection level two opens with.
 * A project that chose statements keeps them. A project built at level one
 * carries parts alone, so the statements are read back from those parts.
 */
export function openingSelection(
  compose: { outcomeIds: string[]; moduleIds: string[] },
  modules: CatalogueModule[],
): string[] {
  if (compose.outcomeIds.length > 0) return compose.outcomeIds;
  return outcomesForModules(compose.moduleIds, modules).map((outcome) => outcome.outcomeId);
}
