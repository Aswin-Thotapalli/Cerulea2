import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import IntegrationsPanel from './page';

function serve(status: number, body: unknown): string[] {
  const seen: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      seen.push(url);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return seen;
}

const platform = {
  mode: 'live',
  ready: false,
  checkedAt: '2026-09-19T06:15:00.000Z',
  drivers: [
    { integration: 'email', kind: 'live', ready: true, detail: 'relay answered' },
    { integration: 'payments', kind: 'local', ready: false, detail: 'ledger file locked' },
  ],
};

const connected = {
  projectId: 'p-1',
  projectName: 'Berth register',
  workspaceName: 'Port authority',
  version: 7,
  feeds: [
    { id: 'f-1', name: 'Tide height', provider: 'Harbour office', cadence_seconds: 30, attestation: 'Signature' },
    { id: 'f-2', name: 'Weather', provider: 'Met service', cadence_seconds: 300, attestation: 'Quorum' },
    { id: 'f-3', name: 'Exchange rate', provider: 'Central bank', cadence_seconds: 7200, attestation: 'Signature' },
  ],
  bridges: [
    {
      id: 'b-1',
      target_network: 'the customs chain',
      direction: 'Outbound',
      collection: 'Manifests',
      confirmations: 12,
    },
  ],
  triggers: [
    { id: 't-1', event: 'Berth assigned', endpoint: 'https://ops.example', signing: 'Shared secret', retries: 5 },
  ],
};

const feedsOnly = {
  projectId: 'p-2',
  projectName: 'Pilot roster',
  workspaceName: 'Port authority',
  version: 2,
  feeds: [{ id: 'f-9', name: 'Tide height', provider: 'Harbour office', cadence_seconds: 60, attestation: 'Signature' }],
  bridges: [],
  triggers: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Integrations panel', { timeout: 30000 }, () => {
  it('reports the mode and each driver state', async () => {
    const seen = serve(200, { platform, projects: [] });
    render(<IntegrationsPanel />);
    expect(screen.getByText('Cerulea is reading every connection.')).toBeInTheDocument();
    await screen.findByText('relay answered');
    expect(seen[0]).toBe('/api/dashboard/integrations');

    expect(screen.getByText('live mode')).toBeInTheDocument();
    expect(screen.getByText('A driver needs attention')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Read at ${new Date(platform.checkedAt).toLocaleTimeString()}`)),
    ).toBeInTheDocument();

    const email = within(screen.getByText('relay answered').closest('tr') as HTMLElement);
    expect(email.getByText('email')).toBeInTheDocument();
    expect(email.getByText('Ready')).toBeInTheDocument();
    const payments = within(screen.getByText('ledger file locked').closest('tr') as HTMLElement);
    expect(payments.getByText('local')).toBeInTheDocument();
    expect(payments.getByText('Waiting')).toBeInTheDocument();
  });

  it('states every driver is ready when the platform reports so', async () => {
    serve(200, { platform: { ...platform, ready: true }, projects: [] });
    render(<IntegrationsPanel />);
    expect(await screen.findByText('Every driver ready')).toBeInTheDocument();
  });

  it('states what to do while no project exists', async () => {
    serve(200, { platform, projects: [] });
    render(<IntegrationsPanel />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
  });

  it('describes each feed, bridge and outbound trigger a system declares', async () => {
    serve(200, { platform, projects: [connected] });
    render(<IntegrationsPanel />);
    await screen.findByText('Berth register');
    expect(screen.getByText('Port authority, version 7')).toBeInTheDocument();
    expect(screen.getByText('Feeds coming in')).toBeInTheDocument();
    expect(
      screen.getByText(/Tide height from Harbour office, every 30 seconds\s*, attested by signature\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Weather from Met service, every 5 minutes\s*, attested by quorum\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Exchange rate from Central bank, every 2\.0 hours\s*, attested by signature\./),
    ).toBeInTheDocument();
    expect(screen.getByText('Bridges')).toBeInTheDocument();
    expect(
      screen.getByText('Manifests moves outbound to the customs chain after 12 confirmations.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Outbound triggers')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Berth assigned calls an address outside Cerulea, signed by shared secret, retried 5 times.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/This system reaches nothing outside itself yet/)).toBeNull();
  });

  it('shows only the kinds of connection a system declares', async () => {
    serve(200, { platform, projects: [feedsOnly] });
    render(<IntegrationsPanel />);
    await screen.findByText('Pilot roster');
    expect(screen.getByText('Feeds coming in')).toBeInTheDocument();
    expect(screen.getByText(/every 1 minutes/)).toBeInTheDocument();
    expect(screen.queryByText('Bridges')).toBeNull();
    expect(screen.queryByText('Outbound triggers')).toBeNull();
  });

  it('names the fix when the connections cannot be read', async () => {
    serve(502, {
      error: {
        code: 'service.unreachable',
        message: 'The driver set did not answer.',
        fix: 'Start Cerulea APIs, then read the panel again.',
        details: {},
      },
    });
    render(<IntegrationsPanel />);
    expect(await screen.findByText('The driver set did not answer.')).toBeInTheDocument();
    expect(screen.getByText('Start Cerulea APIs, then read the panel again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read again' })).toBeInTheDocument();
  });
});
