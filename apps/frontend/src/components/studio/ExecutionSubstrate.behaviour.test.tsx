import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ExecutionSubstrate from './ExecutionSubstrate';

/**
 * Choosing where a system runs.
 *
 * The screen reads the build state, marks the held choice, and saves a new
 * choice with the reason beside it. These tests check the cards it shows, the
 * request it sends on save and the failures it names.
 */

type Call = { url: string; method: string; body: unknown };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const substrates = [
  {
    substrate: 'Native',
    name: 'Blueprint interpretation',
    summary: 'Cerulea reads the Blueprint directly.',
    suits: 'Records, rules and workflows.',
    cost: 'Nothing beyond the network.',
  },
  {
    substrate: 'WebAssembly',
    name: 'WebAssembly contracts',
    summary: 'Compiled contracts for unbounded computation.',
    suits: 'Heavy calculation.',
    cost: 'A review of every contract.',
  },
  {
    substrate: 'EthereumVirtualMachine',
    name: 'Ethereum Virtual Machine',
    summary: 'Bytecode for ecosystem interoperation.',
    suits: 'Existing contracts.',
    cost: 'An audit of the bytecode.',
  },
];

function view(substrate: string, reason: string) {
  return {
    projectId: 'p-1',
    buildState: { execution: { substrate, reason }, foundation: { projectName: 'Trace' } },
    rowVersion: 3,
    substrates,
  };
}

function stub(handler: (call: Call) => Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const call = {
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    return handler(call);
  });
  return calls;
}

function cardOf(name: string) {
  return screen.getByText(name).closest('.MuiCard-root') as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('where this system runs', { timeout: 30000 }, () => {
  it('reads the held choice and marks it chosen beside the default', async () => {
    const calls = stub(() => Promise.resolve(reply(200, view('WebAssembly', 'The model needs heavy maths.'))));
    render(<ExecutionSubstrate projectId="p 1" />);
    expect(screen.getByText('Cerulea is reading where this system runs.')).toBeInTheDocument();

    expect(await screen.findByText('Where this system runs')).toBeInTheDocument();
    expect(calls[0].url).toBe('/api/projects/p%201/build-state');
    expect(within(cardOf('WebAssembly contracts')).getByText('Chosen')).toBeInTheDocument();
    expect(within(cardOf('Blueprint interpretation')).getByText('Default')).toBeInTheDocument();
    expect(within(cardOf('Blueprint interpretation')).queryByText('Chosen')).toBeNull();
    expect(screen.getByText('Suits: Heavy calculation.')).toBeInTheDocument();
    expect(screen.getByText('What it costs: An audit of the bytecode.')).toBeInTheDocument();
    expect(screen.getByLabelText('Why this substrate')).toHaveValue('The model needs heavy maths.');
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('saves the picked card and the reason, then reads the state again', async () => {
    let saved = false;
    const calls = stub((call) => {
      if (call.method === 'PUT') {
        saved = true;
        return Promise.resolve(reply(200, { rowVersion: 4 }));
      }
      return Promise.resolve(
        reply(200, saved ? view('EthereumVirtualMachine', 'Partners hold contracts.') : view('Native', '')),
      );
    });
    render(<ExecutionSubstrate projectId="p-1" />);
    await screen.findByText('Where this system runs');

    await userEvent.click(within(cardOf('Ethereum Virtual Machine')).getByRole('button'));
    expect(within(cardOf('Ethereum Virtual Machine')).getByText('Chosen')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Why this substrate'), { target: { value: 'Partners hold contracts.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save the choice' }));

    expect(await screen.findByText('Cerulea saved the choice against this project.')).toBeInTheDocument();
    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.url).toBe('/api/projects/p-1/build-state');
    expect(put?.body).toEqual({
      buildState: {
        execution: { substrate: 'EthereumVirtualMachine', reason: 'Partners hold contracts.' },
        foundation: { projectName: 'Trace' },
      },
    });
    expect(calls.filter((call) => call.method === 'GET')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByText('Cerulea saved the choice against this project.')).toBeNull(),
    );
  });

  it('closes on the close button when the host offers one', async () => {
    stub(() => Promise.resolve(reply(200, view('Native', ''))));
    const onClose = vi.fn();
    render(<ExecutionSubstrate projectId="p-1" onClose={onClose} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the message and the fix a failed read named', async () => {
    stub(() =>
      Promise.resolve(
        reply(404, {
          error: { code: 'project.absent', message: 'Cerulea holds no such project.', fix: 'Open the project list.' },
        }),
      ),
    );
    render(<ExecutionSubstrate projectId="p-9" />);
    expect(await screen.findByText('Cerulea holds no such project. Open the project list.')).toBeInTheDocument();
    expect(screen.getByText('Open the project list.')).toBeInTheDocument();
    expect(document.querySelectorAll('.MuiCard-root')).toHaveLength(0);
  });

  it('offers the general fix when the read cannot reach Cerulea', async () => {
    stub(() => Promise.reject(new Error('offline')));
    render(<ExecutionSubstrate projectId="p-9" />);
    expect(await screen.findByText('offline')).toBeInTheDocument();
    expect(screen.getByText('Open this screen again in a moment.')).toBeInTheDocument();
  });

  it('does nothing on save when no state was read', async () => {
    const calls = stub(() => Promise.reject('down'));
    render(<ExecutionSubstrate projectId="p-9" />);
    expect(await screen.findByText('down')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save the choice' }));
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0);
  });

  it('names the fix Cerulea gave when the save is refused', async () => {
    stub((call) =>
      Promise.resolve(
        call.method === 'PUT'
          ? reply(409, {
              error: { code: 'state.stale', message: 'The build state moved on.', fix: 'Read the screen again.' },
            })
          : reply(200, view('Native', '')),
      ),
    );
    render(<ExecutionSubstrate projectId="p-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save the choice' }));
    expect(await screen.findByText('The build state moved on. Read the screen again.')).toBeInTheDocument();
    expect(screen.queryByText('Cerulea saved the choice against this project.')).toBeNull();
  });

  it('asks for a second save when the save cannot reach Cerulea', async () => {
    stub((call) =>
      call.method === 'PUT' ? Promise.reject(new Error('socket closed')) : Promise.resolve(reply(200, view('Native', ''))),
    );
    render(<ExecutionSubstrate projectId="p-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save the choice' }));
    expect(await screen.findByText('socket closed')).toBeInTheDocument();
    expect(screen.getByText('Save the choice again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save the choice' })).toBeEnabled();
  });
});
