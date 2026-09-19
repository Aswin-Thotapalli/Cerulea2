import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import NetworksPanel from './page';

const view = {
  network: {
    node: {
      systemName: 'cerulea-node',
      systemVersion: '0.1.0',
      chainName: 'Cerulea local',
      kind: 'local',
      peers: 2,
      isSyncing: false,
      shouldHavePeers: true,
      observedAt: '2026-09-19T06:00:00.000Z',
    },
    head: { number: 412, hash: '0xabc', producedAt: '2026-09-19T06:00:00.000Z' },
    finalizedBlock: 409,
    finalityLag: 3,
    epoch: 7,
    round: 412,
    validatorSetId: 2,
    activeValidators: 3,
    totalValidators: 4,
    consensusHealth: 'Healthy',
    healthy: true,
    issues: [],
  },
  measurement: {
    sampledBlocks: 20,
    meanBlockSeconds: 1.5,
    transactions: 60,
    transactionsPerSecond: 2,
    firstBlock: 393,
    lastBlock: 412,
    measuredAt: '2026-09-19T06:00:00.000Z',
  },
  deployments: [] as unknown[],
};

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Networks panel', () => {
  it('reads the Blockchain and states the height it found', async () => {
    stubFetch(200, view);
    render(<NetworksPanel />);
    await waitFor(() => expect(screen.getByText('412')).toBeInTheDocument());
    expect(screen.getByText('409')).toBeInTheDocument();
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
    expect(screen.getByText('cerulea-node 0.1.0')).toBeInTheDocument();
  });

  it('states the blocks every measured figure came from', async () => {
    stubFetch(200, view);
    render(<NetworksPanel />);
    await waitFor(() =>
      expect(screen.getByText(/We measured blocks 393 to 412/)).toBeInTheDocument(),
    );
    expect(screen.getByText('2.00')).toBeInTheDocument();
    expect(screen.getByText('1.50')).toBeInTheDocument();
  });

  it('states what to do while no system is deployed', async () => {
    stubFetch(200, view);
    render(<NetworksPanel />);
    await waitFor(() =>
      expect(screen.getByText('No system is deployed yet')).toBeInTheDocument(),
    );
  });

  it('names the fix when the node did not answer', async () => {
    stubFetch(503, {
      error: {
        code: 'service.unreachable',
        message: 'Cerulea APIs did not answer.',
        fix: 'Start Cerulea APIs, then read the panel again.',
        details: {},
      },
    });
    render(<NetworksPanel />);
    await waitFor(() =>
      expect(screen.getByText('Start Cerulea APIs, then read the panel again.')).toBeInTheDocument(),
    );
  });
});
