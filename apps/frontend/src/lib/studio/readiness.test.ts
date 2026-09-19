import { describe, expect, it } from 'vitest';

import { STEP_ITEMS, buildReadiness } from './readiness';
import type { BuildState } from './project-state';
import type { CompilerReport } from '@/lib/cerulea-api';

function buildState(overrides: Partial<BuildState['steps']> = {}): BuildState {
  return {
    version: 1,
    disclosureLevel: 2,
    foundation: {
      projectName: 'Berth register',
      summary: '',
      application: 'enterprise',
      track: 'blockchain',
      trackOverridden: false,
      templateId: '',
      publishSelectedRecords: false,
      blockSeconds: 3,
      historyRetentionDays: 3650,
    },
    compose: { outcomeIds: [], moduleIds: [], removedModuleIds: [], chosenLinks: [] },
    policies: { answers: {}, chosenProfileId: '' },
    execution: { substrate: 'Native', reason: '' },
    steps: {
      foundation: true,
      compose: true,
      model: true,
      policies: true,
      interfaceAuthoring: true,
      verify: true,
      ...overrides,
    },
    wizardComplete: false,
    wizardCompletedAt: '',
  };
}

const cleanReport: CompilerReport = {
  blueprintHash: 'a'.repeat(64),
  ok: true,
  reachedStage: 'report',
  errorCount: 0,
  warningCount: 0,
  headline: 'The Blueprint passes every check.',
  sections: [],
};

const holdingReport: CompilerReport = {
  blueprintHash: 'b'.repeat(64),
  ok: false,
  reachedStage: 'validate',
  errorCount: 1,
  warningCount: 1,
  headline: 'One correction remains.',
  sections: [
    {
      section: 'permissions',
      heading: 'Permissions',
      errors: 1,
      warnings: 1,
      entries: [
        {
          code: 'permissions.role_absent',
          severity: 'error',
          message: 'A permission entry names a role the model does not hold.',
          fix: 'Add the role on the Permissions surface.',
          section: 'permissions',
          path: 'permissions.0.role',
          screen: 'Step 3 Model',
        },
        {
          code: 'collections.index_absent',
          severity: 'warning',
          message: 'A collection carries no index.',
          fix: 'Add an index on the field the reads filter by.',
          section: 'collections',
          path: 'collections.0',
          screen: 'Step 3 Model',
        },
      ],
    },
  ],
};

describe('the readiness checklist', () => {
  it('names a screen and a fix on every step line', () => {
    for (const entry of STEP_ITEMS) {
      expect(entry.screen.length).toBeGreaterThan(5);
      expect(entry.fix.length).toBeGreaterThan(15);
    }
  });

  it('lists a line for every step, whichever the state', () => {
    const readiness = buildReadiness({
      report: null,
      buildState: buildState(),
      simulationRun: false,
    });
    expect(readiness.items).toHaveLength(STEP_ITEMS.length);
  });

  it('counts an unfinished step as remaining', () => {
    const readiness = buildReadiness({
      report: null,
      buildState: buildState({ model: false, policies: false }),
      simulationRun: true,
    });
    expect(readiness.remaining).toBe(2);
    expect(readiness.ready).toBe(false);
    expect(readiness.headline).toBe('2 items remain before deployment.');
  });

  it('treats a compiler error as remaining and a warning as advisory', () => {
    const readiness = buildReadiness({
      report: holdingReport,
      buildState: buildState(),
      simulationRun: true,
    });
    const error = readiness.items.find((entry) => entry.id.startsWith('permissions.role_absent'));
    const warning = readiness.items.find((entry) =>
      entry.id.startsWith('collections.index_absent'),
    );
    expect(error?.state).toBe('remaining');
    expect(error?.screen).toBe('Step 3 Model');
    expect(warning?.state).toBe('advisory');
    expect(readiness.ready).toBe(false);
  });

  it('opens deployment once nothing remains', () => {
    const readiness = buildReadiness({
      report: cleanReport,
      buildState: buildState(),
      simulationRun: true,
    });
    expect(readiness.remaining).toBe(0);
    expect(readiness.ready).toBe(true);
    expect(readiness.headline).toBe('Nothing remains. This system is ready to deploy.');
  });

  it('counts a run of the simulation as the verify step', () => {
    const readiness = buildReadiness({
      report: cleanReport,
      buildState: buildState({ verify: false }),
      simulationRun: true,
    });
    expect(readiness.items.find((entry) => entry.id === 'step.verify')?.state).toBe('done');
  });

  it('states that advisory items are worth reading when nothing blocks', () => {
    const readiness = buildReadiness({
      report: {
        ...holdingReport,
        errorCount: 0,
        sections: [
          {
            ...holdingReport.sections[0],
            errors: 0,
            entries: [holdingReport.sections[0].entries[1]],
          },
        ],
      },
      buildState: buildState(),
      simulationRun: true,
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.headline).toMatch(/worth reading first/);
  });
});
