import { describe, expect, it } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import type { CatalogueModule } from '@/lib/catalogue/types';
import { deriveOutcomes } from './catalogue';
import { resolveOutcomeSelection } from './resolve';
import {
  applyRemoveOutcomes,
  detectConflicts,
  findDependencyCycles,
  hasBlockingConflict,
} from './conflicts';

const modules = SEED_MODULES;
const outcomes = deriveOutcomes(modules);
const outcomeFor = (moduleId: string) =>
  outcomes.find((outcome) => outcome.anchorModuleId === moduleId)?.outcomeId as string;

function resolve(ids: string[]) {
  return resolveOutcomeSelection(ids, outcomes, modules);
}

describe('findDependencyCycles', () => {
  it('finds no loop in the Cerulea catalogue', () => {
    const everything = modules.map((part) => part.moduleId);
    expect(findDependencyCycles(everything, modules)).toEqual([]);
  });

  it('finds a loop when two parts need each other', () => {
    const looped: CatalogueModule[] = [
      {
        moduleId: 'left',
        title: 'Left',
        projectType: 'dapp',
        category: 'data-logic',
        dependsOn: ['right'],
      },
      {
        moduleId: 'right',
        title: 'Right',
        projectType: 'dapp',
        category: 'data-logic',
        dependsOn: ['left'],
      },
    ];
    const cycles = findDependencyCycles(['left', 'right'], looped);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain('left');
    expect(cycles[0]).toContain('right');
  });
});

describe('detectConflicts on a clean project', () => {
  const resolution = resolve([outcomeFor('rbac')]);
  const conflicts = detectConflicts(resolution, { track: 'dapp', outcomes, modules });

  it('reports no blocking conflict', () => {
    expect(hasBlockingConflict(conflicts)).toBe(false);
  });

  it('still reports the recommended parts that are absent', () => {
    const advisory = conflicts.filter((conflict) => conflict.severity === 'advisory');
    expect(advisory.length).toBeGreaterThan(0);
    for (const conflict of advisory) {
      expect(conflict.detail.trim().length).toBeGreaterThan(0);
    }
  });

  it('offers a fix that adds every recommended part', () => {
    const gap = conflicts.find((conflict) => conflict.conflictId === 'recommendations');
    const fix = gap?.fixes.find((candidate) => candidate.kind === 'add-modules');
    expect(fix).toBeTruthy();
  });
});

describe('detectConflicts on an outcome from the other network', () => {
  const resolution = resolve([outcomeFor('rbac')]);
  const conflicts = detectConflicts(resolution, { track: 'blockchain', outcomes, modules });
  const offTrack = conflicts.find((conflict) => conflict.conflictId.startsWith('off-track'));

  it('stops deployment', () => {
    expect(offTrack?.severity).toBe('blocking');
    expect(hasBlockingConflict(conflicts)).toBe(true);
  });

  it('states the conflict in plain words and names no identifier', () => {
    expect(offTrack?.detail).toContain('private Blockchain network');
    expect(offTrack?.detail).not.toContain('blockchain network');
    expect(offTrack?.detail).not.toContain('rbac');
  });

  it('offers to remove the outcomes or to move the project', () => {
    const kinds = offTrack?.fixes.map((fix) => fix.kind) ?? [];
    expect(kinds).toContain('remove-outcomes');
    expect(kinds).toContain('change-track');
  });

  it('clears the conflict once the fix is applied', () => {
    const fix = offTrack?.fixes.find((candidate) => candidate.kind === 'remove-outcomes');
    const remaining = applyRemoveOutcomes([outcomeFor('rbac')], fix!);
    expect(remaining).toEqual([]);
    const after = detectConflicts(resolve(remaining), { track: 'blockchain', outcomes, modules });
    expect(after.some((conflict) => conflict.conflictId.startsWith('off-track'))).toBe(false);
  });
});

describe('detectConflicts on an absent part', () => {
  const resolution = resolve([outcomeFor('staking-dashboard-ui')]);
  const conflicts = detectConflicts(resolution, { track: 'dapp', outcomes, modules });
  const absent = conflicts.find((conflict) => conflict.conflictId.startsWith('absent:'));

  it('reports the part the catalogue does not hold', () => {
    expect(resolution.missing.map((entry) => entry.moduleId)).toContain('staking');
    expect(absent?.severity).toBe('blocking');
  });

  it('states what stops and names the part by its plain name', () => {
    expect(absent?.detail).toContain('Deployment stops here');
    expect(absent?.title).not.toContain('staking-dashboard-ui');
  });

  it('offers to remove the outcomes that ask for the absent part', () => {
    const fix = absent?.fixes.find((candidate) => candidate.kind === 'remove-outcomes');
    expect(fix).toBeTruthy();
    if (fix && fix.kind === 'remove-outcomes') {
      expect(fix.outcomeIds).toContain(outcomeFor('staking-dashboard-ui'));
    }
  });
});

describe('detectConflicts on a part from the other half of the catalogue', () => {
  const resolution = resolve([outcomeFor('lending-borrowing')]);
  const conflicts = detectConflicts(resolution, { track: 'dapp', outcomes, modules });
  const crossing = conflicts.find((conflict) => conflict.conflictId.startsWith('cross-layer'));

  it('reports the crossing without stopping deployment', () => {
    expect(crossing?.severity).toBe('advisory');
    expect(crossing?.detail).toContain('Oracle Feeds');
  });
});

describe('every conflict reads as plain language', () => {
  it('names the fix on every line', () => {
    const resolution = resolve([outcomeFor('staking-dashboard-ui'), outcomeFor('rbac')]);
    const conflicts = detectConflicts(resolution, { track: 'blockchain', outcomes, modules });
    expect(conflicts.length).toBeGreaterThan(0);
    for (const conflict of conflicts) {
      expect(conflict.fixes.length).toBeGreaterThan(0);
      for (const fix of conflict.fixes) {
        expect(fix.label.trim().length).toBeGreaterThan(0);
      }
      expect(conflict.title).not.toMatch(/[a-z]+-[a-z]+-[a-z]+/);
    }
  });
});
