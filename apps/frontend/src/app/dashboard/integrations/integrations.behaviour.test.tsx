import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import IntegrationsPage from './page';

/**
 * The Integrations screen.
 *
 * Each test serves the integrations route reply and checks the driver rows,
 * the declared connections, the stat strip, the published surface, the
 * webhook card, the details dialog and the failure.
 */

type Served = { status?: number; body: unknown };

function serve(table: Record<string, Served>): string[] {
  const seen: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      seen.push(url);
      const entry = table[url];
      if (!entry) {
        return new Response(JSON.stringify({ error: `No answer for ${url}.`, code: 'suite.unanswered', message: `No answer for ${url}.`, fix: 'Add one.', details: {} }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(entry.body), { status: entry.status ?? 200, headers: { 'content-type': 'application/json' } });
    }),
  );
  return seen;
}

const platform = {
  mode: 'local',
  ready: true,
  checkedAt: '2026-10-04T03:16:46.031Z',
  drivers: [
    { integration: 'payments', kind: 'local', ready: true, detail: 'The local ledger holds 1 subscriptions and 1 invoices.' },
    { integration: 'email', kind: 'local', ready: false, detail: 'The mail directory is unreachable.' },
  ],
};

const land = {
  projectId: 'prj_land',
  projectName: 'Land title registry',
  workspaceName: 'Registry office',
  division: 'enterprise',
  state: 'draft',
  version: 6,
  feeds: [{ id: 'feed_rates', name: 'Guideline values', provider: 'Revenue department', payload_type: 'Number', cadence_seconds: 3600, attestation: 'Signature' }],
  bridges: [],
  triggers: [{ id: 'trg_transfer', event: 'transfer_registered', endpoint: 'https://bank.example/hooks', signing: 'Signature', retries: 5 }],
};

const permit = { ...land, projectId: 'prj_permit', projectName: 'Permit issuance', feeds: [], triggers: [] };

const surface = {
  projectId: 'prj_land',
  deploymentId: 'dep_live',
  status: 'succeeded',
  host: 'land-title-registry-v3cq8gjx.cerulea.test',
  basePath: '/v1/deployments/dep_live',
  certificateNotAfter: '2026-12-30T04:09:57.663Z',
  blueprintHash: 'a'.repeat(64),
  descriptionHash: 'b'.repeat(64),
  descriptionVersion: 6,
  descriptionMatchesDeployment: true,
  endpoints: [
    { kind: 'action', method: 'POST', path: '/actions/approve_transfer', address: 'https://land-title-registry-v3cq8gjx.cerulea.test/v1/deployments/dep_live/actions/approve_transfer', purpose: 'Approve a transfer.', roles: ['registrar'], transactionClass: 'Structural', threshold: 80 },
    { kind: 'record', method: 'GET', path: '/records/parcel', address: 'https://land-title-registry-v3cq8gjx.cerulea.test/v1/deployments/dep_live/records/parcel', purpose: 'Reads parcels.', roles: [], transactionClass: null, threshold: null },
    { kind: 'stream', method: 'GET', path: '/stream', address: 'https://land-title-registry-v3cq8gjx.cerulea.test/v1/deployments/dep_live/stream', purpose: 'Carries changes.', roles: [], transactionClass: null, threshold: null },
  ],
  webhooks: [
    { event: 'transfer_registered', purpose: 'A transfer reached the register.', endpoint: 'https://bank.example/hooks', signing: 'Signature', retries: 5 },
  ],
};

