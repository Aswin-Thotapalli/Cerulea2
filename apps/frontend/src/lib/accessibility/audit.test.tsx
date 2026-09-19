import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import {
  GUIDELINE_LEVEL,
  RULE_SETS,
  auditScreen,
  describeFindings,
  headlineFor,
  keyboardOrder,
  reachable,
  unnamedControls,
} from './audit';
import { Providers } from '@/app/providers';
import LevelOneTemplate from '@/components/studio/levels/LevelOneTemplate';
import LevelFourBlueprint from '@/components/studio/levels/LevelFourBlueprint';
import LevelSwitch from '@/components/studio/levels/LevelSwitch';
import LanguageSwitch from '@/components/studio/common/LanguageSwitch';
import ApplicationChoice from '@/components/studio/variants/ApplicationChoice';
import GovernmentPosture from '@/components/studio/variants/GovernmentPosture';
import ManifestSummary from '@/components/studio/manifest/ManifestSummary';
import ManifestAtomic from '@/components/studio/manifest/ManifestAtomic';
import ManifestComparisonView from '@/components/studio/manifest/ManifestComparison';
import IntentReconciliation from '@/components/studio/manifest/IntentReconciliation';
import RecommendationGaps from '@/components/studio/manifest/RecommendationGaps';
import ManifestExport from '@/components/studio/manifest/ManifestExport';
import PublicationGate from '@/components/studio/steps6/PublicationGate';
import ValidationGuidance from '@/components/studio/steps6/ValidationGuidance';
import Step1Foundation from '@/components/studio/steps6/Step1Foundation';
import Step4Policies from '@/components/studio/steps6/Step4Policies';
import FormulaBar from '@/components/studio/steps6/model/FormulaBar';
import EntityEditor from '@/components/studio/steps6/model/EntityEditor';
import PermissionMatrix from '@/components/studio/steps6/model/PermissionMatrix';
import WorkflowEditor from '@/components/studio/steps6/model/WorkflowEditor';
import LogicEditor from '@/components/studio/steps6/model/LogicEditor';
import { EXAMPLE_MANIFEST } from '@/lib/manifest/example';
import { GOVERNMENT_TEMPLATES } from '@/lib/variants/government';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { putRole, setCapabilities } from '@/lib/blueprint/edit';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { scopeForCollection } from '@/lib/blueprint/formula';
import { planFromTemplate } from '@/lib/studio/template-build';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import type { Blueprint } from '@/lib/blueprint/types';

const plan = planFromTemplate(
  SEED_TEMPLATES.find((entry) => entry.projectType === 'dapp')!.id,
  SEED_TEMPLATES,
  SEED_MODULES,
);

function blueprintOf(): Blueprint {
  const composed = composeSections(plan.moduleIds.slice(0, 3), { retentionDays: 900 });
  const base = applyComposition(readBlueprintDocument({}, 'Berth register'), composed, []);
  const withRole = putRole(base, { id: 'clerk', name: 'Clerk', credentials: [] });
  return setCapabilities(withRole, {
    roleId: 'clerk',
    collectionId: withRole.collections[0]?.id ?? 'booking',
    capabilities: ['Read'],
  });
}

const blueprint = blueprintOf();

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
    if (url.endsWith('/workspaces')) return answer({ workspaces: [] });
    if (url.includes('/accessibility')) {
      return answer({ version: 4, passes: true, headline: 'Every screen passes.', findings: [] });
    }
    if (url.includes('/manifest')) {
      if (url.includes('view=summary')) {
        return answer({ view: 'summary', version: 4, summary: EXAMPLE_MANIFEST.summary });
      }
      if (url.includes('view=comparison')) {
        return answer({
          view: 'comparison',
          version: 4,
          comparison: {
            currentBlueprintHash: 'hash',
            additions: [],
            removals: [],
            changes: [],
            identical: true,
          },
        });
      }
      return answer({ view: 'atomic', version: 4, manifest: EXAMPLE_MANIFEST });
    }
    if (url.endsWith('/compile')) {
      return answer({
        report: {
          blueprintHash: 'hash',
          ok: true,
          reachedStage: 'manifest',
          errorCount: 0,
          warningCount: 0,
          headline: 'Nothing blocks deployment.',
          sections: [],
        },
      });
    }
    if (url.endsWith('/policies')) {
      return answer(
        method === 'POST'
          ? { profiles: [] }
          : { questions, limits: { statements: ['Safety holds while enough validators stand.'] } },
      );
    }
    if (url.includes('/blueprint/versions')) return answer({ versions: [] });
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

