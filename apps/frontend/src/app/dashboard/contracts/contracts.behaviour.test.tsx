import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ExecutionPanel from './page';

type Call = { url: string; method: string };
type Reply = { status?: number; body: unknown };

/** Answers each request from the handler and records what the screen sent. */
function serve(answer: (call: Call) => Reply): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const call: Call = { url, method: (init.method ?? 'GET').toUpperCase() };
      calls.push(call);
      const reply = answer(call);
      return new Response(JSON.stringify(reply.body), {
        status: reply.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

const view = {
  projects: [
    {
      projectId: 'p 1',
      projectName: 'Berth register',
      workspaceName: 'Port authority',
      state: 'draft',
      substrate: 'Native',
      substrateName: 'Native interpretation',
      reason: '',
    },
    {
      projectId: 'p-2',
      projectName: 'Tariff engine',
      workspaceName: 'Port authority',
      state: 'deployed',
      substrate: 'WebAssembly',
      substrateName: 'WebAssembly',
      reason: 'The tariff model loops over every vessel class.',
    },
  ],
};

const buildState = {
  projectId: 'p 1',
  rowVersion: 3,
  buildState: { execution: { substrate: 'Native', reason: '' } },
  substrates: [
    {
      substrate: 'Native',
      name: 'Native interpretation',
      summary: 'Cerulea reads the Blueprint directly.',
      suits: 'Most systems.',
      cost: 'Nothing further.',
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function rowOf(name: string): HTMLElement {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('the execution panel', { timeout: 30000 }, () => {
  it('lists the execution substrate and the reason for each project', async () => {
    const calls = serve(() => ({ body: view }));
    render(<ExecutionPanel />);
    expect(
      screen.getByText('Cerulea is reading the substrate each project runs on.'),
    ).toBeInTheDocument();
    await screen.findByText('Berth register');
    expect(calls[0]).toEqual({ url: '/api/dashboard/execution', method: 'GET' });

    const native = within(rowOf('Berth register'));
    expect(native.getByText('Port authority')).toBeInTheDocument();
    expect(native.getByText('Native interpretation')).toBeInTheDocument();
    expect(native.getByText('Default')).toBeInTheDocument();
    expect(native.getByText('No reason written yet.')).toBeInTheDocument();

    const wasm = within(rowOf('Tariff engine'));
    expect(wasm.getByText('WebAssembly')).toBeInTheDocument();
    expect(wasm.queryByText('Default')).toBeNull();
    expect(wasm.getByText('The tariff model loops over every vessel class.')).toBeInTheDocument();
  });

  it('states what to do while no project exists', async () => {
    serve(() => ({ body: { projects: [] } }));
    render(<ExecutionPanel />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('names the fix when the substrates cannot be read', async () => {
    serve(() => ({
      status: 503,
      body: {
        error: {
          code: 'service.unreachable',
          message: 'Cerulea APIs did not answer.',
          fix: 'Start Cerulea APIs, then read the panel again.',
          details: {},
        },
      },
    }));
    render(<ExecutionPanel />);
    expect(
      await screen.findByText('Start Cerulea APIs, then read the panel again.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cerulea APIs did not answer.')).toBeInTheDocument();
  });

  it('opens the choice for one project and returns to a fresh list on close', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.url.includes('/build-state') ? { body: buildState } : { body: view },
    );
    render(<ExecutionPanel />);
    await screen.findByText('Berth register');
    await person.click(within(rowOf('Berth register')).getByRole('button', { name: 'Open the choice' }));

    expect(await screen.findByText('Where this system runs')).toBeInTheDocument();
    expect(screen.queryByText('Where each system runs')).toBeNull();
    expect(calls.some((call) => call.url === '/api/projects/p%201/build-state')).toBe(true);

    await person.click(screen.getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('Where each system runs')).toBeInTheDocument();
    await waitFor(() =>
      expect(calls.filter((call) => call.url === '/api/dashboard/execution')).toHaveLength(2),
    );
    expect(await screen.findByText('Tariff engine')).toBeInTheDocument();
  });
});
