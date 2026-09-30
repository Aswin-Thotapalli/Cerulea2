import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The page a deployed system opens on.
 *
 * The page reads the deployment record for the project the address names. It
 * states what the deployment installed, what the Blueprint holds and where to
 * go next. These tests check what it shows for each record.
 */

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'trace app' }),
}));

import DeployedSystemPage from './page';

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stub(handler: () => Promise<Response>) {
  const urls: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    urls.push(url);
    return handler();
  });
  return urls;
}

const deployed = {
  project: {
    projectId: 'p-42',
    name: 'Shipment trace',
    summary: 'Every crate carries its record from farm to shop.',
    state: 'deployed',
    headVersion: 7,
  },
  workspace: { workspaceId: 'w-1', name: 'Harbour' },
  deployment: {
    deploymentId: 'd-1',
    status: 'rolled_back',
    stages: [
      { name: 'Install the Blueprint', status: 'succeeded', startedAt: null, endedAt: null, outcome: 'Installed 12 sections.' },
      { name: 'Open the surface', status: 'running', startedAt: null, endedAt: null, outcome: null },
    ],
  },
  counts: { Collections: 2, Actions: 5 },
  collections: [
    { id: 'crates', description: 'Every crate in transit', privacy: 'Private' },
    { id: 'farms', description: '', privacy: 'Shared' },
  ],
  actions: [],
  views: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the deployed system page', { timeout: 30000 }, () => {
  it('reads the record the address names and shows what the deployment installed', async () => {
    const urls = stub(() => Promise.resolve(reply(200, deployed)));
    render(<DeployedSystemPage />);
    expect(screen.getByText('Cerulea is reading this deployed system.')).toBeInTheDocument();

    expect(await screen.findByText('Shipment trace')).toBeInTheDocument();
    expect(urls[0]).toBe('/api/deployed/trace%20app');
    expect(screen.getByText('Every crate carries its record from farm to shop.')).toBeInTheDocument();
    expect(screen.getByText('Harbour')).toBeInTheDocument();
    expect(screen.getByText('Version 7')).toBeInTheDocument();
    expect(screen.getByText('deployed')).toBeInTheDocument();
    expect(screen.getByText('rolled back')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Install the Blueprint')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Installed 12 sections.')).toBeInTheDocument();
    expect(within(rows[2]).getByText('running')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Still running.')).toBeInTheDocument();

    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Every crate in transit')).toBeInTheDocument();
    expect(screen.getByText('farms')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Open in Studio' })).toHaveAttribute('href', '/?project=p-42');
    expect(screen.getByRole('link', { name: 'Read the network' })).toHaveAttribute('href', '/dashboard/networks');
    expect(screen.getByRole('link', { name: 'Manage access keys' })).toHaveAttribute('href', '/dashboard/keys');
  });

  it('points a system that is not deployed back to Studio', async () => {
    stub(() =>
      Promise.resolve(
        reply(200, {
          ...deployed,
          project: { ...deployed.project, summary: '', state: 'draft' },
          deployment: null,
          counts: {},
          collections: [],
        }),
      ),
    );
    render(<DeployedSystemPage />);
    expect(await screen.findByText('This system is not deployed yet')).toBeInTheDocument();
    expect(screen.getByText('No summary is written for this system yet.')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the project' })).toHaveAttribute('href', '/?project=p-42');
    expect(screen.getByText(/No collection is declared yet\./)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('marks a succeeded deployment and reads again after a failure', async () => {
    let answer = () =>
      Promise.resolve(
        reply(404, {
          error: { code: 'deployed.absent', message: 'Cerulea holds no system at this address.', fix: 'Check the address.' },
        }),
      );
    const urls = stub(() => answer());
    render(<DeployedSystemPage />);
    expect(await screen.findByText('Cerulea holds no system at this address.')).toBeInTheDocument();
    expect(screen.getByText('Check the address.')).toBeInTheDocument();

    answer = () =>
      Promise.resolve(
        reply(200, { ...deployed, deployment: { ...deployed.deployment, status: 'succeeded', stages: [] } }),
      );
    await userEvent.click(screen.getByRole('button', { name: 'Read again' }));
    expect(await screen.findByText('succeeded')).toBeInTheDocument();
    expect(urls).toHaveLength(2);
  });
});