const view = { platform, projects: [land, permit], selectedProjectId: 'prj_land', surface };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Integrations screen', { timeout: 60000 }, () => {
  it('shows the real drivers, the declared connections and real counts', async () => {
    const seen = serve({ '/api/dashboard/integrations': { body: view } });
    render(<IntegrationsPage />);
    expect(screen.getByRole('status', { name: 'Reading the integrations' })).toBeInTheDocument();
    await screen.findByText('Payments');
    expect(seen).toEqual(['/api/dashboard/integrations']);
    expect(screen.getByText('THIRD-PARTY SERVICES')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the Integrations step' })).toBeInTheDocument();

    const payments = within(screen.getByTestId('service-driver:payments'));
    expect(payments.getByText('Local driver')).toBeInTheDocument();
    expect(payments.getByText('The local ledger holds 1 subscriptions and 1 invoices.')).toBeInTheDocument();
    expect(payments.getByText('Ready')).toBeInTheDocument();

    const email = within(screen.getByTestId('service-driver:email'));
    expect(email.getByText('Holding back')).toBeInTheDocument();

    const feed = within(screen.getByTestId('service-feed:feed_rates'));
    expect(feed.getByText('Guideline values')).toBeInTheDocument();
    expect(feed.getByText('Feed from Revenue department, every 1.0 hours, attested by signature.')).toBeInTheDocument();

    const trigger = within(screen.getByTestId('service-trigger:trg_transfer'));
    expect(trigger.getByText('https://bank.example/hooks')).toBeInTheDocument();

    expect(within(screen.getByTestId('stat-Available')).getByText('4')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Enabled')).getByText('3')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Disabled')).getByText('1')).toBeInTheDocument();

    // The invented services and the switch of the earlier screen are gone.
    expect(screen.queryByText('Stripe')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('lists the real addresses of the published surface and the delivered events', async () => {
    serve({ '/api/dashboard/integrations': { body: view } });
    render(<IntegrationsPage />);
    await screen.findByText('Payments');

    const endpoints = within(screen.getByTestId('api-endpoints'));
    expect(endpoints.getByText('https://land-title-registry-v3cq8gjx.cerulea.test')).toBeInTheDocument();
    expect(endpoints.getByText('Deployment dep_live')).toBeInTheDocument();
    expect(endpoints.getByText('Blueprint version 6')).toBeInTheDocument();
    expect(endpoints.getByText('https://land-title-registry-v3cq8gjx.cerulea.test/v1/deployments/dep_live/actions/approve_transfer')).toBeInTheDocument();
    expect(endpoints.getByText('Structural 80%')).toBeInTheDocument();
    expect(endpoints.getByText('RECORDS')).toBeInTheDocument();
    expect(endpoints.getByText('STREAM')).toBeInTheDocument();
    expect(endpoints.getByRole('button', { name: 'Copy https://land-title-registry-v3cq8gjx.cerulea.test/v1/deployments/dep_live/records/parcel' })).toBeInTheDocument();

    const hooks = within(screen.getByTestId('webhooks'));
    const hook = within(hooks.getByTestId('webhook-transfer_registered'));
    expect(hook.getByText('A transfer reached the register.')).toBeInTheDocument();
    expect(hook.getByText('Signed, 5 retries')).toBeInTheDocument();
    expect(hook.getByText('to https://bank.example/hooks')).toBeInTheDocument();
    expect(screen.queryByText(/whsec_/)).toBeNull();
  });

  it('reads the chosen project and shows the production empty state when it holds no deployment', async () => {
    const person = userEvent.setup();
    const seen = serve({
      '/api/dashboard/integrations': { body: view },
      '/api/dashboard/integrations?projectId=prj_permit': { body: { ...view, selectedProjectId: 'prj_permit', surface: null } },
    });
    render(<IntegrationsPage />);
    await screen.findByText('Payments');
    await person.click(screen.getByLabelText('Project'));
    await person.click(await screen.findByRole('option', { name: 'Permit issuance' }));
    await waitFor(() => expect(seen).toContain('/api/dashboard/integrations?projectId=prj_permit'));
    expect(await within(screen.getByTestId('api-endpoints')).findByText('No deployed projects found.')).toBeInTheDocument();
    expect(within(screen.getByTestId('webhooks')).getByText('No deployed projects found.')).toBeInTheDocument();
    expect(screen.queryByTestId('service-feed:feed_rates')).toBeNull();
    expect(within(screen.getByTestId('stat-Available')).getByText('2')).toBeInTheDocument();
  });

  it('opens the details dialog of a driver with the way to the Integrations step', async () => {
    const person = userEvent.setup();
    serve({ '/api/dashboard/integrations': { body: view } });
    render(<IntegrationsPage />);
    await screen.findByText('Payments');
    await person.click(screen.getByRole('button', { name: 'Details of Payments' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Local driver. Settles subscriptions and invoices in fiat.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Open the Integrations step' })).toBeInTheDocument();
    expect(screen.queryByText(/Step 5/)).toBeNull();
  });

  it('names the failure and offers a retry', async () => {
    serve({
      '/api/dashboard/integrations': {
        status: 503,
        body: { error: 'Cerulea APIs is unreachable. Start Cerulea APIs.', code: 'apis.unreachable', message: 'Cerulea APIs is unreachable.', fix: 'Start Cerulea APIs.', details: {} },
      },
    });
    render(<IntegrationsPage />);
    expect(await screen.findByText('Cerulea APIs is unreachable. Start Cerulea APIs.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
