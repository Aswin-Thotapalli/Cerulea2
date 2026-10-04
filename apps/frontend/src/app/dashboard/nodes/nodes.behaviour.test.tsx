import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NodesPage from './page';

const network = {
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
  head: { number: 24 },
  finalizedBlock: 22,
  epoch: 0,
  activeValidators: 4,
  totalValidators: 4,
  consensusHealth: 'Healthy',
  healthy: true,
};

const validators = [
  {
    profile: { account: 'cerulea_validator_one_long_name', standingScore: 80, trustScore: 91, state: 'Active', authoredBlocks: 12, missedBlocks: 1 },
    trust: { total: 91, standing: 36, performance: 28, custody: 18, verification: 9 },
  },
  {
    profile: { account: 'cerulea_validator_two_long_name', standingScore: 40, trustScore: 55, state: 'Inactive', authoredBlocks: 2, missedBlocks: 5 },
    trust: { total: 55, standing: 20, performance: 15, custody: 12, verification: 8 },
  },
];

const nodes = [
  {
    nodeId: 'dep_live-land_title_registry_registrar_seat_1',
    deploymentId: 'dep_live',
    projectName: 'Land title registry',
    account: 'land_title_registry_registrar_seat_1',
    kind: 'in_process',
    state: 'running',
    systemName: 'cerulea-node',
    systemVersion: '0.1.0-local',
    chainName: 'Cerulea',
    height: 35,
    peers: 1,
    expectedPeers: 1,
    isSyncing: false,
    resources: { source: 'hosting_service', residentBytes: 136572928, processorSeconds: 217.421, uptimeSeconds: 71159.634 },
    startedAt: '2026-10-04T03:13:54.902Z',
    workspaceName: 'Registry office',
    region: 'hyderabad',
  },
  {
    nodeId: 'dep_live-land_title_registry_auditor_seat_2',
    deploymentId: 'dep_live',
    projectName: 'Land title registry',
    account: 'land_title_registry_auditor_seat_2',
    kind: 'process',
    state: 'stopped',
    systemName: null,
    systemVersion: null,
    chainName: null,
    height: null,
    peers: null,
    expectedPeers: 1,
    isSyncing: null,
    resources: { source: 'node_process', residentBytes: null, processorSeconds: null, uptimeSeconds: null },
    startedAt: null,
    workspaceName: 'Registry office',
    region: null,
  },
];

const filled = { network, validators, nodes, observedAt: '2026-10-04T03:13:56.000Z' };

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

describe('the Nodes screen', { timeout: 30000 }, () => {
  it('keeps the production header without the controls that had no action behind them', async () => {
    const seen = stubFetch(200, filled);
    render(<NodesPage />);
    expect(screen.getByText('INFRASTRUCTURE')).toBeInTheDocument();
    expect(screen.getByText('Nodes')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Land title registry')).toHaveLength(2));
    expect(seen[0]).toBe('/api/dashboard/nodes');
    expect(screen.queryByText('Provision Node')).toBeNull();
    expect(screen.queryByText('Rotate Keys')).toBeNull();
    expect(screen.queryByText('SSH')).toBeNull();
    expect(screen.queryByText('Rotate')).toBeNull();
    expect(screen.queryByText('ACTIONS')).toBeNull();
  });

  it('feeds the four stat cards from the real node, deployment node and validator states', async () => {
    stubFetch(200, filled);
    render(<NodesPage />);
    await waitFor(() => expect(screen.getByText('NODE ROSTER')).toBeInTheDocument());
    const card = (label: string) => screen.getByText(label).closest('.MuiPaper-root') as HTMLElement;
    // One node Studio reads, two deployment nodes, two validators.
    expect(card('TOTAL NODES').textContent).toContain('5');
    expect(card('ACTIVE').textContent).toContain('3');
    expect(card('DOWN / DEGRADED').textContent).toContain('2');
    // Validators: two deployment seats and two chain validators, two of them active.
    expect(card('FAULT TOLERANCE').textContent).toContain('50%');
    expect(screen.getByText('2/4 validators active')).toBeInTheDocument();
  });

  it('lists the production roster columns with real resource reads and unmeasured where none exists', async () => {
    stubFetch(200, filled);
    render(<NodesPage />);
    await waitFor(() => expect(screen.getByText('NODE ROSTER')).toBeInTheDocument());
    for (const header of ['NODE ID', 'NETWORK', 'ROLE', 'STATUS', 'REGION', 'CPU', 'MEMORY', 'UPTIME', 'TRUST SCORE']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
    // The node Studio reads.
    expect(screen.getByText('cerulea-node')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();
    // The running deployment node with the measured resources.
    expect(screen.getByText('land_title_registry_registrar_seat_1')).toBeInTheDocument();
    expect(screen.getByText('hyderabad')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('130 MB')).toBeInTheDocument();
    expect(screen.getByText('19 h 45 min')).toBeInTheDocument();
    // The stopped node and the validators carry no resource reading.
    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(screen.getAllByText('unmeasured').length).toBeGreaterThan(6);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getAllByText('Validator')).toHaveLength(4);
    // No test account rows appear.
    expect(screen.queryByText('node-val-01')).toBeNull();
  });

  it('shows the Trust Score of each validator with its four parts on hover', async () => {
    stubFetch(200, filled);
    render(<NodesPage />);
    await waitFor(() => expect(screen.getByText('91')).toBeInTheDocument());
    expect(screen.getByText('55')).toBeInTheDocument();
    await userEvent.hover(screen.getByText('91'));
    await waitFor(() =>
      expect(screen.getByText('Standing 36, performance 28, custody 18, verification 9')).toBeInTheDocument(),
    );
  });

  it('states that no deployment runs a node yet while still listing the node Studio reads', async () => {
    stubFetch(200, { ...filled, validators: [], nodes: [] });
    render(<NodesPage />);
    await waitFor(() => expect(screen.getByText('No deployment runs a node yet')).toBeInTheDocument());
    expect(screen.getByText(/Cerulea starts the nodes when we deploy a network/)).toBeInTheDocument();
    expect(screen.getByText('cerulea-node')).toBeInTheDocument();
    expect(screen.getByText('0/0 validators active')).toBeInTheDocument();
  });

  it('names the fix when the route fails', async () => {
    stubFetch(503, {
      error: 'The node did not answer. Start the node, then read again.',
      code: 'chain.unreachable',
      message: 'The node did not answer.',
      fix: 'Start the node, then read again.',
      details: {},
    });
    render(<NodesPage />);
    await waitFor(() => expect(screen.getByText('The node did not answer.')).toBeInTheDocument());
    expect(screen.getByText('Start the node, then read again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read again' })).toBeInTheDocument();
  });
});
