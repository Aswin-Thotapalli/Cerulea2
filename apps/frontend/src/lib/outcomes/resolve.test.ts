import { describe, expect, it } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import type { CatalogueModule } from '@/lib/catalogue/types';
import { indexModules } from '@/lib/modules/resolve';
import { deriveOutcomes } from './catalogue';
import { dependantsInSet, removalImpact, resolveFromModules, resolveOutcomeSelection } from './resolve';

const modules = SEED_MODULES;
const index = indexModules(modules);
const outcomes = deriveOutcomes(modules);
const outcomeFor = (moduleId: string) =>
  outcomes.find((outcome) => outcome.anchorModuleId === moduleId)?.outcomeId as string;

describe('selecting an outcome installs every required module', () => {
  it('installs the module the statement names', () => {
    const resolution = resolveFromModules([outcomeFor('rbac')], modules);
    expect(resolution.installOrder).toContain('rbac');
  });

  it('installs every module that one needs, to any depth', () => {
    for (const outcome of outcomes) {
      const resolution = resolveOutcomeSelection([outcome.outcomeId], outcomes, modules);
      const held = new Set(resolution.installOrder);
      for (const moduleId of resolution.installOrder) {
        for (const dependency of index.get(moduleId)?.dependsOn ?? []) {
          const absent = resolution.missing.some((entry) => entry.moduleId === dependency);
          expect(held.has(dependency) || absent).toBe(true);
        }
      }
    }
  });

  it('places a dependency before the module that needs it', () => {
    const resolution = resolveFromModules([outcomeFor('rbac')], modules);
    expect(resolution.installOrder.indexOf('wallet-auth')).toBeLessThan(
      resolution.installOrder.indexOf('rbac'),
    );
  });

  it('installs one module once even when two statements need it', () => {
    const resolution = resolveFromModules([outcomeFor('rbac'), outcomeFor('kyc')], modules);
    const counts = new Map<string, number>();
    for (const moduleId of resolution.installOrder) {
      counts.set(moduleId, (counts.get(moduleId) ?? 0) + 1);
    }
    for (const count of counts.values()) expect(count).toBe(1);
  });

  it('produces the same set on a second run', () => {
    const first = resolveFromModules([outcomeFor('rbac'), outcomeFor('kyc')], modules);
    const second = resolveFromModules([outcomeFor('rbac'), outcomeFor('kyc')], modules);
    expect(first).toEqual(second);
  });

  it('installs nothing for an empty choice', () => {
    const resolution = resolveFromModules([], modules);
    expect(resolution.installOrder).toEqual([]);
    expect(resolution.modules).toEqual([]);
  });

  it('ignores a statement the catalogue does not hold', () => {
    const resolution = resolveFromModules(['outcome:no-such-thing'], modules);
    expect(resolution.outcomeIds).toEqual([]);
  });
});

describe('every installed module explains itself', () => {
  const resolution = resolveFromModules([outcomeFor('rbac'), outcomeFor('kyc')], modules);

  it('names the outcome that caused it', () => {
    for (const installed of resolution.modules) {
      expect(installed.causedBy.length).toBeGreaterThan(0);
      for (const statement of installed.causedBy) {
        expect(statement.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('marks the modules a statement named directly', () => {
    const direct = resolution.modules.filter((installed) => installed.chosenDirectly);
    expect(direct.map((installed) => installed.moduleId).sort()).toEqual(['kyc', 'rbac']);
  });

  it('names what asked for a module that no statement named', () => {
    const pulled = resolution.modules.find((installed) => installed.moduleId === 'wallet-auth');
    expect(pulled?.chosenDirectly).toBe(false);
    expect(pulled?.requiredBy.length).toBeGreaterThan(0);
    expect(pulled?.reason).toBe(
      'RBAC needs a verified identity to attach roles and evaluate permissions.',
    );
  });

  it('states what stops working after removal', () => {
    for (const installed of resolution.modules) {
      expect(installed.removalConsequence.startsWith('Removing this stops')).toBe(true);
    }
  });

  it('gives every module a plain sentence on what it contributes', () => {
    for (const installed of resolution.modules) {
      expect(installed.contribution.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('removing a module with dependants lists them first', () => {
  const resolution = resolveFromModules([outcomeFor('rbac')], modules);

  it('lists every installed module that stops working', () => {
    const impact = removalImpact('wallet-auth', resolution, modules);
    expect(impact.safe).toBe(false);
    expect(impact.dependants.map((entry) => entry.moduleId)).toContain('rbac');
    expect(impact.summary).toContain('Removing Wallet Authentication stops');
  });

  it('carries the reason each dependant needs the module', () => {
    const impact = removalImpact('wallet-auth', resolution, modules);
    const rbac = impact.dependants.find((entry) => entry.moduleId === 'rbac');
    expect(rbac?.reason).toBe(
      'RBAC needs a verified identity to attach roles and evaluate permissions.',
    );
  });

  it('names the outcomes that stop being delivered', () => {
    const impact = removalImpact('rbac', resolution, modules);
    expect(impact.outcomesLost.length).toBeGreaterThan(0);
    expect(impact.summary).toContain('stop being delivered');
  });

  it('reports a clean removal as clean', () => {
    const solo = resolveFromModules([outcomeFor('wallet-auth')], modules);
    const nothingDepends = solo.installOrder.filter(
      (moduleId) => dependantsInSet(moduleId, solo.installOrder, index).length === 0,
    );
    const target = nothingDepends.find(
      (moduleId) => !solo.modules.find((entry) => entry.moduleId === moduleId)?.chosenDirectly,
    );
    if (target) {
      expect(removalImpact(target, solo, modules).safe).toBe(true);
    }
  });
});

describe('the recommendation gaps', () => {
  it('reports a recommended module the project does not hold', () => {
    const resolution = resolveFromModules([outcomeFor('wallet-auth')], modules);
    expect(resolution.recommendations.length).toBeGreaterThan(0);
    for (const gap of resolution.recommendations) {
      expect(resolution.installOrder).not.toContain(gap.moduleId);
      expect(gap.recommendedBy.length).toBeGreaterThan(0);
      expect(gap.contribution.trim().length).toBeGreaterThan(0);
    }
  });

  it('reports no gap for a module the project already holds', () => {
    const resolution = resolveFromModules(
      [outcomeFor('wallet-auth'), outcomeFor('rbac')],
      modules,
    );
    expect(resolution.recommendations.map((gap) => gap.moduleId)).not.toContain('rbac');
  });
});

describe('the absent parts', () => {
  it('reports a dependency name the catalogue does not hold', () => {
    const invented = [
      ...modules,
      {
        moduleId: 'shipment-trace',
        title: 'Shipment trace',
        projectType: 'blockchain',
        category: 'Supply Chain',
        blurb: 'Record every handling step of a shipment.',
        dependsOn: ['no-such-part'],
        reasonByDepId: { 'no-such-part': 'Shipment trace reads the handling ledger.' },
      } as CatalogueModule,
    ];
    const derived = deriveOutcomes(invented);
    const target = derived.find((outcome) => outcome.anchorModuleId === 'shipment-trace') as {
      outcomeId: string;
    };
    const resolution = resolveOutcomeSelection([target.outcomeId], derived, invented);
    expect(resolution.missing).toEqual([
      { moduleId: 'no-such-part', askedBy: ['Shipment trace'] },
    ]);
    expect(resolution.installOrder).toContain('shipment-trace');
  });
});
