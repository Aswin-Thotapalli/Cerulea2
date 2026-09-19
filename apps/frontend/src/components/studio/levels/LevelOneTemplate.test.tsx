import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LevelOneTemplate from './LevelOneTemplate';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import { composeSections } from '@/lib/blueprint/compose';
import {
  DECLARATION_IDS,
  answersComplete,
  describePlan,
  firstUnanswered,
  planFromTemplate,
} from '@/lib/studio/template-build';
import {
  DISCLOSURE_LEVELS,
  defaultLevel,
  describeMove,
  levelOpens,
  readLevel,
} from '@/lib/studio/disclosure';

const firstTemplate = SEED_TEMPLATES.find((entry) => entry.projectType === 'dapp');

const buildState = {
  version: 1,
  disclosureLevel: 1,
  foundation: {
    projectName: 'Berth register',
    summary: '',
    application: 'dapps',
    track: 'dapp',
    trackOverridden: false,
    templateId: '',
    publishSelectedRecords: false,
    blockSeconds: 3,
    historyRetentionDays: 900,
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
  },
  wizardComplete: false,
  wizardCompletedAt: '',
};

const questions = DECLARATION_IDS.map((id) => ({
  id,
  question: `We ask about ${id}`,
  explanation: `This answer settles the ${id} rule.`,
  options: [
    { value: `${id}-first`, label: `${id} first option`, meaning: `The first ${id} outcome.` },
    { value: `${id}-second`, label: `${id} second option`, meaning: `The second ${id} outcome.` },
  ],
}));

