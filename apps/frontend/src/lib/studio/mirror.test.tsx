import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import {
  PLATFORM_MIRRORS,
  controlsWithoutMirror,
  mirrorFor,
  mirrorForModule,
  mirrorText,
} from './mirror';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { putRole, setCapabilities } from '@/lib/blueprint/edit';
import { planFromTemplate } from '@/lib/studio/template-build';
import { scopeForCollection } from '@/lib/blueprint/formula';

import Step1Foundation from '@/components/studio/steps6/Step1Foundation';
import Step4Policies from '@/components/studio/steps6/Step4Policies';
import LevelOneTemplate from '@/components/studio/levels/LevelOneTemplate';
import LevelFourBlueprint from '@/components/studio/levels/LevelFourBlueprint';
import EntityEditor from '@/components/studio/steps6/model/EntityEditor';
import PermissionMatrix from '@/components/studio/steps6/model/PermissionMatrix';
import LogicEditor from '@/components/studio/steps6/model/LogicEditor';
import WorkflowEditor from '@/components/studio/steps6/model/WorkflowEditor';
import FormulaBar from '@/components/studio/steps6/model/FormulaBar';
import ExecutionSubstrate from '@/components/studio/ExecutionSubstrate';

const plan = planFromTemplate(
  SEED_TEMPLATES.find((entry) => entry.projectType === 'dapp')!.id,
  SEED_TEMPLATES,
  SEED_MODULES,
);

function startingBlueprint() {
  const composed = composeSections(plan.moduleIds.slice(0, 4), { retentionDays: 900 });
  const base = applyComposition(readBlueprintDocument({}, 'Berth register'), composed, []);
  const withRole = putRole(base, { id: 'clerk', name: 'Clerk', credentials: [] });
  return setCapabilities(withRole, {
    roleId: 'clerk',
    collectionId: withRole.collections[0]?.id ?? 'booking',
    capabilities: ['Read'],
  });
}

const blueprint = startingBlueprint();

const buildState = {
  version: 1,
  disclosureLevel: 3,
  foundation: {
    projectName: 'Berth register',
    summary: 'We register every berth booking.',
    application: 'enterprise',
    track: 'dapp',
    trackOverridden: false,
    templateId: '',
    publishSelectedRecords: false,
    blockSeconds: 3,
    historyRetentionDays: 900,
  },
  compose: { outcomeIds: [], moduleIds: plan.moduleIds, removedModuleIds: [], chosenLinks: [] },
  policies: { answers: {}, chosenProfileId: '' },
  execution: { substrate: 'Native', reason: '' },
  steps: {
    foundation: true,
    compose: true,
    model: true,
    policies: false,
    interfaceAuthoring: false,
    verify: false,
  },
  wizardComplete: false,
  wizardCompletedAt: '',
};

const questions = [
  {
    id: 'confirmation',
    question: 'Which matters more, instant confirmation or the greatest certainty',
    explanation: 'A record confirms sooner when fewer validators must agree.',
    options: [
      {
        value: 'InstantConfirmation',
        label: 'Instant confirmation',
        meaning: 'Work confirms in a few seconds.',
      },
      {
        value: 'MaximumCertainty',
        label: 'The greatest certainty',
        meaning: 'Work waits longer and reverses less often.',
      },
    ],
  },
];

function stubFetch() {
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const answer = (body: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/build-state')) return answer({ buildState });
    if (url.endsWith('/workspaces')) {
      return answer({
        workspaces: [{ workspaceId: 'w-1', name: 'Harbour office', application: 'enterprise' }],
      });
    }
    if (url.endsWith('/execution-substrates') || url.includes('/substrates')) {
      return answer({ substrates: [] });
    }
    if (url.endsWith('/policies')) {
      return answer(
        method === 'POST'
          ? { profiles: [] }
          : { questions, limits: { statements: ['Safety holds while enough validators stand.'] } },
      );
    }
    if (url.includes('/blueprint')) {
      return answer(
        method === 'PUT'
          ? { blueprint: { version: 2 }, created: true }
          : { version: 1, document: blueprint },
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

describe('the mirror catalogue', () => {
  it('reads the mirror of a module out of the catalogue', () => {
    const part = SEED_MODULES[0];
    const held = mirrorForModule(part.moduleId);
    expect(held?.does.length).toBeGreaterThan(10);
    expect(held?.breaks.length).toBeGreaterThan(10);
    expect(held?.does.endsWith('.')).toBe(true);
    expect(held?.breaks.endsWith('.')).toBe(true);
  });

  it('carries a mirror for every one of the 225 modules', () => {
    expect(SEED_MODULES.length).toBeGreaterThanOrEqual(225);
    for (const part of SEED_MODULES) {
      const held = mirrorForModule(part.moduleId);
      expect(held, part.moduleId).toBeDefined();
      expect(held!.does.trim().length, part.moduleId).toBeGreaterThan(0);
      expect(held!.breaks.trim().length, part.moduleId).toBeGreaterThan(0);
    }
  });

  it('states what every platform control does and what breaks without it', () => {
    for (const [controlId, held] of Object.entries(PLATFORM_MIRRORS)) {
      expect(held.does.trim().length, controlId).toBeGreaterThan(10);
      expect(held.breaks.trim().length, controlId).toBeGreaterThan(10);
      expect(held.does.endsWith('.'), controlId).toBe(true);
      expect(held.breaks.endsWith('.'), controlId).toBe(true);
      expect(held.does.includes('_'), controlId).toBe(false);
    }
  });

  it('answers for a control it holds no entry for', () => {
    const held = mirrorFor('no-such-control');
    expect(held.does.length).toBeGreaterThan(0);
    expect(held.breaks.length).toBeGreaterThan(0);
    expect(mirrorText('no-such-control')).toContain(held.breaks);
  });
});

describe('every control carries its mirror', () => {
  it('the record editor', () => {
    const { container } = render(<EntityEditor blueprint={blueprint} onChange={() => undefined} />);
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the permission matrix', () => {
    const { container } = render(
      <PermissionMatrix blueprint={blueprint} onChange={() => undefined} />,
    );
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the rules and actions editor', () => {
    const { container } = render(<LogicEditor blueprint={blueprint} onChange={() => undefined} />);
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the workflow canvas', () => {
    const { container } = render(
      <WorkflowEditor blueprint={blueprint} onChange={() => undefined} />,
    );
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the formula bar', () => {
    const { container } = render(
      <FormulaBar
        label="The formula behind this rule"
        plain="Cerulea checks this formula while you type."
        scope={scopeForCollection(blueprint, blueprint.collections[0]?.id ?? '')}
        value="1 > 0"
        onChange={() => undefined}
      />,
    );
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the foundation screen', { timeout: 40000 }, async () => {
    stubFetch();
    const { container } = render(<Step1Foundation projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('Foundation')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the policies screen', { timeout: 40000 }, async () => {
    stubFetch();
    const { container } = render(<Step4Policies projectId="p-1" />);
    await waitFor(() => expect(screen.getByText(questions[0].question)).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the questions screen at level one', { timeout: 40000 }, async () => {
    stubFetch();
    const { container } = render(<LevelOneTemplate projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('A few plain questions')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the Blueprint screen at level four', { timeout: 40000 }, async () => {
    stubFetch();
    const { container } = render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('The Blueprint')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('the substrate screen', { timeout: 40000 }, async () => {
    stubFetch();
    const { container } = render(<ExecutionSubstrate projectId="p-1" />);
    await waitFor(() => expect(container.querySelectorAll('input').length >= 0).toBe(true));
    expect(controlsWithoutMirror(container)).toEqual([]);
  });
});
