import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import NetworksPanel from './page';

function serve(body: unknown): string[] {
  const seen: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      seen.push(url);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return seen;
}

const strained = {
  network: {
    node: {
      systemName: 'cerulea-node',
      systemVersion: '0.2.1',
      chainName: 'Harbour private network',
      kind: 'live',
      peers: 0,
      isSyncing: true,
      shouldHavePeers: false,
      observedAt: '2026-09-19T07:45:00.000Z',
    },
    head: { number: 88, hash: '0xdef', producedAt: '2026-09-19T07:45:00.000Z' },
    finalizedBlock: 80,
    finalityLag: 8,
    epoch: 3,
    round: 14,
    validatorSetId: 5,
    activeValidators: 2,
    totalValidators: 5,
    consensusHealth: 'Degraded',
    healthy: false,
    issues: ['Three validators missed their last turn.', 'The irreversible height is falling behind.'],
  },
  measurement: {
    sampledBlocks: 12,
    meanBlockSeconds: 4.256,
    transactions: 37,
    transactionsPerSecond: 0.7246,
    firstBlock: 77,
    lastBlock: 88,
    measuredAt: '2026-09-19T07:45:00.000Z',
  },
  deployments: [
    {
      deploymentId: 'd-1',
      status: 'succeeded',
      projectId: 'p-1',
      projectName: 'Berth register',
      workspaceName: 'Port authority',
    },
    {
      deploymentId: 'd-2',
      status: 'in_progress',
      projectId: 'p-2',
      projectName: 'Pilot roster',
      workspaceName: 'Marine services',
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Networks panel under strain', { timeout: 30000 }, () => {
  it('flags the network and lists every open item the node reports', async () => {
    const seen = serve(strained);
    render(<NetworksPanel />);
    await screen.findByText('Harbour private network');
    expect(seen[0]).toBe('/api/dashboard/networks');
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Agreement Degraded')).toBeInTheDocument();
    expect(screen.getByText('Catching up')).toBeInTheDocument();
    expect(screen.getByText('Open items')).toBeInTheDocument();
    expect(screen.getByText('Three validators missed their last turn.')).toBeInTheDocument();
    expect(screen.getByText('The irreversible height is falling behind.')).toBeInTheDocument();
  });

  it('states the figures the node reported', async () => {
    serve(strained);
    render(<NetworksPanel />);
    await screen.findByText('Harbour private network');
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
    expect(
      screen.getByText('Blocks to this height cannot be undone. The newest block sits 8 above it.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This node runs alone by design, so a count of zero is expected.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Epoch 3, round 14')).toBeInTheDocument();
    expect(screen.getByText('Set 5')).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-09-19T07:45:00.000Z').toLocaleTimeString()),
    ).toBeInTheDocument();
    expect(screen.getByText('0.72')).toBeInTheDocument();
    expect(screen.getByText('4.26')).toBeInTheDocument();
    expect(screen.getByText('Across 12 blocks carrying 37 transactions.')).toBeInTheDocument();
  });

  it('lists each deployment with its state in plain words', async () => {
    serve(strained);
    render(<NetworksPanel />);
    await screen.findByText('Berth register');
    expect(screen.queryByText('No system is deployed yet')).toBeNull();

    const done = within(screen.getByText('Berth register').closest('tr') as HTMLElement);
    expect(done.getByText('Port authority')).toBeInTheDocument();
    expect(done.getByText('succeeded').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');

    const running = within(screen.getByText('Pilot roster').closest('tr') as HTMLElement);
    expect(running.getByText('Marine services')).toBeInTheDocument();
    expect(running.getByText('in progress').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });

  it('states a healthy node that joins peers in plain words', async () => {
    serve({
      ...strained,
      network: {
        ...strained.network,
        node: { ...strained.network.node, peers: 4, isSyncing: false, shouldHavePeers: true },
        healthy: true,
        consensusHealth: 'Healthy',
        issues: [],
      },
    });
    render(<NetworksPanel />);
    await screen.findByText('Serving');
    expect(screen.getByText('In step')).toBeInTheDocument();
    expect(
      screen.getByText('Other nodes this node is joined to. A count of zero isolates the node.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Open items')).toBeNull();
  });
});
