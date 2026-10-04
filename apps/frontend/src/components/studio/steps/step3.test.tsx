// apps/frontend/src/components/studio/steps/step3.test.tsx
// The Economics step against a stubbed Cerulea APIs: the four tabs, the
// five questions and the profiles, the retention, the fiat revenue and the
// writes to the draft, the policy answers and the Blueprint.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

import Step3, { AUTOSAVE_DELAY_MS } from './step3';

const questions = ['confirmation', 'operators', 'errorCost', 'split', 'retention'].map((id, index) => ({
  id,
  question: `Question ${index + 1} ${id}`,
  explanation: `Explanation of ${id}.`,
  options:
    id === 'confirmation'
      ? [
          { value: 'InstantConfirmation', label: 'Instant confirmation', meaning: 'At once.' },
          { value: 'MaximumCertainty', label: 'The greatest certainty', meaning: 'Wide agreement.' },
        ]
      : id === 'operators'
        ? [
            { value: 'SingleOrganisation', label: 'One organisation', meaning: 'We run every machine.' },
            { value: 'ManyOrganisations', label: 'Many independent ones', meaning: 'Trust spreads.' },
          ]
        : id === 'errorCost'
          ? [
              { value: 'Recoverable', label: 'We correct it', meaning: 'No lasting harm.' },
              { value: 'Irreversible', label: 'It causes harm we cannot undo', meaning: 'No correction undoes it.' },
            ]
          : id === 'split'
            ? [
                { value: 'KeepServing', label: 'Keep serving', meaning: 'Both sides carry on.' },
                { value: 'HaltToStayConsistent', label: 'Halt to stay consistent', meaning: 'The smaller side pauses.' },
              ]
            : [
                { value: 'RecentOnly', label: 'Recent records are enough', meaning: 'One month.' },
                { value: 'Permanent', label: 'For as long as the network runs', meaning: 'Every block.' },
              ],
}));

const limits = {
  faultMultiple: 3,
  minValidatorSet: 4,
  maxValidatorSet: 1000,
  minThresholdPercent: 51,
  maxThresholdPercent: 99,
  assumedMessageDelayMilliseconds: 2000,
  statements: ['Safety holds while the total participant count exceeds three times the faulty count.'],
};

const profiles = [
  {
    profileId: 'set7_routine60_constitutional95_halt',
    point: {
      validatorCount: 7,
      toleratedFailures: 2,
      routinePercent: 60,
      constitutionalPercent: 95,
      partitionChoice: 'HaltToStayConsistent',
      partitionChoiceStated: true,
    },
    routineFinalityBlocks: 2,
    constitutionalFinalityBlocks: 4,
    retentionBlocks: 0,
    consequences: ['Seven validators tolerate two failing at once.'],
  },
  {
    profileId: 'set4_routine51_constitutional90_halt',
    point: {
      validatorCount: 4,
      toleratedFailures: 1,
      routinePercent: 51,
      constitutionalPercent: 90,
      partitionChoice: 'HaltToStayConsistent',
      partitionChoiceStated: true,
    },
    routineFinalityBlocks: 1,
    constitutionalFinalityBlocks: 3,
    retentionBlocks: 0,
    consequences: ['Four validators tolerate one failing at once.'],
  },
];

function buildState(application: 'dapps' | 'enterprise' | 'government', templateId = '') {
  return {
    version: 1,
    disclosureLevel: 3,
    foundation: {
      projectName: 'Berth register',
      summary: '',
      application,
      track: application === 'dapps' ? 'dapp' : 'blockchain',
      trackOverridden: false,
      templateId,
      publishSelectedRecords: false,
      blockSeconds: 3,
      historyRetentionDays: 3650,
    },
    compose: { outcomeIds: [], moduleIds: [], removedModuleIds: [], chosenLinks: [] },
    policies: { answers: {}, chosenProfileId: '' },
    execution: { substrate: 'Native', reason: '' },
    steps: { foundation: true, compose: true, model: true, policies: false, interfaceAuthoring: false, verify: false },
    wizardComplete: false,
    wizardCompletedAt: '',
    drafts: {},
  };
}

