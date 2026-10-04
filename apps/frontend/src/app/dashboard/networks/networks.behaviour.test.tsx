import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NetworksPage from './page';

const chain = {
  node: {
    systemName: 'cerulea-node',
    systemVersion: '0.1.0-local',
    chainName: 'Cerulea',
    kind: 'local',
    peers: 3,
    isSyncing: false,
    shouldHavePeers: true,
    observedAt: '2026-10-04T03:13:54.000Z',
  },
  head: { number: 24, producedAt: '2026-10-04T03:13:50.000Z' },
  finalizedBlock: 22,
  finalityLag: 2,
  epoch: 0,
  round: 13,
  validatorSetId: 1,
  activeValidators: 4,
  totalValidators: 4,
  consensusHealth: 'Healthy',
  healthy: true,
  issues: ['One validator missed its last turn.'],
};

const measurement = {
  sampledBlocks: 24,
  meanBlockSeconds: 0.6,
  transactions: 48,
  transactionsPerSecond: 1.74,
  firstBlock: 1,
  lastBlock: 24,
  measuredAt: '2026-10-04T03:13:54.000Z',
};

function row(overrides: Record<string, unknown>) {
  return {
    id: 'prj_land',
    name: 'Land title registry',
    type: 'Blockchain',
    projectType: 'blockchain',
    division: 'govt',
    status: 'live',
    blockHeight: 4182034,
    finalizedBlock: 4182030,
    tps: 1.743,
    sampledBlocks: 24,
    measuredAt: '2026-10-04T03:13:54.849Z',
    consensusHealth: 100,
    consensusState: 'Healthy',
    activeValidators: 2,
    totalValidators: 2,
    peers: 1,
    chainName: 'Cerulea',
    region: 'local',
    deploymentId: 'dep_live',
    deploymentState: 'succeeded',
    host: 'land-title-registry.cerulea.test',
    basePath: '/v1/deployments/dep_live',
    failureReason: null,
    unreachableReason: null,
    workspaceName: 'Registry office',
    ...overrides,
  };
}

const filled = {
  networks: [
    row({}),
    row({
      id: 'prj_permit', name: 'Permit issuance', status: 'building', blockHeight: null, finalizedBlock: null,
      tps: null, sampledBlocks: null, measuredAt: null, consensusHealth: null, consensusState: null,
      activeValidators: null, totalValidators: null, region: null, deploymentId: null, host: null, basePath: null,
    }),
    row({
      id: 'prj_vote', name: 'Voting dApp', type: 'dApp', projectType: 'dapp', division: 'dapp', status: 'live',
      blockHeight: 98201, tps: 0.5, consensusHealth: 75, consensusState: 'Degraded', activeValidators: 3, totalValidators: 4,
      deploymentId: 'dep_vote', host: 'voting-dapp.cerulea.test',
    }),
  ],
  chain,
  measurement,
  observedAt: new Date(Date.now() - 20 * 1000).toISOString(),
};

