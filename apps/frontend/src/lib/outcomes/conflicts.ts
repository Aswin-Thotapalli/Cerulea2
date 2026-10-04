// apps/frontend/src/lib/outcomes/conflicts.ts
// Reports every conflict in a resolved project, in plain language.
// A conflict names what stops working and names the fix. Every fix carries the
// action that applies it, so a user repairs the project in one step.
// Without conflict detection a project reaches deployment and fails there.

import type { CatalogueModule, ProjectTrack } from '@/lib/catalogue/types';
import { indexModules } from '@/lib/modules/resolve';
import { TRACK_PHRASE } from '@/lib/track/derive';
import type { Outcome } from './catalogue';
import type { OutcomeResolution } from './resolve';

export type ConflictSeverity = 'blocking' | 'advisory';

export type ConflictFix =
  | { kind: 'remove-outcomes'; outcomeIds: string[]; label: string }
  | { kind: 'change-track'; track: ProjectTrack; label: string }
  | { kind: 'add-modules'; moduleIds: string[]; label: string }
  | { kind: 'none'; label: string };

export type Conflict = {
  conflictId: string;
  severity: ConflictSeverity;
  /** A short line naming the conflict. */
  title: string;
  /** Plain sentences stating what stops working. */
  detail: string;
  /** The ways to clear the conflict, strongest first. */
  fixes: ConflictFix[];
};

export type ConflictContext = {
  track: ProjectTrack;
  outcomes: Outcome[];
  modules: CatalogueModule[];
};

/**
 * Finds a chain of modules that need each other.
 * A chain like that never installs, so Cerulea reports it before deployment.
 */
export function findDependencyCycles(installOrder: string[], modules: CatalogueModule[]): string[][] {
  const index = indexModules(modules);
  const held = new Set(installOrder);
  const state = new Map<string, 0 | 1 | 2>();
  const cycles: string[][] = [];

  const walk = (moduleId: string, path: string[]) => {
    state.set(moduleId, 1);
    path.push(moduleId);
    for (const dependency of [...(index.get(moduleId)?.dependsOn ?? [])].sort()) {
      if (!held.has(dependency)) continue;
      if (state.get(dependency) === 1) {
        cycles.push([...path.slice(path.indexOf(dependency)), dependency]);
      } else if ((state.get(dependency) ?? 0) === 0) {
        walk(dependency, path);
      }
    }
    path.pop();
    state.set(moduleId, 2);
  };

  for (const moduleId of installOrder) {
    if ((state.get(moduleId) ?? 0) === 0) walk(moduleId, []);
  }
  return cycles;
}

function titlesOf(moduleIds: string[], modules: CatalogueModule[]): string[] {
  const index = indexModules(modules);
  return moduleIds.map((moduleId) => index.get(moduleId)?.title ?? moduleId);
}

/**
 * Reports every conflict in a resolved project.
 * A blocking conflict stops deployment. An advisory conflict is worth reading.
 */
