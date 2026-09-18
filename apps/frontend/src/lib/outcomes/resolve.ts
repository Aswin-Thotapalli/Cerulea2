// apps/frontend/src/lib/outcomes/resolve.ts
// Resolves a set of chosen outcomes into the set of modules Cerulea installs.
// The resolution works the way a package manager works. Every chosen statement
// brings its own module and every module that one needs, to any depth.
// Every installed module carries the outcome that caused it, so the map can
// explain itself.
// Without the resolution a user must install support modules by hand, and a
// missed one fails at run time.

import type { CatalogueModule } from '@/lib/catalogue/types';
import {
  indexModules,
  recommendationGaps,
  resolveDependencyClosure,
  type ModuleIndex,
} from '@/lib/modules/resolve';
import { deriveOutcomes, type Outcome } from './catalogue';

export type InstalledModule = {
  moduleId: string;
  title: string;
  /** One sentence stating what this module contributes. */
  contribution: string;
  /** The statements that caused this module to be installed. */
  causedBy: string[];
  /** The identifiers behind those statements. A user never reads these. */
  causedByOutcomeIds: string[];
  /** True while a chosen statement names this module directly. */
  chosenDirectly: boolean;
  /** The modules that need this one. */
  requiredBy: string[];
  /** The reason the seed records for pulling this module in. */
  reason: string | null;
  /** One sentence stating what stops working after removal. */
  removalConsequence: string;
};

export type MissingPart = {
  moduleId: string;
  /** The modules that ask for the absent name. */
  askedBy: string[];
};

export type RecommendedPart = {
  moduleId: string;
  title: string;
  /** One sentence stating what the recommended module adds. */
  contribution: string;
  /** The installed modules that recommend it. */
  recommendedBy: string[];
};

export type OutcomeResolution = {
  /** The statements a user chose, in the order they were chosen. */
  outcomeIds: string[];
  /** Every module to install, dependencies before the module that needs them. */
  installOrder: string[];
  modules: InstalledModule[];
  missing: MissingPart[];
  recommendations: RecommendedPart[];
};

function statementOf(outcome: Outcome): string {
  return outcome.statement;
}

/**
 * Resolves the chosen statements into the module set Cerulea installs.
 * The order is safe to follow. The same choice always produces the same set.
 */
export function resolveOutcomeSelection(
  outcomeIds: string[],
  outcomes: Outcome[],
  modules: CatalogueModule[],
): OutcomeResolution {
  const index: ModuleIndex = indexModules(modules);
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.outcomeId, outcome]));
  const chosen = Array.from(new Set(outcomeIds)).filter((id) => outcomeById.has(id));

  const causedBy = new Map<string, Set<string>>();
  const causedByOutcome = new Map<string, Set<string>>();
  const directly = new Set<string>();
  const requiredBy = new Map<string, Set<string>>();
  const reasonById = new Map<string, string>();
  const askedByMissing = new Map<string, Set<string>>();
  const order: string[] = [];
  const placed = new Set<string>();

  for (const outcomeId of chosen) {
    const outcome = outcomeById.get(outcomeId) as Outcome;
    const closure = resolveDependencyClosure([outcome.anchorModuleId], index);

    for (const moduleId of closure.installed) {
      if (!placed.has(moduleId)) {
        placed.add(moduleId);
        order.push(moduleId);
      }
      const statements = causedBy.get(moduleId) ?? new Set<string>();
      statements.add(statementOf(outcome));
      causedBy.set(moduleId, statements);

      const ids = causedByOutcome.get(moduleId) ?? new Set<string>();
      ids.add(outcomeId);
      causedByOutcome.set(moduleId, ids);

      for (const asker of closure.requiredBy[moduleId] ?? []) {
        const askers = requiredBy.get(moduleId) ?? new Set<string>();
        askers.add(index.get(asker)?.title ?? asker);
        requiredBy.set(moduleId, askers);
      }
      const reason = closure.reasonById[moduleId];
      if (reason && !reasonById.has(moduleId)) reasonById.set(moduleId, reason);
    }

    directly.add(outcome.anchorModuleId);

    for (const absent of closure.missing) {
      const askers = askedByMissing.get(absent) ?? new Set<string>();
      for (const asker of closure.requiredBy[absent] ?? []) {
        askers.add(index.get(asker)?.title ?? asker);
      }
      askedByMissing.set(absent, askers);
    }
  }

  const installed: InstalledModule[] = order.map((moduleId) => {
    const part = index.get(moduleId) as CatalogueModule;
    return {
      moduleId,
      title: part.title,
      contribution: part.blurb ?? part.longDescription?.[0] ?? part.title,
      causedBy: Array.from(causedBy.get(moduleId) ?? []).sort(),
      causedByOutcomeIds: Array.from(causedByOutcome.get(moduleId) ?? []).sort(),
      chosenDirectly: directly.has(moduleId),
      requiredBy: Array.from(requiredBy.get(moduleId) ?? []).sort(),
      reason: reasonById.get(moduleId) ?? null,
      removalConsequence: removalSentence(moduleId, order, index),
    };
  });

  const recommendations: RecommendedPart[] = recommendationGaps(order, index).map((gap) => {
    const part = index.get(gap.moduleId) as CatalogueModule;
    return {
      moduleId: gap.moduleId,
      title: part.title,
      contribution: part.blurb ?? part.longDescription?.[0] ?? part.title,
      recommendedBy: gap.recommendedBy.map((asker) => index.get(asker)?.title ?? asker),
    };
  });

  return {
    outcomeIds: chosen,
    installOrder: order,
    modules: installed,
    missing: Array.from(askedByMissing.entries())
      .map(([moduleId, askers]) => ({ moduleId, askedBy: Array.from(askers).sort() }))
      .sort((left, right) => left.moduleId.localeCompare(right.moduleId)),
    recommendations,
  };
}

