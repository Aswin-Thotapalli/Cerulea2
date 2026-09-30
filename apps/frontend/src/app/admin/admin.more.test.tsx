import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OperatorPlatformScreen from './page';
import OperatorAuditScreen from './audit/page';
import OperatorBlockchainScreen from './blockchain/page';

function serve(body: unknown, status = 200): string[] {
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

/** Reads a saved file back as text through the browser reader. */
function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Captures the file a screen hands the browser to save. */
function captureDownloads() {
  const saved: { blob: Blob; name: string }[] = [];
  let pending: Blob | null = null;
  const revoked: string[] = [];
  class AddressBook extends URL {
    static createObjectURL(blob: Blob): string {
      pending = blob;
      return 'blob:cerulea-platform';
    }

    static revokeObjectURL(address: string): void {
      revoked.push(address);
    }
  }
  vi.stubGlobal('URL', AddressBook);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({ blob: pending as Blob, name: this.download });
  });
  return { saved, revoked };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the operator platform screen', { timeout: 30000 }, () => {
  const strained = {
    platform: {
      mode: 'live',
      chainName: 'Cerulea public-access chain',
      chainKind: 'live',
      head: 9120,
      finalizedBlock: 9100,
      activeValidators: 5,
      totalValidators: 9,
      consensusHealth: 'Critical',
      healthy: false,
      issues: ['Four validators stopped answering.'],
      drivers: [{ integration: 'email', kind: 'live', ready: false, detail: 'relay refused the login' }],
      readAt: '2026-09-19T10:20:00.000Z',
    },
    counts: { openKeys: 14, auditEvents: 880, pendingExports: 2 },
  };

  it('flags the platform and lists the open items and waiting drivers', async () => {
    const seen = serve(strained);
    render(<OperatorPlatformScreen />);
    expect(screen.getByText('Cerulea is reading the platform.')).toBeInTheDocument();
    await screen.findByText('Cerulea public-access chain');
    expect(seen[0]).toBe('/api/admin/summary');
    expect(screen.getByText('live mode')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Agreement Critical')).toBeInTheDocument();
    expect(screen.getByText('9120')).toBeInTheDocument();
    expect(screen.getByText('9100')).toBeInTheDocument();
    expect(screen.getByText('5 of 9')).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-09-19T10:20:00.000Z').toLocaleTimeString()),
    ).toBeInTheDocument();
    expect(screen.getByText('Open items')).toBeInTheDocument();
    expect(screen.getByText('Four validators stopped answering.')).toBeInTheDocument();

    const driver = within(screen.getByText('relay refused the login').closest('tr') as HTMLElement);
    expect(driver.getByText('Waiting')).toBeInTheDocument();
  });

  it('explains each count and names an unknown count by its key', async () => {
    serve(strained);
    render(<OperatorPlatformScreen />);
    await screen.findByText('Access keys that still work.');
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('Changes recorded in the audit log.')).toBeInTheDocument();
    expect(screen.getByText('880')).toBeInTheDocument();
    expect(screen.getByText('pendingExports')).toBeInTheDocument();
  });

  it('leaves the open items out while the platform serves', async () => {
    serve({ ...strained, platform: { ...strained.platform, healthy: true, issues: [] } });
    render(<OperatorPlatformScreen />);
    await screen.findByText('Serving');
    expect(screen.queryByText('Open items')).toBeNull();
  });
});

const record = {
  events: [
    {
      eventId: 'e-1',
      action: 'workspaces.capability_refused',
      subjectType: 'workspace',
      outcome: 'denied',
      networkAddress: '10.0.0.9',
      accountEmail: 'builder@cerulea.test',
      occurredAt: '2026-09-19T06:00:00.000Z',
    },
    {
      eventId: 'e-2',
      action: 'project.created',
      subjectType: 'project',
      outcome: 'allowed',
      networkAddress: '10.0.0.9',
      accountEmail: 'owner@cerulea.test',
      occurredAt: '2026-09-19T05:00:00.000Z',
    },
    {
      eventId: 'e-3',
      action: 'key.revoked',
      subjectType: 'api_key',
      outcome: 'allowed',
      networkAddress: '',
      accountEmail: '',
      occurredAt: '2026-09-19T04:00:00.000Z',
    },
  ],
};

function whoIsListed(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent ?? '');
}

