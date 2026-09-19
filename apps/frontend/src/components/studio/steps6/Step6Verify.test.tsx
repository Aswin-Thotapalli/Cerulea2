import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Step6Verify from './Step6Verify';
import SimulationReport, { describeSource } from './SimulationReport';

const report = {
  projectId: 'p-1',
  version: 4,
  chainKind: 'local' as const,
  startedAt: '2026-09-19T07:00:00.000Z',
  finishedAt: '2026-09-19T07:00:02.000Z',
  elapsedSeconds: 2,
  blocksProduced: 4,
  totalSubmitted: 20,
  totalIncluded: 20,
  transactionsPerSecond: 10,
  classes: [
    {
      transactionClass: 'Routine',
      submitted: 5,
      included: 5,
      irreversible: 5,
      meanBlocksToInclusion: 1,
      meanBlocksToIrreversible: 2,
      meanSecondsToInclusion: 0.4,
      meanSecondsToIrreversible: 1.2,
      thresholdPercent: 51,
      mandatoryDelay: false,
      thresholdHeld: true,
      statement: 'Every routine transaction committed at 51 percent of weight.',
    },
    {
      transactionClass: 'Constitutional',
      submitted: 5,
      included: 5,
      irreversible: 5,
      meanBlocksToInclusion: 1,
      meanBlocksToIrreversible: 2,
      meanSecondsToInclusion: 0.6,
      meanSecondsToIrreversible: 1.4,
      thresholdPercent: 90,
      mandatoryDelay: true,
      thresholdHeld: true,
      statement: 'Every constitutional transaction committed at 90 percent of weight.',
    },
  ],
  headline: 'Cerulea sent 20 generated transactions to the Blockchain and measured 4 blocks.',
};

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
  policies: { answers: {}, chosenProfileId: '' },
  execution: { substrate: 'Native', reason: '' },
  steps: {
    foundation: true,
    compose: true,
    model: false,
    policies: false,
    interfaceAuthoring: false,
    verify: false,
  },
  wizardComplete: false,
  wizardCompletedAt: '',
};

const compilerReport = {
  blueprintHash: 'a'.repeat(64),
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
          severity: 'error' as const,
          message: 'A permission entry names a role the model does not hold.',
          fix: 'Add the role on the Permissions surface, or remove the entry.',
          section: 'permissions',
          path: 'permissions.0.role',
          screen: 'Step 3 Model',
        },
        {
          code: 'collections.index_absent',
          severity: 'warning' as const,
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

function stubFetch(simulation: unknown = report) {
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
    if (url.endsWith('/simulation')) return answer(simulation);
    if (url.endsWith('/compile')) return answer({ ok: false, report: compilerReport });
    if (url.endsWith('/build-state')) return answer({ buildState });
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

describe('the simulation report', () => {
  it('states where the run happened', () => {
    expect(describeSource('local')).toMatch(/running on this machine/);
    expect(describeSource('live')).toMatch(/node this deployment is joined to/);
  });

  it('runs the simulation and renders only measured figures', async () => {
    const calls = stubFetch();
    render(<SimulationReport projectId="p-1" report={null} onReport={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run the simulation' }));
    await waitFor(() =>
      expect(calls.some((call) => call.url.endsWith('/simulation'))).toBe(true),
    );
    const sent = JSON.parse(String(calls[0].init?.body));
    expect(sent.transactionsPerClass).toBe(5);
  });

  it('shows the measured finality and threshold of every class', () => {
    render(<SimulationReport projectId="p-1" report={report} onReport={() => undefined} />);
    expect(screen.getByText('Routine')).toBeInTheDocument();
    expect(screen.getByText('waits out a delay')).toBeInTheDocument();
    expect(screen.getByText('51 percent')).toBeInTheDocument();
    expect(
      screen.getByText('Every routine transaction committed at 51 percent of weight.'),
    ).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
  });
});

describe('Step 6 Verify', () => {
  it('lists what remains, with the screen that closes each line', async () => {
    stubFetch();
    render(<Step6Verify projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText('What remains before deployment')).toBeInTheDocument(),
    );
    expect(
      screen.getByText('A permission entry names a role the model does not hold.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Add the role on the Permissions surface, or remove the entry.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Step 3 Model').length).toBeGreaterThan(0);
  });

  it('states how many items remain', async () => {
    stubFetch();
    render(<Step6Verify projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText(/items remain before deployment/)).toBeInTheDocument(),
    );
  });
});
