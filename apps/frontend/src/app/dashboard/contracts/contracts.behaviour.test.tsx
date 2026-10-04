import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ContractsPage from './page';

/**
 * The Smart Contracts screen.
 *
 * Each test serves the execution route reply and checks the picker, the
 * three substrate cards, the empty state and the failure.
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

const substrates = [
  { substrate: 'Native', name: 'Native interpretation', summary: 'Cerulea reads the Blueprint directly.', suits: 'Nearly every system.', cost: 'Computation stays bounded.' },
  { substrate: 'WebAssembly', name: 'WebAssembly', summary: 'A compiled module runs beside the Blueprint.', suits: 'Heavy computation.', cost: 'The module is written outside Studio.' },
  { substrate: 'EthereumVirtualMachine', name: 'Ethereum Virtual Machine', summary: 'Bytecode runs beside the Blueprint.', suits: 'Joining an existing ecosystem.', cost: 'Execution follows the rules of that machine.' },
];

const view = {
  substrates,
  projects: [
    { projectId: 'prj_land', projectName: 'Land title registry', workspaceName: 'Registry office', state: 'draft', substrate: 'Native', substrateName: 'Native interpretation', reason: 'The register needs no computation the Blueprint cannot express.' },
    { projectId: 'prj_pool', projectName: 'Liquidity pool', workspaceName: 'Registry office', state: 'building', substrate: 'EthereumVirtualMachine', substrateName: 'Ethereum Virtual Machine', reason: 'The pool reuses audited ecosystem code.' },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Smart Contracts screen', { timeout: 60000 }, () => {
  it('shows the three substrates for the first project and marks the one it runs on', async () => {
    const seen = serve(view);
    render(<ContractsPage />);
    expect(screen.getByRole('status', { name: 'Reading the projects' })).toBeInTheDocument();
    await screen.findByText('Native interpretation');
    expect(seen).toEqual(['/api/dashboard/execution']);
    expect(screen.getByText('Smart Contracts')).toBeInTheDocument();

    const native = within(screen.getByTestId('substrate-Native'));
    expect(native.getByText('Runs here')).toBeInTheDocument();
    expect(native.getByText('Default')).toBeInTheDocument();
    expect(native.getByText('The register needs no computation the Blueprint cannot express.')).toBeInTheDocument();
    expect(native.getByText('Nearly every system.')).toBeInTheDocument();

    const evm = within(screen.getByTestId('substrate-EthereumVirtualMachine'));
    expect(evm.getByText('Available')).toBeInTheDocument();
    expect(evm.queryByText(/WHY THIS PROJECT RUNS HERE/)).toBeNull();
  });

  it('changes the cards when the person picks another project', async () => {
    const person = userEvent.setup();
    serve(view);
    render(<ContractsPage />);
    await screen.findByText('Native interpretation');
    await person.click(screen.getByLabelText('Project'));
    await person.click(await screen.findByRole('option', { name: /Liquidity pool/ }));
    const evm = within(screen.getByTestId('substrate-EthereumVirtualMachine'));
    expect(await evm.findByText('Runs here')).toBeInTheDocument();
    expect(evm.getByText('The pool reuses audited ecosystem code.')).toBeInTheDocument();
    expect(within(screen.getByTestId('substrate-Native')).getByText('Available')).toBeInTheDocument();
  });

  it('shows the empty state naming the Deploy & UI step when the account holds no project', async () => {
    serve({ substrates, projects: [] });
    render(<ContractsPage />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
    expect(screen.getByText('The execution substrate of a project is recorded when it reaches the Deploy & UI step in Studio.')).toBeInTheDocument();
    expect(screen.getByText('No projects found. Create one in the Studio.')).toBeInTheDocument();
  });

  it('names the failure and offers a retry', async () => {
    serve(
      { error: 'Cerulea APIs is unreachable. Start Cerulea APIs.', code: 'apis.unreachable', message: 'Cerulea APIs is unreachable.', fix: 'Start Cerulea APIs.', details: {} },
      503,
    );
    render(<ContractsPage />);
    expect(await screen.findByText('Cerulea APIs is unreachable. Start Cerulea APIs.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