function stubFetch() {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({
      url,
      method,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    });
    const answer = (body: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/build-state')) return answer({ buildState });
    if (url.endsWith('/policies')) {
      return answer(
        method === 'POST'
          ? {
              profiles: [
                {
                  profileId: 'profile-balanced',
                  point: { routinePercent: 67, constitutionalPercent: 90 },
                  consequences: ['Everyday work settles quickly.'],
                },
              ],
            }
          : { questions, limits: { statements: [] } },
      );
    }
    if (url.includes('/blueprint')) {
      return answer(
        method === 'PUT'
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
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the four disclosure levels', () => {
  it('names four levels and opens more areas as the level rises', () => {
    expect(DISCLOSURE_LEVELS.map((entry) => entry.level)).toEqual([1, 2, 3, 4]);
    expect(levelOpens(1, 'questions')).toBe(true);
    expect(levelOpens(1, 'compose')).toBe(false);
    expect(levelOpens(2, 'compose')).toBe(true);
    expect(levelOpens(2, 'model')).toBe(false);
    expect(levelOpens(3, 'model')).toBe(true);
    expect(levelOpens(3, 'blueprint')).toBe(false);
    expect(levelOpens(4, 'blueprint')).toBe(true);
  });

  it('opens a Dapps project on the questions and an Enterprise project on the designer', () => {
    expect(defaultLevel({ application: 'dapps', templateId: 'dex' })).toBe(1);
    expect(defaultLevel({ application: 'dapps', templateId: '' })).toBe(2);
    expect(defaultLevel({ application: 'enterprise', templateId: '' })).toBe(3);
    expect(defaultLevel({ application: 'government', templateId: 'land' })).toBe(3);
  });

  it('reads any stored value back as one of the four levels', () => {
    expect(readLevel(1)).toBe(1);
    expect(readLevel(4)).toBe(4);
    expect(readLevel(9)).toBe(2);
    expect(readLevel(undefined)).toBe(2);
  });

  it('states what changes on a move between levels', () => {
    expect(describeMove(1, 3)).toContain('shows more of the same system');
    expect(describeMove(4, 2)).toContain('shows less of the same system');
    expect(describeMove(2, 2)).toContain('stay');
  });
});

describe('what level one builds', () => {
  it('resolves a template into the parts Cerulea installs', () => {
    expect(firstTemplate).toBeDefined();
    const plan = planFromTemplate(firstTemplate!.id, SEED_TEMPLATES, SEED_MODULES);
    expect(plan.moduleIds.length).toBeGreaterThan(0);
    expect(new Set(plan.moduleIds).size).toBe(plan.moduleIds.length);
  });

  it('answers with no parts when the template is absent', () => {
    expect(planFromTemplate('no-such-template', SEED_TEMPLATES, SEED_MODULES).moduleIds).toEqual(
      [],
    );
  });

  it('names the first question still waiting', () => {
    const answers = {
      projectName: '',
      summary: '',
      templateId: '',
      declarations: {} as Record<string, string>,
    };
    expect(firstUnanswered(answers)).toContain('name');
    answers.projectName = 'Berth register';
    expect(firstUnanswered(answers)).toContain('what this system does');
    answers.summary = 'We register every berth booking.';
    expect(firstUnanswered(answers)).toContain('kind of system');
    answers.templateId = firstTemplate!.id;
    expect(firstUnanswered(answers)).toContain('Answer every question');
    for (const id of DECLARATION_IDS) answers.declarations[id] = `${id}-first`;
    expect(firstUnanswered(answers)).toBeNull();
    expect(answersComplete(answers)).toBe(true);
  });

  it('states what it builds without naming one internal identifier', () => {
    const plan = planFromTemplate(firstTemplate!.id, SEED_TEMPLATES, SEED_MODULES);
    const composed = composeSections(plan.moduleIds);
    const sentence = describePlan(plan, composed.collections.length);
    expect(sentence).toContain(`${plan.moduleIds.length} parts`);
    for (const moduleId of plan.moduleIds) {
      expect(sentence).not.toContain(moduleId);
    }
  });
});

describe('disclosure level one', () => {
  it('asks plain questions and shows no structure', { timeout: 40000 }, async () => {
    stubFetch();
    render(<LevelOneTemplate projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('A few plain questions')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.queryByText('What Cerulea assembled')).toBeNull();
    expect(screen.queryByText('Records and fields')).toBeNull();
    for (const question of questions) {
      expect(screen.getByText(question.question)).toBeInTheDocument();
      expect(screen.getByText(question.explanation)).toBeInTheDocument();
    }
  });

  it('holds the build until every question carries an answer', { timeout: 40000 }, async () => {
    stubFetch();
    render(<LevelOneTemplate projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('A few plain questions')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.getByRole('button', { name: 'Build this system' })).toBeDisabled();
    expect(screen.getByText(/Write one sentence stating what this system does/)).toBeInTheDocument();
  });

  it('writes the same Blueprint every other level writes', { timeout: 60000 }, async () => {
    const calls = stubFetch();
    render(<LevelOneTemplate projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('A few plain questions')).toBeInTheDocument(), {
      timeout: 15000,
    });

    await userEvent.type(
      screen.getByLabelText('What this system does'),
      'We register every berth booking.',
    );
    await userEvent.click(screen.getByLabelText('Which kind of system is this'));
    await userEvent.click(await screen.findByRole('option', { name: firstTemplate!.title }));
    for (const question of questions) {
      await userEvent.click(screen.getByRole('radio', { name: question.options[0].label }));
    }

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Build this system' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Build this system' }));

    await waitFor(
      () =>
        expect(
          calls.some((call) => call.url.includes('/blueprint') && call.method === 'PUT'),
        ).toBe(true),
      { timeout: 20000 },
    );

    const written = calls.find(
      (call) => call.url.includes('/blueprint') && call.method === 'PUT',
    )?.body as { document: { collections: { id: string }[]; governance: { quorum: { routine: number } } } };
    const plan = planFromTemplate(firstTemplate!.id, SEED_TEMPLATES, SEED_MODULES);
    const expected = composeSections(plan.moduleIds, { retentionDays: 900 });
    expect(written.document.collections.map((entry) => entry.id).sort()).toEqual(
      expected.collections.map((entry) => entry.id).sort(),
    );
    expect(written.document.governance.quorum.routine).toBe(67);

    const state = calls.find(
      (call) => call.url.endsWith('/build-state') && call.method === 'PUT',
    )?.body as { buildState: { disclosureLevel: number; compose: { moduleIds: string[] } } };
    expect(state.buildState.disclosureLevel).toBe(1);
    expect(state.buildState.compose.moduleIds).toEqual(plan.moduleIds);
  });
});