/** Lists the installed modules that need one module. */
export function dependantsInSet(moduleId: string, installOrder: string[], index: ModuleIndex): string[] {
  return installOrder.filter((candidate) => (index.get(candidate)?.dependsOn ?? []).includes(moduleId));
}

/** Writes the sentence a user reads beside a module before removing it. */
function removalSentence(moduleId: string, installOrder: string[], index: ModuleIndex): string {
  const title = index.get(moduleId)?.title ?? moduleId;
  const dependants = dependantsInSet(moduleId, installOrder, index).map(
    (id) => index.get(id)?.title ?? id,
  );
  if (dependants.length === 0) {
    return `Removing this stops the work ${title} does. Nothing else in this project needs it.`;
  }
  return `Removing this stops ${dependants.join(', ')}.`;
}

export type RemovalImpact = {
  moduleId: string;
  title: string;
  /** The installed modules that stop working, with the reason each needs this one. */
  dependants: Array<{ moduleId: string; title: string; reason: string | null }>;
  /** The chosen statements that stop being delivered. */
  outcomesLost: string[];
  /** True while removal takes nothing else with it. */
  safe: boolean;
  /** One sentence a user reads before the removal proceeds. */
  summary: string;
};

/**
 * Reports what a removal takes with it.
 * A user reads this before the removal proceeds, so nothing disappears quietly.
 */
export function removalImpact(
  moduleId: string,
  resolution: OutcomeResolution,
  modules: CatalogueModule[],
): RemovalImpact {
  const index = indexModules(modules);
  const part = index.get(moduleId);
  const title = part?.title ?? moduleId;
  const dependants = dependantsInSet(moduleId, resolution.installOrder, index).map((id) => ({
    moduleId: id,
    title: index.get(id)?.title ?? id,
    reason: index.get(id)?.reasonByDepId?.[moduleId] ?? null,
  }));

  const entry = resolution.modules.find((candidate) => candidate.moduleId === moduleId);
  const outcomesLost = entry?.chosenDirectly ? entry.causedBy : [];

  const summary =
    dependants.length === 0 && outcomesLost.length === 0
      ? `Removing ${title} takes nothing else with it.`
      : [
          dependants.length > 0
            ? `Removing ${title} stops ${dependants.map((item) => item.title).join(', ')}.`
            : '',
          outcomesLost.length > 0
            ? `These outcomes stop being delivered: ${outcomesLost.join('. ')}.`
            : '',
        ]
          .filter(Boolean)
          .join(' ');

  return {
    moduleId,
    title,
    dependants,
    outcomesLost,
    safe: dependants.length === 0 && outcomesLost.length === 0,
    summary,
  };
}

/** Resolves a chosen set straight from the module catalogue. */
export function resolveFromModules(outcomeIds: string[], modules: CatalogueModule[]): OutcomeResolution {
  return resolveOutcomeSelection(outcomeIds, deriveOutcomes(modules), modules);
}
