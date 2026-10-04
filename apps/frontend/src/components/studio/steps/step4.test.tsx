// apps/frontend/src/components/studio/steps/step4.test.tsx
// The Integrations step against a stubbed Cerulea APIs: the catalogue, the
// kind of each provider, the test button, key custody, the draft and the
// Blueprint Integrations section.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

import Step4, { AUTOSAVE_DELAY_MS, PROVIDER_COUNT } from './step4';

const document = {
  schema_version: '1.0.0',
  name: 'Export registry',
  summary: '',
  types: [{ id: 'inspection_result', kind: 'Record', fields: [], description: '' }],
  collections: [
    {
      id: 'shipment',
      record_type: 'inspection_result',
      primary_key: 'id',
      indexes: [],
      privacy: 'Open',
      retention: { period_days: 365, on_expiry: 'Delete' },
      purpose: { statement: 'Holds shipments.', lawful_basis: 'Contract' },
      description: '',
    },
  ],
  identities: { units: [], roles: [{ id: 'owner', name: 'Owner', credentials: [] }], credentials: [], delegations: [] },
  permissions: [],
  rules: [],
  actions: [],
  workflows: [],
  events: [{ id: 'shipment_released', name: 'Shipment released', payload_type: 'inspection_result', audit: true, description: '' }],
  views: [],
  integrations: { feeds: [], bridges: [], triggers: [] },
  governance: { authority: ['owner'], quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 }, constitutional_delay_blocks: 28800, change_process: 'The owner agrees.' },
  economics: null,
};

const buildState = {
  version: 1,
  disclosureLevel: 3,
  foundation: { projectName: 'Export registry', summary: '', application: 'enterprise', track: 'blockchain', trackOverridden: false, templateId: '', publishSelectedRecords: false, blockSeconds: 3, historyRetentionDays: 3650 },
  compose: { outcomeIds: [], moduleIds: [], removedModuleIds: [], chosenLinks: [] },
  policies: { answers: {}, chosenProfileId: '' },
  execution: { substrate: 'Native', reason: '' },
  steps: { foundation: true, compose: true, model: true, policies: true, interfaceAuthoring: false, verify: false },
  wizardComplete: false,
  wizardCompletedAt: '',
  drafts: {},
};

type Call = { url: string; method: string; body: Record<string, unknown> | null };

function stubFetch(input: { held?: unknown; custodyAbsent?: boolean } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    calls.push({ url, method, body });
    const answer = (payload: unknown, status = 200) =>
      Promise.resolve(new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } }));
    if (url.endsWith('/credentials')) {
      if (input.custodyAbsent) {
        return answer(
          {
            error: 'The running Cerulea APIs holds no key custody route for integration credentials yet. Nothing was stored. Restart Cerulea APIs.',
            code: 'integrations.custody_absent',
            message: 'The running Cerulea APIs holds no key custody route for integration credentials yet. Nothing was stored.',
            fix: 'Restart Cerulea APIs at a version carrying the route, then store the credentials again.',
            details: {},
          },
          502,
        );
      }
      return answer({ ok: true, integrationId: 'stripe', environment: (body?.environment as string) ?? 'test', held: Object.keys((body?.values as object) ?? {}), storedAt: '2026-10-04T10:00:00Z' });
    }
    if (url.endsWith('/api/integrations/test')) {
      const integrationId = body?.integrationId;
      if (integrationId === 'stripe') {
        return answer({ ok: true, driver: 'local', message: 'Cerulea APIs serves the payments kind for Stripe through its local driver. The local ledger holds 1 subscriptions and 1 invoices.', checkedAt: '2026-10-04T10:00:00Z' });
      }
      return answer({ ok: false, driver: 'none', message: 'The Blueprint holds no oracle feed for Chainlink yet.', checkedAt: '2026-10-04T10:00:00Z' });
    }
    if (url.endsWith('/integrations')) {
      return answer(method === 'PATCH' ? { ok: true, document: body?.document } : { ok: true, document: input.held ?? null, configs: {}, enabled: [] });
    }
    if (url.endsWith('/build-state')) return answer({ buildState });
    if (url.endsWith('/blueprint/document')) {
      return answer(method === 'PUT' ? { blueprint: { version: 2, blueprintHash: 'abc' }, created: true } : { version: 1, document });
    }
    if (/\/api\/projects\/[^/]+$/.test(url)) {
      return answer({ ok: true, project: { projectId: 'p1', name: 'Export registry', summary: '', state: 'draft', headVersion: 1 } });
    }
    return answer({ error: 'absent', code: 'absent', message: `No stub for ${url}.`, fix: '' }, 404);
  });
  return calls;
}

async function openStep(input: Parameters<typeof stubFetch>[0] = {}) {
  const calls = stubFetch(input);
  render(<Step4 projectId="p1" goPrev={() => undefined} goNext={() => undefined} />);
  await screen.findByTestId('kind-line');
  return calls;
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 50);
  });
}

function lastWrite(calls: Call[], suffix: string, method: string) {
  return [...calls].reverse().find((call) => call.url.endsWith(suffix) && call.method === method);
}

