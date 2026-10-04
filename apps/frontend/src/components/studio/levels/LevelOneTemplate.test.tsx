// Level 1 Template: plain questions, no structure, one Blueprint written.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LevelOneTemplate from './LevelOneTemplate';
import { DAPP_TEMPLATES, firstTemplate, questions, stubFetch } from './levels.fixture';
import modulesSeed from '@/data/modules.seed.json';
import type { CatalogueModule } from '@/lib/catalogue/types';
import { composeSections } from '@/lib/blueprint/compose';
import {
  DECLARATION_IDS,
  answersComplete,
  buildStateAnswers,
  declarationsFromBuildState,
  describePlan,
  firstUnanswered,
  planFromTemplate,
} from '@/lib/studio/template-build';

const SEED_MODULES = (modulesSeed as unknown as { modules: CatalogueModule[] }).modules;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('what level one builds', () => {
  it('resolves a template of the restored catalogue into the parts Cerulea installs', () => {
    expect(firstTemplate).toBeDefined();
    const plan = planFromTemplate(firstTemplate.id, DAPP_TEMPLATES, SEED_MODULES);
    expect(plan.moduleIds.length).toBeGreaterThan(0);
    expect(new Set(plan.moduleIds).size).toBe(plan.moduleIds.length);
  });

  it('answers with no parts when the template is absent', () => {
    expect(planFromTemplate('no-such-template', DAPP_TEMPLATES, SEED_MODULES).moduleIds).toEqual([]);
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
    answers.templateId = firstTemplate.id;
    expect(firstUnanswered(answers)).toContain('Answer every question');
    for (const id of DECLARATION_IDS) answers.declarations[id] = `${id}-first`;
    expect(firstUnanswered(answers)).toBeNull();
    expect(answersComplete(answers)).toBe(true);
  });

  it('states what it builds without naming one internal identifier', () => {
    const plan = planFromTemplate(firstTemplate.id, DAPP_TEMPLATES, SEED_MODULES);
    const composed = composeSections(plan.moduleIds);
    const sentence = describePlan(plan, composed.collections.length);
    expect(sentence).toContain(`${plan.moduleIds.length} parts`);
    for (const moduleId of plan.moduleIds) expect(sentence).not.toContain(moduleId);
  });

  it('round-trips the five answers through the build state', () => {
    const declarations = {
      confirmation: 'MaximumCertainty',
      operators: 'ManyOrganisations',
      errorCost: 'Irreversible',
      split: 'HaltToStayConsistent',
      retention: 'Permanent',
    };
    const held = buildStateAnswers(declarations);
    expect(declarationsFromBuildState({ answers: held, chosenProfileId: '' })).toEqual(declarations);
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

  it('writes the Blueprint and the build state from the answers', { timeout: 60000 }, async () => {
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
    await userEvent.click(await screen.findByRole('option', { name: firstTemplate.title }));
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
          calls.some((call) => call.url.includes('/blueprint/document') && call.method === 'PUT'),
        ).toBe(true),
      { timeout: 20000 },
    );

    const written = calls.find(
      (call) => call.url.includes('/blueprint/document') && call.method === 'PUT',
    )?.body as {
      document: { name: string; collections: { id: string }[]; governance: { quorum: { routine: number } } };
      expectedVersion: number;
    };
    const plan = planFromTemplate(firstTemplate.id, DAPP_TEMPLATES, SEED_MODULES);
    const expected = composeSections(plan.moduleIds, { retentionDays: 900 });
    expect(written.document.name).toBe('Berth register');
    expect(written.document.collections.map((entry) => entry.id).sort()).toEqual(
      expected.collections.map((entry) => entry.id).sort(),
    );
    expect(written.document.governance.quorum.routine).toBe(67);
    expect(written.expectedVersion).toBe(1);

    const state = calls.find(
      (call) => call.url.includes('/build-state') && call.method === 'PUT',
    )?.body as { buildState: { disclosureLevel: number; compose: { moduleIds: string[] }; foundation: { templateId: string } } };
    expect(state.buildState.disclosureLevel).toBe(1);
    expect(state.buildState.compose.moduleIds).toEqual(plan.moduleIds);
    expect(state.buildState.foundation.templateId).toBe(firstTemplate.id);
  });
});
