import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import GovernancePage from './page';

/**
 * The Governance screen.
 *
 * Each test serves the route reply and checks the class table, the per
 * project cards, the empty state and the failure.
 */

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

const classes = [
  { name: 'Routine', architectureThreshold: 51, mandatoryDelay: false, meaning: 'Everyday records.' },
  { name: 'Financial', architectureThreshold: 67, mandatoryDelay: false, meaning: 'Movements of value.' },
  { name: 'Structural', architectureThreshold: 80, mandatoryDelay: false, meaning: 'Changes to the shape.' },
  { name: 'Constitutional', architectureThreshold: 90, mandatoryDelay: true, meaning: 'Changes to the rules.' },
];

const view = {
  classes,
  projects: [
    {
      projectId: 'prj_land',
      projectName: 'Land title registry',
      workspaceName: 'Registry office',
      state: 'draft',
      version: 6,
      authority: ['Registrar', 'Auditor'],
      quorum: { routine: 51, financial: 67, structural: 80, constitutional: 95 },
      constitutionalDelayBlocks: 28800,
      changeProcess: 'The registrar records the change and the auditor reads it.',
      roleCount: 9,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Governance screen', { timeout: 60000 }, () => {
  it('shows the four transaction classes and the governance of each project', async () => {
    const seen = serve(view);
    render(<GovernancePage />);
    expect(screen.getByRole('status', { name: 'Reading the governance' })).toBeInTheDocument();
    await screen.findByText('Land title registry');
    expect(seen).toEqual(['/api/dashboard/governance']);
    expect(screen.getByText('ON-CHAIN GOVERNANCE')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();

    const table = within(screen.getByRole('table'));
    expect(table.getByText('51 percent')).toBeInTheDocument();
    expect(table.getByText('67 percent')).toBeInTheDocument();
    expect(table.getByText('80 percent')).toBeInTheDocument();
    expect(table.getByText('90 percent')).toBeInTheDocument();
    expect(table.getByText('Mandatory delay')).toBeInTheDocument();
    expect(table.getAllByText('None')).toHaveLength(3);

    const card = within(screen.getByTestId('governance-prj_land'));
    expect(card.getByText('Registrar')).toBeInTheDocument();
    expect(card.getByText('Auditor')).toBeInTheDocument();
    expect(card.getByText('The registrar records the change and the auditor reads it.')).toBeInTheDocument();
    expect(card.getByText('95 percent')).toBeInTheDocument();
    expect(card.getByText('Delay 28800 blocks, close to 1.0 days')).toBeInTheDocument();
    expect(card.getByText('Registry office, Blueprint version 6, 9 roles')).toBeInTheDocument();

    // The token wording of the earlier screen is gone.
    expect(screen.queryByText(/token/i)).toBeNull();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('shows the empty state with the class table when the account holds no project', async () => {
    serve({ classes, projects: [] });
    render(<GovernancePage />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a project in Studio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Overview' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('90 percent')).toBeInTheDocument();
  });

  it('names the failure and offers a retry', async () => {
    serve(
      { error: 'Cerulea APIs is unreachable. Start Cerulea APIs.', code: 'apis.unreachable', message: 'Cerulea APIs is unreachable.', fix: 'Start Cerulea APIs.', details: {} },
      503,
    );
    render(<GovernancePage />);
    expect(await screen.findByText('Cerulea APIs is unreachable. Start Cerulea APIs.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
