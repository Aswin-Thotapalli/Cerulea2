import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProjectsPanel from './page';

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

function project(overrides: Record<string, unknown>) {
  return {
    projectId: 'p-0',
    workspaceId: 'w-1',
    name: 'Unnamed',
    slug: 'unnamed',
    summary: '',
    state: 'draft',
    headVersion: 1,
    createdAt: '2026-09-01T06:00:00.000Z',
    updatedAt: '2026-09-19T06:00:00.000Z',
    workspaceName: 'Port authority',
    workspaceApplication: 'enterprise',
    ...overrides,
  };
}

const view = {
  projects: [
    project({ projectId: 'p-1', name: 'Berth register', summary: 'A register of berths.', state: 'deployed', headVersion: 9 }),
    project({ projectId: 'p-2', name: 'Pilot roster', state: 'building', headVersion: 3, workspaceName: 'Marine services' }),
    project({ projectId: 'p-3', name: 'Berth tariffs', state: 'closed', headVersion: 2 }),
    project({ projectId: 'p-4', name: 'Cargo manifest', state: 'archived', headVersion: 1 }),
  ],
  workspaces: [{ workspaceId: 'w-1', name: 'Port authority' }],
};

const readiness: Record<string, Reply> = {
  '/api/projects/p-1/readiness': {
    body: { remaining: 0, advisory: 1, ready: true, headline: 'Every check passes.' },
  },
  '/api/projects/p-2/readiness': {
    body: { remaining: 3, advisory: 0, ready: false, headline: 'Three checks remain.' },
  },
  '/api/projects/p-3/readiness': {
    status: 404,
    body: { error: { code: 'project.closed', message: 'Closed.', fix: 'Open it.', details: {} } },
  },
  '/api/projects/p-4/readiness': {
    body: { remaining: 1, advisory: 0, ready: false, headline: 'One check remains.' },
  },
};

/** The list, the readiness of each row and any change the test names. */
function standard(extra?: (call: Call) => Reply | undefined) {
  return serve((call) => {
    const special = extra?.(call);
    if (special) return special;
    if (call.url in readiness) return readiness[call.url];
    return { body: view };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function rowOf(name: string): HTMLElement {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

function listed(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].querySelector('p')?.textContent ?? '');
}

describe('the Projects panel', { timeout: 60000 }, () => {
  it('shows every project with its workspace, version, state and readiness', async () => {
    const calls = standard();
    render(<ProjectsPanel />);
    expect(screen.getByText('Cerulea is reading every project this account holds.')).toBeInTheDocument();
    await screen.findByText('Berth register');
    expect(calls[0]).toEqual({ url: '/api/projects', method: 'GET' });
    expect(listed()).toEqual(['Berth register', 'Pilot roster', 'Berth tariffs', 'Cargo manifest']);
    expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute('href', '/');

    const berth = within(rowOf('Berth register'));
    expect(berth.getByText('A register of berths.')).toBeInTheDocument();
    expect(berth.getByText('9')).toBeInTheDocument();
    expect(berth.getByText('deployed').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(await berth.findByText('Ready to deploy')).toBeInTheDocument();
    expect(berth.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/?project=p-1');
    expect(berth.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(berth.getByText(new Date('2026-09-19T06:00:00.000Z').toLocaleString())).toBeInTheDocument();

    const pilot = within(rowOf('Pilot roster'));
    expect(pilot.getByText('Marine services')).toBeInTheDocument();
    expect(pilot.getByText('No summary written yet.')).toBeInTheDocument();
    expect(pilot.getByText('building').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    expect(await pilot.findByText('3 remaining')).toBeInTheDocument();

    const closed = within(rowOf('Berth tariffs'));
    expect(closed.getByText('closed').closest('.MuiChip-root')).toHaveClass('MuiChip-colorInfo');
    expect(closed.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(await closed.findByText('Read it in the project')).toBeInTheDocument();

    // A state outside the known list takes the plain colour.
    const other = within(rowOf('Cargo manifest'));
    expect(other.getByText('archived').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });

  it('narrows the list by name and says so when nothing matches', async () => {
    const person = userEvent.setup();
    standard();
    render(<ProjectsPanel />);
    await screen.findByText('Berth register');
    await person.click(screen.getByLabelText('Search'));
    await person.paste('  BERTH ');
    expect(listed()).toEqual(['Berth register', 'Berth tariffs']);

    await person.paste('ing');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No project matches')).toBeInTheDocument();
  });

  it('narrows the list by state', async () => {
    const person = userEvent.setup();
    standard();
    render(<ProjectsPanel />);
    await screen.findByText('Berth register');
    await person.click(screen.getByRole('combobox'));
    await person.click(await screen.findByRole('option', { name: 'Building' }));
    await waitFor(() => expect(listed()).toEqual(['Pilot roster']));

    await person.click(screen.getByRole('combobox'));
    await person.click(await screen.findByRole('option', { name: 'Every state' }));
    await waitFor(() => expect(listed()).toHaveLength(4));
  });

  it('states what to do while the account holds no project', async () => {
    standard(() => ({ body: { projects: [], workspaces: [] } }));
    render(<ProjectsPanel />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start the first project' })).toHaveAttribute('href', '/');
  });

  it('closes a project after the person confirms and reads the list again', async () => {
    const person = userEvent.setup();
    const calls = standard((call) => (call.method === 'DELETE' ? { body: { closed: true } } : undefined));
    render(<ProjectsPanel />);
    await screen.findByText('Berth register');

    await person.click(within(rowOf('Berth register')).getByRole('button', { name: 'Close' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Close Berth register')).toBeInTheDocument();
    await person.click(within(dialog).getByRole('button', { name: 'Leave it open' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);

    await person.click(within(rowOf('Pilot roster')).getByRole('button', { name: 'Close' }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText('Close Pilot roster')).toBeInTheDocument();
    await person.click(within(confirm).getByRole('button', { name: 'Close the project' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls.find((call) => call.method === 'DELETE')?.url).toBe('/api/projects/p-2');
    await waitFor(() =>
      expect(calls.filter((call) => call.url === '/api/projects')).toHaveLength(2),
    );
  });

  it('names the fix and keeps the dialog open when closing is refused', async () => {
    const person = userEvent.setup();
    standard((call) =>
      call.method === 'DELETE'
        ? {
            status: 409,
            body: {
              error: {
                code: 'project.deploying',
                message: 'A deployment of this project is running.',
                fix: 'Wait for the deployment to finish, then close the project.',
                details: {},
              },
            },
          }
        : undefined,
    );
    render(<ProjectsPanel />);
    await screen.findByText('Berth register');
    await person.click(within(rowOf('Berth register')).getByRole('button', { name: 'Close' }));
    await person.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close the project' }),
    );

    expect(await screen.findByText('A deployment of this project is running.')).toBeInTheDocument();
    expect(
      screen.getByText('Wait for the deployment to finish, then close the project.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close the project' })).toBeEnabled();
  });
});