function stubFetch(status: number, body: unknown) {
  const seen: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    seen.push(url);
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
    );
  });
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Networks screen', { timeout: 30000 }, () => {
  it('keeps the production header and feeds the four stat cards from the rows', async () => {
    const seen = stubFetch(200, filled);
    render(<NetworksPage />);
    expect(screen.getByText('FLEET MANAGEMENT')).toBeInTheDocument();
    expect(screen.getByText('Networks / Fleet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deploy New Network' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    expect(seen[0]).toBe('/api/dashboard/networks');

    expect(screen.getByText('LIVE NETWORKS')).toBeInTheDocument();
    expect(screen.getByText('TOTAL NETWORKS')).toBeInTheDocument();
    expect(screen.getByText('COMBINED TPS')).toBeInTheDocument();
    expect(screen.getByText('CONSENSUS HEALTH')).toBeInTheDocument();
    // Two live rows out of three; their rates sum; their shares average.
    const card = (label: string) => screen.getByText(label).closest('.MuiPaper-root') as HTMLElement;
    expect(card('LIVE NETWORKS').textContent).toContain('2');
    expect(card('TOTAL NETWORKS').textContent).toContain('3');
    expect(card('COMBINED TPS').textContent).toContain('2.24');
    expect(card('CONSENSUS HEALTH').textContent).toContain('87.5');
  });

  it('lists the production columns with the values each deployment reported', async () => {
    stubFetch(200, filled);
    render(<NetworksPage />);
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    for (const header of ['NETWORK', 'TYPE', 'STATUS', 'BLOCK HEIGHT', 'TPS', 'CONSENSUS', 'LAST READ', 'REGION']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
    expect(screen.getByText('4,182,034')).toBeInTheDocument();
    expect(screen.getByText('1.74 tx/s')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getAllByText('local')).toHaveLength(2);
    expect(screen.getByText('Building')).toBeInTheDocument();
    expect(screen.getAllByText('Live')).toHaveLength(2);
    expect(screen.getAllByText('just now')).toHaveLength(2);
    expect(screen.getAllByText('Blockchain')).toHaveLength(2);
    expect(screen.getByText('dApp')).toBeInTheDocument();
    // No test account rows appear.
    expect(screen.queryByText('CeruleaChain Mainnet')).toBeNull();
  });

  it('opens the Explorer for a published deployment and Studio for a project without one', async () => {
    stubFetch(200, filled);
    const opened = vi.fn();
    vi.stubGlobal('open', opened);
    render(<NetworksPage />);
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'View Land title registry' }));
    expect(opened).toHaveBeenLastCalledWith(`${window.location.origin}/explorer/private`, '_blank', 'noopener,noreferrer');
    await userEvent.click(screen.getByRole('button', { name: 'View Voting dApp' }));
    expect(opened).toHaveBeenLastCalledWith(`${window.location.origin}/explorer/public`, '_blank', 'noopener,noreferrer');
    await userEvent.click(screen.getByRole('button', { name: 'View Permit issuance' }));
    expect(opened).toHaveBeenLastCalledWith(`${window.location.origin}/govt?project=prj_permit`, '_blank', 'noopener,noreferrer');
  });

  it('shows the node Studio reads and the measured behaviour under the table', async () => {
    stubFetch(200, filled);
    render(<NetworksPage />);
    await waitFor(() => expect(screen.getByText('cerulea-node 0.1.0-local')).toBeInTheDocument());
    expect(screen.getByText('Epoch 0, round 13')).toBeInTheDocument();
    expect(screen.getByText('Set 1, 4 of 4 serving')).toBeInTheDocument();
    expect(screen.getByText('Agreement Healthy')).toBeInTheDocument();
    expect(screen.getByText('One validator missed its last turn.')).toBeInTheDocument();
    expect(screen.getByText(/We measured blocks 1 to 24 of Cerulea/)).toBeInTheDocument();
    expect(screen.getByText('0.60')).toBeInTheDocument();
    expect(screen.getByText(/Across 24 blocks carrying 48 transactions/)).toBeInTheDocument();
  });

  it('shows the production empty state with the chain card when no project exists', async () => {
    stubFetch(200, { ...filled, networks: [] });
    render(<NetworksPage />);
    await waitFor(() => expect(screen.getByText('No deployed networks yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Deploy the First Network' })).toBeInTheDocument();
    expect(screen.queryByText('LIVE NETWORKS')).toBeNull();
    expect(screen.getByText('cerulea-node 0.1.0-local')).toBeInTheDocument();
  });

  it('names the fix when the route fails', async () => {
    stubFetch(503, {
      error: 'The node did not answer. Start the node, then read again.',
      code: 'chain.unreachable',
      message: 'The node did not answer.',
      fix: 'Start the node, then read again.',
      details: {},
    });
    render(<NetworksPage />);
    await waitFor(() => expect(screen.getByText('The node did not answer.')).toBeInTheDocument());
    expect(screen.getByText('Start the node, then read again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read again' })).toBeInTheDocument();
  });
});