const document = {
  schema_version: '1.0.0',
  name: 'Berth register',
  summary: '',
  types: [],
  collections: [
    {
      id: 'berth',
      record_type: 'berth_record',
      primary_key: 'id',
      indexes: [],
      privacy: 'Open',
      retention: { period_days: 365, on_expiry: 'Delete' },
      purpose: { statement: 'Holds berths.', lawful_basis: 'Contract' },
      description: '',
    },
    {
      id: 'customer_account',
      record_type: 'customer_record',
      primary_key: 'id',
      indexes: [],
      privacy: 'Encrypted',
      retention: { period_days: 365, on_expiry: 'Delete' },
      purpose: { statement: 'Holds customers.', lawful_basis: 'Contract' },
      description: '',
    },
  ],
  identities: {
    units: [],
    roles: [
      { id: 'owner', name: 'Owner', credentials: [] },
      { id: 'harbour_master', name: 'Harbour master', credentials: [] },
    ],
    credentials: [],
    delegations: [],
  },
  permissions: [],
  rules: [],
  actions: [],
  workflows: [],
  events: [],
  views: [],
  integrations: { feeds: [], bridges: [], triggers: [] },
  governance: {
    authority: ['owner'],
    quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 },
    constitutional_delay_blocks: 28800,
    change_process: 'The owner agrees.',
  },
  economics: null,
};

type Call = { url: string; method: string; body: Record<string, unknown> | null };

function stubFetch(input: {
  application?: 'dapps' | 'enterprise' | 'government';
  templateId?: string;
  economics?: unknown;
}) {
  const calls: Call[] = [];
  const state = buildState(input.application ?? 'enterprise', input.templateId ?? '');
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    calls.push({ url, method, body });
    const answer = (payload: unknown, status = 200) =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/policies')) {
      return answer(method === 'POST' ? { profiles, guidance: '' } : { questions, limits });
    }
    if (url.endsWith('/economics')) {
      return answer(
        method === 'PUT'
          ? { ok: true, policies: body?.policies, steps: { policies: true } }
          : { ok: true, economics: input.economics ?? null, policies: state.policies, foundation: state.foundation },
      );
    }
    if (url.endsWith('/build-state')) return answer({ buildState: state });
    if (url.endsWith('/blueprint/document')) {
      return answer(
        method === 'PUT'
          ? { blueprint: { version: 2, blueprintHash: 'abc' }, created: true }
          : { version: 1, document },
      );
    }
    if (/\/api\/projects\/[^/]+$/.test(url)) {
      return answer({
        ok: true,
        project: { projectId: 'p1', name: 'Berth register', summary: '', state: 'draft', headVersion: 1 },
      });
    }
    return answer({ error: 'absent', code: 'absent', message: `No stub for ${url}.`, fix: '' }, 404);
  });
  return calls;
}

async function openStep(input: Parameters<typeof stubFetch>[0] = {}) {
  const calls = stubFetch(input);
  render(<Step3 projectId="p1" goPrev={() => undefined} goNext={() => undefined} />);
  await screen.findByTestId('revenue-panel');
  return calls;
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 50);
  });
}

function lastWrite(calls: Call[], suffix: string) {
  return [...calls].reverse().find((call) => call.url.endsWith(suffix) && call.method === 'PUT');
}