/** Every screen the check walks, with the text that proves it opened. */
const SCREENS: { name: string; element: () => JSX.Element; opensOn: string }[] = [
  {
    name: 'The questions at level one',
    element: () => <LevelOneTemplate projectId="p-1" />,
    opensOn: 'A few plain questions',
  },
  {
    name: 'The Blueprint at level four',
    element: () => <LevelFourBlueprint projectId="p-1" />,
    opensOn: 'The Blueprint',
  },
  {
    name: 'Step 1 Foundation',
    element: () => <Step1Foundation projectId="p-1" />,
    opensOn: 'Foundation',
  },
  {
    name: 'Step 4 Policies',
    element: () => <Step4Policies projectId="p-1" />,
    opensOn: questions[0].question,
  },
  {
    name: 'The manifest summary',
    element: () => <ManifestSummary projectId="p-1" />,
    opensOn: 'What this deployment installs',
  },
  {
    name: 'The manifest atomic view',
    element: () => <ManifestAtomic projectId="p-1" />,
    opensOn: 'Every item this deployment installs',
  },
  {
    name: 'The manifest comparison view',
    element: () => <ManifestComparisonView projectId="p-1" />,
    opensOn: 'What moved since the previous deployment',
  },
  {
    name: 'Intent reconciliation',
    element: () => (
      <IntentReconciliation projectId="p-1" statement="A buyer verifies a listing." />
    ),
    opensOn: 'The manifest against the goal we stated',
  },
  {
    name: 'The manifest export',
    element: () => <ManifestExport projectId="p-1" />,
    opensOn: 'Hand this manifest to a reviewer',
  },
  {
    name: 'The corrections list',
    element: () => <ValidationGuidance projectId="p-1" />,
    opensOn: 'Corrections to make',
  },
  {
    name: 'The publication gate',
    element: () => <PublicationGate projectId="p-1" />,
    opensOn: 'Everybody reaches this application',
  },
];

/** Every screen that needs no route behind it. */
const STATIC_SCREENS: { name: string; element: () => JSX.Element }[] = [
  { name: 'The level switch', element: () => <LevelSwitch level={2} onLevelChange={() => undefined} /> },
  { name: 'The language switch', element: () => <LanguageSwitch /> },
  { name: 'The application choice', element: () => <ApplicationChoice application="dapps" /> },
  {
    name: 'The Government posture',
    element: () => <GovernmentPosture templateId={GOVERNMENT_TEMPLATES[0].id} />,
  },
  { name: 'The recommendation gaps', element: () => <RecommendationGaps moduleIds={plan.moduleIds} /> },
  { name: 'The record editor', element: () => <EntityEditor blueprint={blueprint} onChange={() => undefined} /> },
  {
    name: 'The permission matrix',
    element: () => <PermissionMatrix blueprint={blueprint} onChange={() => undefined} />,
  },
  {
    name: 'The workflow canvas',
    element: () => <WorkflowEditor blueprint={blueprint} onChange={() => undefined} />,
  },
  {
    name: 'The rules and actions editor',
    element: () => <LogicEditor blueprint={blueprint} onChange={() => undefined} />,
  },
  {
    name: 'The formula bar',
    element: () => (
      <FormulaBar
        label="The formula behind this rule"
        plain="Cerulea checks this formula while you type."
        scope={scopeForCollection(blueprint, blueprint.collections[0]?.id ?? '')}
        value="1 > 0"
        onChange={() => undefined}
      />
    ),
  },
];

