import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Step4Policies, {
  answersFromBuildState,
  buildStateAnswers,
  describeFinality,
  toDeclarations,
} from './Step4Policies';

const questions = [
  {
    id: 'confirmation',
    question: 'Which matters more, instant confirmation or the greatest certainty',
    explanation: 'A record confirms sooner when fewer validators must agree.',
    options: [
      {
        value: 'InstantConfirmation',
        label: 'Instant confirmation',
        meaning: 'A person sees the work land at once.',
      },
      {
        value: 'MaximumCertainty',
        label: 'The greatest certainty',
        meaning: 'A record waits for wide agreement.',
      },
    ],
  },
];

const limits = {
  faultMultiple: 3,
  minValidatorSet: 4,
  maxValidatorSet: 1000,
  minThresholdPercent: 51,
  maxThresholdPercent: 99,
  assumedMessageDelayMilliseconds: 2000,
  statements: [
    'Safety holds while the total participant count exceeds three times the faulty count.',
  ],
};

const profiles = [
  {
    profileId: 'set10_routine51_constitutional90_halt',
    point: {
      validatorCount: 10,
      toleratedFailures: 3,
      routinePercent: 51,
      constitutionalPercent: 90,
      partitionChoice: 'HaltToStayConsistent' as const,
    },
    routineFinalityBlocks: 1,
    constitutionalFinalityBlocks: 3,
    retentionBlocks: 0,
    consequences: [
      'The network runs on a moderate set. Trust spreads across several operators.',
      'A routine record confirms at a simple majority of weight.',
    ],
  },
];

const buildState = {
  version: 1,
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
  policies: {
    answers: {
      confirmationPreference: 'instant',
      organisationCount: 10,
      wrongRecordCost: 'high',
      serveDuringSplit: false,
      provableYears: 100,
    },
    chosenProfileId: '',
  },
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

function stubFetch() {
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
    if (url.endsWith('/policies')) {
      return answer(init?.method === 'POST' ? { profiles } : { questions, limits });
    }
    if (url.endsWith('/build-state')) return answer({ buildState });
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
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the declarations', () => {
  it('reads nothing until all five questions carry an answer', () => {
    expect(toDeclarations({ confirmation: 'InstantConfirmation' })).toBeNull();
    expect(
      toDeclarations({
        confirmation: 'InstantConfirmation',
        operators: 'SeveralOrganisations',
        errorCost: 'Expensive',
        split: 'KeepServing',
        retention: 'Permanent',
      }),
    ).not.toBeNull();
  });

  it('carries the answers through the build state and back', () => {
    const held = answersFromBuildState(buildState.policies as never);
    expect(held.confirmation).toBe('InstantConfirmation');
    expect(held.operators).toBe('SeveralOrganisations');
    expect(held.errorCost).toBe('Expensive');
    expect(held.split).toBe('HaltToStayConsistent');
    expect(held.retention).toBe('Permanent');
    const back = buildStateAnswers(held);
    expect(back.confirmationPreference).toBe('instant');
    expect(back.serveDuringSplit).toBe(false);
  });

  it('states the finality of a profile in seconds', () => {
    expect(describeFinality(profiles[0], 3)).toMatch(/about 3 seconds/);
    expect(describeFinality(profiles[0], 3)).toMatch(/about 9 seconds/);
  });
});

describe('Step 4 Policies', () => {
  it('asks in ordinary language and states what each answer means', async () => {
    stubFetch();
    render(<Step4Policies projectId="p-1" />);
    await waitFor(() =>
      expect(
        screen.getByText(
          'Which matters more, instant confirmation or the greatest certainty',
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('A person sees the work land at once.')).toBeInTheDocument();
  });

  it('states the limits no answer changes', async () => {
    stubFetch();
    render(<Step4Policies projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText('What no answer changes')).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/exceeds three times the faulty count/),
    ).toBeInTheDocument();
  });

  it('shows a profile as a consequence rather than as a setting', async () => {
    stubFetch();
    render(<Step4Policies projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('10 validators')).toBeInTheDocument());
    expect(screen.getByText('tolerates 3 failing at once')).toBeInTheDocument();
    expect(
      screen.getByText('A routine record confirms at a simple majority of weight.'),
    ).toBeInTheDocument();
  });

  it('writes the chosen thresholds into the Blueprint', async () => {
    const calls = stubFetch();
    render(<Step4Policies projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('10 validators')).toBeInTheDocument());
    await userEvent.click(screen.getByText('10 validators'));
    await userEvent.click(screen.getByRole('button', { name: 'Save the profile' }));
    await waitFor(() =>
      expect(
        calls.some((call) => call.url.includes('/blueprint') && call.init?.method === 'PUT'),
      ).toBe(true),
    );
    const saved = calls.find(
      (call) => call.url.includes('/blueprint') && call.init?.method === 'PUT',
    );
    const body = JSON.parse(String(saved?.init?.body));
    expect(body.document.governance.quorum.routine).toBe(51);
    expect(body.document.governance.quorum.constitutional).toBe(90);
  });
});