describe('the Integrations step', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.setItem('guidance:dismissed:step4', '1');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lists the seven categories, the 45 providers and the Cerulea kind of each', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await openStep();
    expect(PROVIDER_COUNT).toBe(45);
    const sidebar = screen.getByTestId('category-sidebar');
    expect(within(sidebar).getAllByRole('button')).toHaveLength(7);
    expect(screen.getByTestId('kind-line')).toHaveTextContent('Cerulea kind: payments');
    await user.click(within(sidebar).getByRole('button', { name: 'Auth category' }));
    await user.click(screen.getByRole('button', { name: 'Clerk provider' }));
    expect(screen.getByTestId('kind-line')).toHaveTextContent('Not available in this release');
    expect(screen.queryByLabelText('Enable Clerk')).toBeNull();
  });

  it('enables a provider, stores the secret in key custody and keeps no secret in the draft', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep();
    await user.click(screen.getByLabelText('Enable Stripe'));
    fireEvent.change(screen.getByLabelText('Publishable key'), { target: { value: 'pk_test_abc' } });
    fireEvent.change(screen.getByLabelText('Secret key'), { target: { value: 'sk_test_secret' } });
    await user.click(screen.getByRole('button', { name: /Store the secrets/ }));
    await waitFor(() => expect(screen.getByTestId('custody-note')).toHaveTextContent('key custody holds secretKey'));
    const custody = lastWrite(calls, '/credentials', 'PUT');
    expect(custody?.url).toContain('/api/projects/p1/integrations/stripe/credentials');
    expect(custody?.body).toEqual({ environment: 'test', values: { secretKey: 'sk_test_secret' } });
    expect(screen.getByText('Held by Cerulea APIs key custody')).toBeInTheDocument();
    expect((screen.getByLabelText('Secret key') as HTMLInputElement).value).toBe('');

    await settle();
    const draft = lastWrite(calls, '/integrations', 'PATCH');
    expect(JSON.stringify(draft?.body)).not.toContain('sk_test_secret');
    const stripe = (draft?.body?.document as { configs: Record<string, { enabled: boolean; settings: unknown; held: unknown; kind: string }> }).configs.stripe;
    expect(stripe).toMatchObject({ enabled: true, kind: 'payments', settings: { publishableKey: 'pk_test_abc' }, held: { test: ['secretKey'], live: [] } });
    expect(screen.getByTestId('enabled-count-Payments')).toHaveTextContent('1');
  });

  it('names the fix when Cerulea APIs holds no custody route yet', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await openStep({ custodyAbsent: true });
    await user.click(screen.getByLabelText('Enable Stripe'));
    fireEvent.change(screen.getByLabelText('Secret key'), { target: { value: 'sk_test_secret' } });
    await user.click(screen.getByRole('button', { name: /Store the secrets/ }));
    await waitFor(() => expect(screen.getByTestId('custody-note')).toHaveTextContent('Restart Cerulea APIs'));
    expect(screen.queryByText('Held by Cerulea APIs key custody')).toBeNull();
  });

  it('shows the real answer of the test button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep();
    await user.click(screen.getByLabelText('Enable Stripe'));
    await user.click(screen.getByRole('button', { name: 'Test' }));
    await waitFor(() => expect(screen.getByTestId('test-result')).toHaveTextContent('local driver'));
    expect(screen.getByTestId('test-result')).toHaveTextContent('The local ledger holds 1 subscriptions and 1 invoices.');
    const test = lastWrite(calls, '/api/integrations/test', 'POST');
    expect(test?.body).toEqual({ projectId: 'p1', integrationId: 'stripe', environment: 'test' });
  });

  it('writes an oracle feed into the Blueprint once the record type is chosen', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep();
    await user.click(within(screen.getByTestId('category-sidebar')).getByRole('button', { name: 'Data category' }));
    await user.click(screen.getByRole('button', { name: 'Chainlink provider' }));
    expect(screen.getByTestId('kind-line')).toHaveTextContent('Cerulea kind: oracle');
    await user.click(screen.getByLabelText('Enable Chainlink'));
    expect(screen.getByTestId('blueprint-gap')).toHaveTextContent('names no record type');
    fireEvent.change(screen.getByTestId('feed-type-select'), { target: { value: 'inspection_result' } });
    await waitFor(() => expect(screen.getByTestId('blueprint-written')).toBeInTheDocument());
    await settle();
    const written = lastWrite(calls, '/blueprint/document', 'PUT');
    const doc = written?.body?.document as typeof document;
    expect(doc.integrations.feeds).toEqual([
      { id: 'integration_chainlink', name: 'Chainlink', provider: 'chainlink', payload_type: 'inspection_result', cadence_seconds: 60, attestation: 'Signature' },
    ]);
    expect(written?.body?.expectedVersion).toBe(1);
    expect(screen.getByTestId('integrations-save-status')).toHaveTextContent('Saved to Cerulea APIs');
  });

  it('writes an external trigger for a webhook provider', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = await openStep();
    await user.click(within(screen.getByTestId('category-sidebar')).getByRole('button', { name: 'Webhooks category' }));
    await user.click(screen.getByRole('button', { name: 'Slack provider' }));
    await user.click(screen.getByLabelText('Enable Slack'));
    fireEvent.change(screen.getByLabelText('Webhook address'), { target: { value: 'https://hooks.slack.com/services/T/B/x' } });
    fireEvent.change(screen.getByTestId('trigger-event-select'), { target: { value: 'shipment_released' } });
    await settle();
    const doc = lastWrite(calls, '/blueprint/document', 'PUT')?.body?.document as typeof document;
    expect(doc.integrations.triggers).toEqual([
      { id: 'integration_slack_webhook', event: 'shipment_released', endpoint: 'https://hooks.slack.com/services/T/B/x', signing: 'Signature', retries: 5 },
    ]);
  });

  it('reads a held draft back', async () => {
    await openStep({
      held: { version: 2, configs: { stripe: { enabled: true, environment: 'live', settings: { publishableKey: 'pk_live_1' }, held: { test: [], live: ['secretKey'] }, blueprint: {}, lastTest: null } } },
    });
    expect(screen.getByLabelText('Enable Stripe')).toBeChecked();
    expect((screen.getByLabelText('Publishable key') as HTMLInputElement).value).toBe('pk_live_1');
    expect(screen.getByText('Held by Cerulea APIs key custody')).toBeInTheDocument();
  });
});