describe('the operator audit screen', { timeout: 60000 }, () => {
  it('shows every event with its subject and its outcome', async () => {
    const seen = serve(record);
    render(<OperatorAuditScreen />);
    await screen.findByText('Created on a project');
    expect(seen[0]).toBe('/api/admin/security');
    expect(whoIsListed()).toEqual(['builder@cerulea.test', 'owner@cerulea.test', 'Cerulea']);

    const refused = within(screen.getByText('builder@cerulea.test').closest('tr') as HTMLElement);
    expect(refused.getByText('workspace')).toBeInTheDocument();
    expect(refused.getByText('denied').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    const allowed = within(screen.getByText('owner@cerulea.test').closest('tr') as HTMLElement);
    expect(allowed.getByText('allowed').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
  });

  it('offers each recorded action once in order and narrows to the chosen one', async () => {
    const person = userEvent.setup();
    serve(record);
    render(<OperatorAuditScreen />);
    await screen.findByText('Created on a project');

    await person.click(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Every action',
      'Revoked on a key',
      'Created on a project',
      'Capability refused on a workspaces',
    ]);
    await person.click(within(list).getByRole('option', { name: 'Revoked on a key' }));
    await waitFor(() => expect(whoIsListed()).toEqual(['Cerulea']));
  });

  it('matches the search against the actor, the action and the subject', async () => {
    const person = userEvent.setup();
    serve(record);
    render(<OperatorAuditScreen />);
    await screen.findByText('Created on a project');
    const search = screen.getByLabelText('Search');

    await person.click(search);
    await person.paste(' OWNER@ ');
    expect(whoIsListed()).toEqual(['owner@cerulea.test']);

    await person.clear(search);
    await person.paste('api_key');
    expect(whoIsListed()).toEqual(['Cerulea']);

    await person.clear(search);
    await person.paste('nobody here');
    expect(screen.getByText('No event matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export the record' })).toBeDisabled();
  });

  it('exports the rows on screen as delimited text', async () => {
    const person = userEvent.setup();
    serve(record);
    const { saved, revoked } = captureDownloads();
    render(<OperatorAuditScreen />);
    await screen.findByText('Created on a project');
    await person.click(screen.getByLabelText('Search'));
    await person.paste('builder');
    await person.click(screen.getByRole('button', { name: 'Export the record' }));

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('cerulea-platform-audit.csv');
    expect(revoked).toEqual(['blob:cerulea-platform']);
    expect((await readText(saved[0].blob)).split('\n')).toEqual([
      'occurred_at,actor,action,subject_type,subject,outcome',
      '"2026-09-19T06:00:00.000Z","builder@cerulea.test","workspaces.capability_refused","workspace","e-1","denied"',
    ]);
  });

  it('keeps the export closed while the record is empty', async () => {
    serve({ events: [] });
    render(<OperatorAuditScreen />);
    expect(await screen.findByText('No event matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export the record' })).toBeDisabled();
  });
});

describe('the operator Blockchain screen', { timeout: 30000 }, () => {
  const account = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const nodes = {
    network: {
      node: {
        systemName: 'cerulea-node',
        systemVersion: '0.3.0',
        chainName: 'Harbour private network',
        kind: 'live',
        peers: 6,
        isSyncing: false,
        shouldHavePeers: true,
        observedAt: '2026-09-19T06:00:00.000Z',
      },
      head: { number: 5021, hash: '0xabc' },
      finalizedBlock: 5017,
      finalityLag: 4,
      epoch: 11,
      round: 3,
      validatorSetId: 7,
      activeValidators: 2,
      totalValidators: 2,
      consensusHealth: 'Degraded',
      healthy: false,
      issues: ['One validator trails by forty blocks.'],
    },
    validators: [
      {
        profile: { account, state: 'Active', authoredBlocks: 30, missedBlocks: 10 },
        trust: { total: 71, standing: 33, performance: 19, custody: 12, verification: 7 },
      },
      {
        profile: { account: 'short-name', state: 'Probation', authoredBlocks: 0, missedBlocks: 0 },
        trust: { total: 13, standing: 5, performance: 3, custody: 2, verification: 1 },
      },
    ],
  };

  it('states the node, the heights and the open items', async () => {
    const seen = serve(nodes);
    render(<OperatorBlockchainScreen />);
    expect(screen.getByText('Cerulea is reading the node and the validator set.')).toBeInTheDocument();
    await screen.findByText('cerulea-node 0.3.0');
    expect(seen[0]).toBe('/api/dashboard/nodes');
    expect(screen.getByText('Harbour private network')).toBeInTheDocument();
    expect(screen.getByText('live node')).toBeInTheDocument();
    expect(screen.getByText('Agreement Degraded').closest('.MuiChip-root')).toHaveClass(
      'MuiChip-colorWarning',
    );
    expect(screen.getByText('5021')).toBeInTheDocument();
    expect(screen.getByText('5017')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('11 and 7')).toBeInTheDocument();
    expect(screen.getByText('One validator trails by forty blocks.')).toBeInTheDocument();
  });

  it('lists each validator with its Trust Score parts and its share of turns', async () => {
    serve(nodes);
    render(<OperatorBlockchainScreen />);
    await screen.findByText('5GrwvaEF…utQY');

    const first = within(screen.getByText('5GrwvaEF…utQY').closest('tr') as HTMLElement);
    const cells = first.getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells).toEqual(['5GrwvaEF…utQY', 'Active', '71', '33', '19', '12', '7', '75%']);
    expect(first.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');

    // A validator with no turns yet counts as fully present.
    const second = within(screen.getByText('short-name').closest('tr') as HTMLElement);
    expect(second.getByText('Probation')).toBeInTheDocument();
    expect(second.getByText('100%')).toBeInTheDocument();
  });

  it('shows the whole validator address on hover', async () => {
    const person = userEvent.setup();
    serve(nodes);
    render(<OperatorBlockchainScreen />);
    await person.hover(await screen.findByText('5GrwvaEF…utQY'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(account);
  });

  it('states what to do while no validator answers and the network is healthy', async () => {
    serve({
      ...nodes,
      network: { ...nodes.network, healthy: true, consensusHealth: 'Healthy', issues: [] },
      validators: [],
    });
    render(<OperatorBlockchainScreen />);
    expect(await screen.findByText('No validator answers yet')).toBeInTheDocument();
    expect(screen.getByText('Agreement Healthy').closest('.MuiChip-root')).toHaveClass(
      'MuiChip-colorSuccess',
    );
    expect(screen.queryByText('Open items')).toBeNull();
  });

  it('names the fix when the node cannot be read', async () => {
    serve(
      {
        error: {
          code: 'node.unreachable',
          message: 'The node did not answer.',
          fix: 'Start the node, then read the screen again.',
          details: {},
        },
      },
      503,
    );
    render(<OperatorBlockchainScreen />);
    expect(await screen.findByText('Start the node, then read the screen again.')).toBeInTheDocument();
    expect(screen.getByText('The node did not answer.')).toBeInTheDocument();
  });
});