describe('the Economics step', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.setItem('guidance:dismissed:step3', '1');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the four tabs and no token, gas, staking or wallet tab', async () => {
    await openStep();
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual(['Revenue', 'Payments', 'Compliance', 'Governance & policies']);
    expect(screen.queryByText(/Tokenomics|Gas Policy|Staking|Assets|Fees & Splits/)).toBeNull();
  });

  it('saves the project once on opening, so an existing project gains its Governance section', async () => {
    const calls = await openStep();
    await settle();
    const economics = lastWrite(calls, '/economics');
    expect(economics?.body?.policies).toEqual({ answers: {}, chosenProfileId: '' });
    const blueprint = lastWrite(calls, '/blueprint/document');
    const written = blueprint?.body?.document as typeof document;
    expect(written.governance.quorum).toEqual({ routine: 51, financial: 67, structural: 80, constitutional: 90 });
    expect(written.governance.authority).toEqual(['owner']);
    expect(blueprint?.body?.expectedVersion).toBe(1);
  });

  it('answers the five questions, shows the profiles and writes the chosen thresholds into the Blueprint', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep();
    await user.click(screen.getByRole('tab', { name: 'Governance & policies' }));
    await screen.findByText('Question 1 confirmation');
    expect(screen.getByTestId('profiles-waiting')).toBeInTheDocument();

    await user.click(screen.getByLabelText('The greatest certainty'));
    await user.click(screen.getByLabelText('Many independent ones'));
    await user.click(screen.getByLabelText('It causes harm we cannot undo'));
    await user.click(screen.getByLabelText('Halt to stay consistent'));
    await user.click(screen.getByLabelText('For as long as the network runs'));

    await screen.findByText('7 validators');
    expect(screen.getByText('4 validators')).toBeInTheDocument();
    const solved = calls.find((call) => call.url.endsWith('/policies') && call.method === 'POST');
    expect(solved?.body).toEqual({
      confirmation: 'MaximumCertainty',
      operators: 'ManyOrganisations',
      errorCost: 'Irreversible',
      split: 'HaltToStayConsistent',
      retention: 'Permanent',
    });

    await user.click(screen.getByText('7 validators'));
    expect(screen.getByText('Chosen')).toBeInTheDocument();
    const thresholds = screen.getByTestId('class-thresholds');
    expect(within(thresholds).getByText('60 percent')).toBeInTheDocument();
    expect(within(thresholds).getByText('95 percent')).toBeInTheDocument();

    await settle();
    const economics = lastWrite(calls, '/economics');
    expect(economics?.body?.policies).toEqual({
      answers: {
        confirmationPreference: 'certain',
        organisationCount: 50,
        wrongRecordCost: 'severe',
        serveDuringSplit: false,
        provableYears: 100,
      },
      chosenProfileId: 'set7_routine60_constitutional95_halt',
    });
    const blueprint = lastWrite(calls, '/blueprint/document');
    const written = blueprint?.body?.document as typeof document;
    expect(written.governance.quorum).toEqual({ routine: 60, financial: 67, structural: 80, constitutional: 95 });
    expect(screen.getByTestId('economics-save-status')).toHaveTextContent('Saved to Cerulea APIs');
  });

  it('writes the retention of every collection and its own span for one', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep();
    await user.click(screen.getByRole('tab', { name: 'Compliance' }));
    const days = await screen.findByTestId('retention-days');
    fireEvent.change(days, { target: { value: '3650' } });
    const row = screen.getByTestId('retention-rows').querySelector('[data-retention-row="berth"]');
    expect(row).not.toBeNull();
    fireEvent.change(within(row as HTMLElement).getByLabelText('Retention days for berth'), {
      target: { value: '36500' },
    });
    await settle();
    const written = lastWrite(calls, '/blueprint/document')?.body?.document as typeof document;
    expect(written.collections.find((entry) => entry.id === 'berth')?.retention).toEqual({
      period_days: 36500,
      on_expiry: 'Archive',
    });
    expect(written.collections.find((entry) => entry.id === 'customer_account')?.retention).toEqual({
      period_days: 3650,
      on_expiry: 'Archive',
    });
  });

  it('writes the Economics section while the builder charges in fiat, and removes it again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep({ application: 'dapps' });
    await user.click(screen.getByLabelText('This system charges its customers'));
    expect(screen.getByTestId('revenue-open-question')).toBeInTheDocument();
    expect(screen.queryByText(/ETH|USDC/)).toBeNull();
    await settle();
    let written = lastWrite(calls, '/blueprint/document')?.body?.document as typeof document;
    expect(written.economics).toEqual({
      unit_of_account: { name: 'US dollar', symbol: 'USD', scale: 2 },
      issuance: { kind: 'External', initial_supply: '0' },
      accounts_collection: 'customer_account',
    });

    await user.click(screen.getByLabelText('This system charges its customers'));
    await settle();
    written = lastWrite(calls, '/blueprint/document')?.body?.document as typeof document;
    expect(written.economics).toBeNull();
  });

  it('shows the Government posture with the standard lines and names the organisations in the change process', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep({ application: 'government', templateId: 'govt-land-records' });
    await user.click(screen.getByRole('tab', { name: 'Governance & policies' }));
    const posture = await screen.findByTestId('government-posture');
    expect(within(posture).getByText('Air-gapped installation')).toBeInTheDocument();
    expect(within(posture).getByText('Residency lock')).toBeInTheDocument();
    expect(within(posture).getByText('Multi-organisation governance')).toBeInTheDocument();
    expect(within(posture).getByText('Extended retention')).toBeInTheDocument();
    await settle();
    const written = lastWrite(calls, '/blueprint/document')?.body?.document as typeof document;
    expect(written.governance.change_process).toContain('Every structural change requires agreement across');
    expect(written.collections[0].retention.period_days).toBe(30 * 365);
  });

  it('names the fix when the save is refused', async () => {
    const calls = await openStep();
    const original = globalThis.fetch;
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      if (url.endsWith('/economics') && init?.method === 'PUT') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'The running Cerulea APIs keeps no draft area. Restart it.',
              code: 'build_state.drafts_absent',
              message: 'The running Cerulea APIs keeps no draft area.',
              fix: 'Restart Cerulea APIs at a version whose build state holds the drafts field.',
              details: {},
            }),
            { status: 502, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
      return original(url, init);
    });
    await settle();
    await waitFor(() => expect(screen.getByTestId('economics-save-failure')).toBeInTheDocument());
    expect(screen.getByTestId('economics-save-failure')).toHaveTextContent('Restart Cerulea APIs');
    expect(calls.some((call) => call.url.endsWith('/blueprint/document') && call.method === 'PUT')).toBe(false);
  });
});
