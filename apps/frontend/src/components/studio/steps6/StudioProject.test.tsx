import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StudioProject, {
  PROJECT_AREAS,
  finishedCount,
  nextArea,
  sequenceFinished,
  areasForLevel,
} from './StudioProject';
import type { BuildState } from '@/lib/studio/project-state';

function buildState(overrides: Partial<BuildState['steps']> = {}, complete = false): BuildState {
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
      foundation: false,
      compose: false,
      model: false,
      policies: false,
      interfaceAuthoring: false,
      verify: false,
      ...overrides,
    },
    wizardComplete: complete,
    wizardCompletedAt: complete ? '2026-09-19T07:00:00.000Z' : '',
  };
}

function stubFetch(held: BuildState) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const answer = (body: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/build-state')) return answer({ buildState: held });
    if (url.endsWith('/policies')) {
      return answer(
        init?.method === 'POST'
          ? { profiles: [] }
          : {
              questions: [],
              limits: {
                faultMultiple: 3,
                minValidatorSet: 4,
                maxValidatorSet: 1000,
                minThresholdPercent: 51,
                maxThresholdPercent: 99,
                assumedMessageDelayMilliseconds: 2000,
                statements: ['Safety holds while the participant count exceeds three times the faulty count.'],
              },
            },
      );
    }
    if (url.endsWith('/compile')) {
      return answer({
        ok: true,
        report: {
          blueprintHash: 'a'.repeat(64),
          ok: true,
          reachedStage: 'report',
          errorCount: 0,
          warningCount: 0,
          headline: 'Clean.',
          sections: [],
        },
      });
    }
    if (url === '/api/workspaces') return answer({ workspaces: [{ workspaceId: 'w-1', name: 'Port authority', application: 'enterprise' }] });
    if (url.includes('/blueprint')) return answer({ version: 1, document: {} });
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
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the sequence', () => {
  it('counts the areas a person has finished', () => {
    expect(finishedCount(buildState().steps)).toBe(0);
    expect(finishedCount(buildState({ foundation: true, compose: true }).steps)).toBe(2);
  });

  it('opens on the first area that still needs work', () => {
    expect(nextArea(buildState().steps)).toBe('foundation');
    expect(nextArea(buildState({ foundation: true }).steps)).toBe('compose');
  });

  it('collapses once every area carries work', () => {
    expect(sequenceFinished(buildState())).toBe(false);
    expect(
      sequenceFinished(
        buildState({
          foundation: true,
          compose: true,
          model: true,
          policies: true,
          verify: true,
        }),
      ),
    ).toBe(true);
  });

  it('collapses once the person opens the project as a workspace', () => {
    expect(sequenceFinished(buildState({}, true))).toBe(true);
  });
});

describe('the wizard', () => {
  it('runs the steps in order on a new project', { timeout: 40000 }, async () => {
    stubFetch(buildState());
    render(<StudioProject projectId="p-1" />);
    await waitFor(() =>
      expect(
        screen.getByText(
          'We run these steps once. The project then opens as a workspace with direct navigation.',
        ),
      ).toBeInTheDocument(),
    );
    for (const area of areasForLevel(2)) {
      expect(screen.getAllByText(area.label).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Model')).toBeNull();
    await waitFor(() => expect(screen.getByText('Step 1 of 6')).toBeInTheDocument(), {
      timeout: 15000,
    });
  });

  it('offers the move to a workspace once every area carries work', { timeout: 40000 }, async () => {
    stubFetch(
      buildState({ foundation: true, compose: true, model: true, policies: true, verify: false }),
    );
    render(<StudioProject projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('Step 6 of 6')).toBeInTheDocument(), {
      timeout: 15000,
    });
  });
});

describe('the workspace', () => {
  it('opens with direct navigation and the checklist rather than the sequence', async () => {
    stubFetch(buildState({}, true));
    render(<StudioProject projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText('Open any area directly')).toBeInTheDocument(),
    );
    expect(screen.getByText('What remains before deployment')).toBeInTheDocument();
    expect(screen.queryByText(/We run these steps once/)).toBeNull();
    expect(screen.getByText('Where it runs')).toBeInTheDocument();
  });

  it('moves straight to any area on request', { timeout: 40000 }, async () => {
    stubFetch(buildState({}, true));
    render(<StudioProject projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('Open any area directly')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('tab', { name: 'Policies' }));
    await waitFor(() => expect(screen.getByText('Step 4 of 6')).toBeInTheDocument(), {
      timeout: 15000,
    });
  });
});

describe('the disclosure level', () => {
  it('opens the areas the level names and holds back the rest', () => {
    expect(areasForLevel(1).map((entry) => entry.id)).toEqual(['verify']);
    expect(areasForLevel(2).map((entry) => entry.id)).toEqual([
      'foundation',
      'compose',
      'policies',
      'verify',
    ]);
    expect(areasForLevel(3).map((entry) => entry.id)).toEqual([
      'foundation',
      'compose',
      'model',
      'policies',
      'verify',
    ]);
    expect(areasForLevel(4).map((entry) => entry.id)).toEqual(
      PROJECT_AREAS.map((entry) => entry.id),
    );
  });

  it('shows the designer areas once the project opens at level three', { timeout: 40000 }, async () => {
    stubFetch({ ...buildState(), disclosureLevel: 3 });
    render(<StudioProject projectId="p-1" />);
    await waitFor(() => expect(screen.getAllByText('Model').length).toBeGreaterThan(0), {
      timeout: 15000,
    });
  });

  it('asks the plain questions at level one', { timeout: 40000 }, async () => {
    stubFetch({ ...buildState(), disclosureLevel: 1 });
    render(<StudioProject projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('A few plain questions')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.queryByText('Foundation')).toBeNull();
  });
});
