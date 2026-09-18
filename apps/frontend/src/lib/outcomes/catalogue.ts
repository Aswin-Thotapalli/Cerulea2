// apps/frontend/src/lib/outcomes/catalogue.ts
// The outcome catalogue, derived from the module catalogue.
//
// The module seed carries no outcome field. Cerulea derives one outcome per
// module from the fields the seed does carry, by this rule.
//
// 1. The statement is the first clause of the module blurb. A clause ends at
//    the first semicolon, full stop or comma that follows at least four words.
// 2. The statement starts with a capital letter and carries no trailing stop.
// 3. The anchor module of the outcome is the module the statement came from.
// 4. The supporting sentence is the first paragraph of the long description.
// 5. The group is the module category, written in plain words.
// 6. The removal statement lists the modules that stop working after removal,
//    taken from the reason every dependant already records for this module.
//
// A user reads statements. Cerulea installs modules.

import type { CatalogueModule } from '@/lib/catalogue/types';

export type Outcome = {
  /** The outcome identifier. A user never sees this value. */
  outcomeId: string;
  /** The plain sentence a user selects. */
  statement: string;
  /** The module the statement came from. */
  anchorModuleId: string;
  /** The plain words for the area this outcome belongs to. */
  group: string;
  /** The track the anchor module serves. */
  projectType: CatalogueModule['projectType'];
  /** One paragraph stating what the outcome contributes. */
  contribution: string;
  /** The words the seed attaches to this outcome. */
  tags: string[];
  /** One sentence stating what stops working after removal. */
  removalConsequence: string;
};

const CLAUSE_STOPS = [';', '.', ','];

/** Cuts the first clause out of a blurb. */
export function firstClause(blurb: string): string {
  const text = blurb.trim();
  if (!text) return '';
  let cut = text.length;
  for (const stop of CLAUSE_STOPS) {
    let from = 0;
    for (;;) {
      const at = text.indexOf(stop, from);
      if (at < 0) break;
      const words = text.slice(0, at).trim().split(/\s+/).length;
      if (words >= 4) {
        cut = Math.min(cut, at);
        break;
      }
      from = at + 1;
    }
  }
  return text.slice(0, cut).trim();
}

/** Writes a category identifier in plain words. */
export function groupLabel(category: string): string {
  return category
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length <= 3 && word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

function capitalise(text: string): string {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * States what stops working after a module is removed.
 * Every dependant records a reason for depending on this module. Those reasons
 * are the sentence. A module with no dependant states its own contribution.
 */
export function removalConsequence(module: CatalogueModule, modules: CatalogueModule[]): string {
  const dependants = modules.filter((candidate) => (candidate.dependsOn ?? []).includes(module.moduleId));
  if (dependants.length === 0) {
    return `Removing this stops the work it does: ${lowerFirst(firstClause(module.blurb ?? module.title))}.`;
  }
  const named = dependants.slice(0, 3);
  const reasons = named
    .map((dependant) => {
      const reason = dependant.reasonByDepId?.[module.moduleId];
      return reason ? `${dependant.title} stops working. ${reason}` : `${dependant.title} stops working.`;
    })
    .join(' ');
  const rest = dependants.length - named.length;
  return rest > 0 ? `${reasons} ${rest} more part depends on it too.` : reasons;
}

function lowerFirst(text: string): string {
  if (!text) return text;
  return text[0].toLowerCase() + text.slice(1);
}

/** Derives one outcome from one module. */
export function outcomeFromModule(module: CatalogueModule, modules: CatalogueModule[]): Outcome {
  const clause = firstClause(module.blurb ?? '') || module.title;
  return {
    outcomeId: `outcome:${module.moduleId}`,
    statement: capitalise(clause.replace(/[.\s]+$/, '')),
    anchorModuleId: module.moduleId,
    group: groupLabel(module.category),
    projectType: module.projectType,
    contribution: module.longDescription?.[0] ?? module.blurb ?? module.title,
    tags: module.tags ?? [],
    removalConsequence: removalConsequence(module, modules),
  };
}

/** Derives the whole outcome catalogue from the module catalogue. */
export function deriveOutcomes(modules: CatalogueModule[]): Outcome[] {
  return modules.map((module) => outcomeFromModule(module, modules));
}

/** Groups outcomes by their plain-words area, ordered by name. */
export function groupOutcomes(outcomes: Outcome[]): Array<{ group: string; outcomes: Outcome[] }> {
  const byGroup = new Map<string, Outcome[]>();
  for (const outcome of outcomes) {
    const list = byGroup.get(outcome.group);
    if (list) list.push(outcome);
    else byGroup.set(outcome.group, [outcome]);
  }
  return Array.from(byGroup.entries())
    .map(([group, list]) => ({ group, outcomes: list }))
    .sort((left, right) => left.group.localeCompare(right.group));
}
