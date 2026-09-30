import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import VersionsPanel from './page';

type Call = { url: string; method: string; body: unknown };
type Reply = { status?: number; body: unknown };

/** Answers each request from the handler and records what the screen sent. */
function serve(answer: (call: Call) => Reply): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const call: Call = {
        url,
        method: (init.method ?? 'GET').toUpperCase(),
        body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      };
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

const hashA = `a1b2c3d4e5f6${'0'.repeat(52)}`;
const hashB = `ffeeddccbbaa${'1'.repeat(52)}`;

const view = {
  projects: [
    {
      projectId: 'p-1',
      projectName: 'Berth register',
      workspaceName: 'Port authority',
      state: 'deployed',
      headVersion: 5,
      blueprintHash: hashB,
      counts: { collections: 3, actions: 2, workflows: 1, permissions: 4, rules: 6 },
      versions: [
        { blueprintId: 'bp-5', version: 5, blueprintHash: hashB, note: '', createdAt: '2026-09-19T08:00:00.000Z' },
        {
          blueprintId: 'bp-4',
          version: 4,
          blueprintHash: hashA,
          note: 'Added the tide feed',
          createdAt: '2026-09-18T08:00:00.000Z',
        },
      ],
      checkpoints: [
        { checkpointId: 'c-1', label: 'Before review', note: 'Board sign off', version: 4, createdAt: '2026-09-18T09:00:00.000Z' },
        { checkpointId: 'c-2', label: 'Launch', note: '', version: 5, createdAt: '2026-09-19T09:00:00.000Z' },
      ],
    },
    {
      projectId: 'p 2',
      projectName: 'Pilot roster',
      workspaceName: 'Marine services',
      state: 'draft',
      headVersion: 1,
      blueprintHash: hashA,
      counts: {},
      versions: [],
      checkpoints: [],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function cardOf(name: string): HTMLElement {
  return screen.getByText(name).closest('.MuiPaper-root') as HTMLElement;
}

describe('the Versions panel', { timeout: 60000 }, () => {
  it('states what to do while no project exists', async () => {
    const calls = serve(() => ({ body: { projects: [] } }));
    render(<VersionsPanel />);
    expect(screen.getByText('Cerulea is reading the version history.')).toBeInTheDocument();
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ url: '/api/dashboard/state', method: 'GET' });
  });

  it('shows each project with its counts, checkpoints and saves', async () => {
    serve(() => ({ body: view }));
    render(<VersionsPanel />);
    await screen.findByText('Berth register');
    const berth = within(cardOf('Berth register'));
    expect(berth.getByText('Port authority, version 5')).toBeInTheDocument();
    expect(berth.getByText('deployed')).toBeInTheDocument();
    expect(
      berth.getByText(
        'The Blueprint holds 3 collections, 2 actions, 1 workflows, 4 permission entries, 6 rules.',
      ),
    ).toBeInTheDocument();
    expect(berth.getByText('Before review')).toBeInTheDocument();
    expect(berth.getByText('Launch')).toBeInTheDocument();
    expect(berth.queryByText(/No checkpoint yet/)).toBeNull();

    const latest = within(berth.getByText('ffeeddccbbaa').closest('tr') as HTMLElement);
    expect(latest.getByText('5')).toBeInTheDocument();
    expect(latest.getByText('No note on this save')).toBeInTheDocument();
    expect(latest.getByText(new Date('2026-09-19T08:00:00.000Z').toLocaleString())).toBeInTheDocument();
    const earlier = within(berth.getByText('a1b2c3d4e5f6').closest('tr') as HTMLElement);
    expect(earlier.getByText('Added the tide feed')).toBeInTheDocument();

    const pilot = within(cardOf('Pilot roster'));
    expect(pilot.getByText(/No checkpoint yet/)).toBeInTheDocument();
    expect(
      pilot.getByText(
        'The Blueprint holds 0 collections, 0 actions, 0 workflows, 0 permission entries, 0 rules.',
      ),
    ).toBeInTheDocument();
  });

  it('names the note and version of a checkpoint on hover', async () => {
    const person = userEvent.setup();
    serve(() => ({ body: view }));
    render(<VersionsPanel />);
    await screen.findByText('Before review');
    await person.hover(screen.getByText('Before review'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Board sign off at version 4');
    await person.unhover(screen.getByText('Before review'));
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    await person.hover(screen.getByText('Launch'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('No note at version 5');
  });

  it('shows the whole content address on hover', async () => {
    const person = userEvent.setup();
    serve(() => ({ body: view }));
    render(<VersionsPanel />);
    await person.hover(await screen.findByText('a1b2c3d4e5f6'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(hashA);
  });

  it('takes a checkpoint of the chosen project and reads the history again', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'POST' ? { body: { checkpointId: 'c-9' } } : { body: view },
    );
    render(<VersionsPanel />);
    await screen.findByText('Pilot roster');
    await person.click(
      within(cardOf('Pilot roster')).getByRole('button', { name: 'Take a checkpoint' }),
    );
    const dialog = await screen.findByRole('dialog');
    const take = within(dialog).getByRole('button', { name: 'Take the checkpoint' });
    expect(take).toBeDisabled();

    await person.click(within(dialog).getByLabelText('Label'));
    await person.paste('R');
    expect(take).toBeDisabled();
    await person.paste('eview day');
    await person.click(within(dialog).getByLabelText('Note'));
    await person.paste('Everything the board read.');
    expect(take).toBeEnabled();
    await person.click(take);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls.find((call) => call.method === 'POST')).toMatchObject({
      url: '/api/dashboard/state',
      body: { projectId: 'p 2', label: 'Review day', note: 'Everything the board read.' },
    });
    await waitFor(() => expect(calls.filter((call) => call.method === 'GET')).toHaveLength(2));

    // The form starts empty for the next checkpoint.
    await person.click(
      within(cardOf('Berth register')).getByRole('button', { name: 'Take a checkpoint' }),
    );
    const again = await screen.findByRole('dialog');
    expect(within(again).getByLabelText('Label')).toHaveValue('');
    expect(within(again).getByLabelText('Note')).toHaveValue('');
    await person.click(within(again).getByRole('button', { name: 'Leave it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  it('names the fix and keeps the form open when the checkpoint is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'POST'
        ? {
            status: 409,
            body: {
              error: {
                code: 'checkpoint.label_taken',
                message: 'A checkpoint with that label exists.',
                fix: 'Choose another label.',
                details: {},
              },
            },
          }
        : { body: view },
    );
    render(<VersionsPanel />);
    await screen.findByText('Berth register');
    await person.click(
      within(cardOf('Berth register')).getByRole('button', { name: 'Take a checkpoint' }),
    );
    const dialog = await screen.findByRole('dialog');
    await person.click(within(dialog).getByLabelText('Label'));
    await person.paste('Launch');
    await person.click(within(dialog).getByRole('button', { name: 'Take the checkpoint' }));

    expect(await screen.findByText('A checkpoint with that label exists.')).toBeInTheDocument();
    expect(screen.getByText('Choose another label.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText('Label')).toHaveValue('Launch');
  });
});