export function detectConflicts(
  resolution: OutcomeResolution,
  context: ConflictContext,
): Conflict[] {
  const index = indexModules(context.modules);
  const outcomeById = new Map(context.outcomes.map((outcome) => [outcome.outcomeId, outcome]));
  const conflicts: Conflict[] = [];

  // A dependency name the catalogue does not hold. The module never installs.
  for (const absent of resolution.missing) {
    const askers = absent.askedBy.length > 0 ? absent.askedBy.join(', ') : 'a part of this project';
    const carriers = resolution.modules
      .filter((installed) => (index.get(installed.moduleId)?.dependsOn ?? []).includes(absent.moduleId))
      .flatMap((installed) => installed.causedByOutcomeIds);
    conflicts.push({
      conflictId: `absent:${absent.moduleId}`,
      severity: 'blocking',
      title: `${askers} asks for a part Cerulea does not hold`,
      detail:
        `${askers} needs a part that the Cerulea catalogue has yet to publish. ` +
        `Deployment stops here, because the part cannot install.`,
      fixes: [
        carriers.length > 0
          ? {
              kind: 'remove-outcomes',
              outcomeIds: Array.from(new Set(carriers)),
              label: 'Remove the outcomes that ask for the absent part',
            }
          : { kind: 'none', label: 'Wait for Cerulea to publish the part' },
      ],
    });
  }

  // A chain of modules that need each other. The chain never installs.
  for (const cycle of findDependencyCycles(resolution.installOrder, context.modules)) {
    const names = titlesOf(cycle, context.modules);
    conflicts.push({
      conflictId: `cycle:${cycle.join('>')}`,
      severity: 'blocking',
      title: 'Two parts need each other',
      detail:
        `${names.join(' needs ')}. Cerulea installs a part after the parts it needs, ` +
        'so a loop like this never finishes. Deployment stops here.',
      fixes: [{ kind: 'none', label: 'Report the loop to Cerulea support' }],
    });
  }

  // A chosen statement whose module belongs to the other network.
  const offTrack = resolution.outcomeIds
    .map((outcomeId) => outcomeById.get(outcomeId))
    .filter((outcome): outcome is Outcome => Boolean(outcome))
    .filter((outcome) => outcome.projectType !== context.track);
  if (offTrack.length > 0) {
    const otherTrack: ProjectTrack = context.track === 'blockchain' ? 'dapp' : 'blockchain';
    conflicts.push({
      conflictId: `off-track:${context.track}`,
      severity: 'blocking',
      title: 'Some outcomes belong to the other network',
      detail:
        `This project runs on the ${TRACK_PHRASE[context.track]}. ` +
        `These outcomes run on the ${TRACK_PHRASE[otherTrack]}: ` +
        `${offTrack.map((outcome) => outcome.statement).join('. ')}. ` +
        'Cerulea installs no part that the network cannot run.',
      fixes: [
        {
          kind: 'remove-outcomes',
          outcomeIds: offTrack.map((outcome) => outcome.outcomeId),
          label: 'Remove the outcomes that belong to the other network',
        },
        {
          kind: 'change-track',
          track: otherTrack,
          label: `Move this project to the ${TRACK_PHRASE[otherTrack]}`,
        },
      ],
    });
  }

  // An installed part that sits in the other half of the catalogue.
  const crossLayer = resolution.modules.filter((installed) => {
    const part = index.get(installed.moduleId);
    return Boolean(part) && part?.projectType !== context.track;
  });
  if (crossLayer.length > 0) {
    conflicts.push({
      conflictId: `cross-layer:${context.track}`,
      severity: 'advisory',
      title: 'Some parts come from the other half of the catalogue',
      detail:
        `${crossLayer.map((installed) => installed.title).join(', ')} sit in the other half of the ` +
        'Cerulea catalogue. They install and they work. Read what each one contributes before we deploy.',
      fixes: [{ kind: 'none', label: 'Read what each part contributes' }],
    });
  }

  // A recommended part the project does not hold.
  if (resolution.recommendations.length > 0) {
    conflicts.push({
      conflictId: 'recommendations',
      severity: 'advisory',
      title: `${resolution.recommendations.length} recommended parts are absent`,
      detail: resolution.recommendations
        .map((gap) => `${gap.recommendedBy.join(', ')} recommends ${gap.title}. ${gap.contribution}`)
        .join(' '),
      fixes: [
        {
          kind: 'add-modules',
          moduleIds: resolution.recommendations.map((gap) => gap.moduleId),
          label: 'Add every recommended part',
        },
      ],
    });
  }

  return conflicts;
}

/** Reports whether any conflict stops deployment. */
export function hasBlockingConflict(conflicts: Conflict[]): boolean {
  return conflicts.some((conflict) => conflict.severity === 'blocking');
}

/** Applies a fix that removes outcomes and returns the choice that remains. */
export function applyRemoveOutcomes(chosen: string[], fix: ConflictFix): string[] {
  if (fix.kind !== 'remove-outcomes') return chosen;
  const drop = new Set(fix.outcomeIds);
  return chosen.filter((outcomeId) => !drop.has(outcomeId));
}