describe('the accessibility check', () => {
  it('runs against the guidelines Cerulea states', () => {
    expect(GUIDELINE_LEVEL).toContain('version 2.2 level AA');
    expect(RULE_SETS).toContain('wcag22aa');
  });

  it('states the outcome of a check in one sentence', () => {
    expect(headlineFor([], 'This screen')).toContain('meets the');
    const finding = {
      rule: 'label',
      problem: 'A field carries no label.',
      fix: 'Give the field a label.',
      places: ['input'],
      impact: 'serious',
    };
    expect(headlineFor([finding], 'This screen')).toContain('1 fault');
    expect(describeFindings([finding])).toContain('Give the field a label.');
  });

  it('finds a fault on a screen that carries one', async () => {
    const { container } = render(
      <div>
        <input type="text" />
        <div role="button" tabIndex={0} />
      </div>,
    );
    const outcome = await auditScreen(container, 'A broken screen');
    expect(outcome.passes).toBe(false);
    expect(outcome.findings.length).toBeGreaterThan(0);
    for (const finding of outcome.findings) {
      expect(finding.problem.length).toBeGreaterThan(0);
      expect(finding.fix.length).toBeGreaterThan(0);
      expect(finding.places.length).toBeGreaterThan(0);
    }
  }, 30000);
});

describe('every Studio screen meets the guidelines', () => {
  for (const screenUnderTest of STATIC_SCREENS) {
    it(`checks ${screenUnderTest.name}`, async () => {
      const { container } = render(<Providers>{screenUnderTest.element()}</Providers>);
      const outcome = await auditScreen(container, screenUnderTest.name);
      expect(outcome.passes, describeFindings(outcome.findings)).toBe(true);
    }, 60000);
  }

  for (const screenUnderTest of SCREENS) {
    it(`checks ${screenUnderTest.name}`, async () => {
      stubFetch();
      const { container } = render(<Providers>{screenUnderTest.element()}</Providers>);
      await waitFor(
        () => expect(screen.getAllByText(screenUnderTest.opensOn).length).toBeGreaterThan(0),
        { timeout: 20000 },
      );
      const outcome = await auditScreen(container, screenUnderTest.name);
      expect(outcome.passes, describeFindings(outcome.findings)).toBe(true);
    }, 90000);
  }
});

describe('a person reaches every control with the keyboard', () => {
  it('names every control it reaches', () => {
    const { container } = render(
      <div>
        <button>Save</button>
        <input aria-label="Name" />
        <a href="/held">Open</a>
        <button aria-hidden="true">Hidden</button>
        <span tabIndex={-1}>Skipped</span>
      </div>,
    );
    expect(keyboardOrder(container)).toHaveLength(3);
    expect(reachable(container.querySelector('[aria-hidden="true"]')!)).toBe(false);
  });

  it('finds a control a screen reader hears no name for', () => {
    const { container } = render(
      <div>
        <button aria-label="Save the model" />
        <button />
      </div>,
    );
    const faults = unnamedControls(container);
    expect(faults).toHaveLength(1);
    expect(faults[0].fix).toContain('aria-label');
  });

  for (const screenUnderTest of STATIC_SCREENS) {
    it(`reaches every control on ${screenUnderTest.name}`, () => {
      const { container } = render(<Providers>{screenUnderTest.element()}</Providers>);
      const order = keyboardOrder(container);
      expect(Array.isArray(order), screenUnderTest.name).toBe(true);
      expect(
        unnamedControls(container).map((fault) => fault.name),
        screenUnderTest.name,
      ).toEqual([]);
    }, 30000);
  }
});
