import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import LevelTwoOutcomes from './LevelTwoOutcomes';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import { outcomesForModules, openingSelection, rootModules } from '@/lib/outcomes/reflect';
import { planFromTemplate } from '@/lib/studio/template-build';
import type { BuildState } from '@/lib/studio/project-state';

const template = SEED_TEMPLATES.find((entry) => entry.projectType === 'dapp');
const plan = planFromTemplate(template!.id, SEED_TEMPLATES, SEED_MODULES);

function buildState(compose: Partial<BuildState['compose']> = {}): BuildState {
  return {
    version: 1,
    disclosureLevel: 2,
    foundation: {
      projectName: 'Berth register',
      summary: '',
      application: 'dapps',
      track: 'dapp',
      trackOverridden: false,
      templateId: template!.id,
      publishSelectedRecords: false,
      blockSeconds: 3,
      historyRetentionDays: 900,
    },
    compose: {
      outcomeIds: [],
      moduleIds: [],
      removedModuleIds: [],
      chosenLinks: [],
      ...compose,
    },
    policies: { answers: {}, chosenProfileId: '' },
    execution: { substrate: 'Native', reason: '' },
    steps: {
      foundation: true,
      compose: false,
      model: false,
      policies: false,
      interfaceAuthoring: false,
      verify: false,
    },
    wizardComplete: false,
    wizardCompletedAt: '',
  };
}

function stubFetch(held: BuildState) {
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const answer = (body: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/build-state')) return answer({ buildState: held });
    if (url.includes('/blueprint')) {
      return answer(
        init?.method === 'PUT'
          ? { blueprint: { version: 2 }, created: true }
          : { version: 1, document: { name: 'Berth register' } },
      );
    }
    return answer({
      project: {
        projectId: 'p-1',
        name: 'Berth register',
        summary: '',
        state: 'draft',
        headVersion: 1,
      },
    });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading a part set back as statements', () => {
  it('names only the parts no other installed part depends on', () => {
    const roots = rootModules(plan.moduleIds, SEED_MODULES);
    expect(roots.length).toBeGreaterThan(0);
    expect(roots.length).toBeLessThanOrEqual(plan.moduleIds.length);
    const held = new Set(plan.moduleIds);
    for (const root of roots) {
      const dependants = SEED_MODULES.filter(
        (part) => held.has(part.moduleId) && (part.dependsOn ?? []).includes(root),
      );
      expect(dependants).toEqual([]);
    }
  });

  it('drops a name the catalogue does not hold', () => {
    expect(rootModules(['no-such-part'], SEED_MODULES)).toEqual([]);
  });

  it('gives every root part one plain statement', () => {
    const outcomes = outcomesForModules(plan.moduleIds, SEED_MODULES);
    expect(outcomes.length).toBe(rootModules(plan.moduleIds, SEED_MODULES).length);
    for (const outcome of outcomes) {
      expect(outcome.statement.length).toBeGreaterThan(0);
      expect(outcome.statement.endsWith('.')).toBe(false);
    }
  });

  it('keeps the statements a person chose and reads back only where none were chosen', () => {
    expect(
      openingSelection({ outcomeIds: ['outcome:a'], moduleIds: plan.moduleIds }, SEED_MODULES),
    ).toEqual(['outcome:a']);
    const read = openingSelection(
      { outcomeIds: [], moduleIds: plan.moduleIds },
      SEED_MODULES,
    );
    expect(read.length).toBeGreaterThan(0);
    expect(read.every((entry) => entry.startsWith('outcome:'))).toBe(true);
  });
});

describe('disclosure level two', () => {
  it(
    'explains a system built at level one with statements and the map',
    { timeout: 60000 },
    async () => {
      const held = buildState({ moduleIds: plan.moduleIds });
      stubFetch(held);
      render(<LevelTwoOutcomes projectId="p-1" buildState={held} />);
      await waitFor(
        () =>
          expect(screen.getByText('What this system already delivers')).toBeInTheDocument(),
        { timeout: 15000 },
      );
      const statements = outcomesForModules(plan.moduleIds, SEED_MODULES);
      expect(screen.getAllByText(statements[0].statement).length).toBeGreaterThan(0);
      await waitFor(
        () => expect(screen.getByText('What Cerulea assembled')).toBeInTheDocument(),
        { timeout: 20000 },
      );
    },
  );

  it('names the fix on an empty project', { timeout: 60000 }, async () => {
    const held = buildState();
    stubFetch(held);
    render(<LevelTwoOutcomes projectId="p-1" buildState={held} />);
    await waitFor(() => expect(screen.getByText('Nothing is installed yet')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.getByText(/Pick a statement below/)).toBeInTheDocument();
  });
});
