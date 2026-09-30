import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AccountPanel from './page';

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

function refusal(message: string, fix: string): Reply {
  return { status: 409, body: { error: { code: 'request.refused', message, fix, details: {} } } };
}

const view = {
  account: {
    accountId: 'a-1',
    email: 'anita@cerulea.test',
    displayName: 'Anita Rao',
    state: 'active',
    multiFactorActive: true,
    createdAt: '2026-03-04T06:00:00.000Z',
  },
  sessions: [
    {
      sessionId: 's-1',
      device: 'Laptop browser',
      networkAddress: '10.0.0.4',
      issuedAt: '2026-09-19T06:00:00.000Z',
      expiresAt: '2026-09-20T06:00:00.000Z',
      rotationCount: 0,
      current: true,
    },
    {
      sessionId: 's 2',
      device: 'Phone browser',
      networkAddress: '',
      issuedAt: '2026-09-18T06:00:00.000Z',
      expiresAt: '2026-09-19T18:00:00.000Z',
      rotationCount: 1,
      current: false,
    },
  ],
  workspace: { workspaceId: 'w-1', name: 'Port authority', application: 'government', tier: 'standard' },
  members: [
    {
      memberId: 'm-1',
      email: 'anita@cerulea.test',
      displayName: 'Anita Rao',
      role: 'owner',
      state: 'active',
    },
    {
      memberId: 'm-2',
      email: 'ravi@cerulea.test',
      displayName: '',
      role: 'reviewer',
      state: 'invited',
    },
    {
      memberId: 'm-3',
      email: 'guest@cerulea.test',
      displayName: 'Guest',
      role: 'auditor',
      state: 'active',
    },
  ],
  roles: [
    { role: 'owner', capabilities: [] },
    { role: 'builder', capabilities: [] },
    { role: 'reviewer', capabilities: [] },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function reads(calls: Call[]): number {
  return calls.filter((call) => call.method === 'GET').length;
}

describe('the account and workspace screen', { timeout: 60000 }, () => {
  it('shows the account read from Cerulea APIs', async () => {
    const calls = serve(() => ({ body: view }));
    render(<AccountPanel />);
    expect(screen.getByText('Cerulea is reading the account and the workspace.')).toBeInTheDocument();
    await screen.findByText('anita@cerulea.test');
    expect(calls[0]).toMatchObject({ url: '/api/dashboard/settings', method: 'GET' });
    expect(screen.getAllByText('Anita Rao').length).toBeGreaterThan(0);
    expect(screen.getByText('Active', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(
      screen.getByText(new Date(view.account.createdAt).toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it('marks a second factor as waiting while none is active', async () => {
    serve(() => ({ body: { ...view, account: { ...view.account, multiFactorActive: false } } }));
    render(<AccountPanel />);
    expect(await screen.findByText('Waiting')).toBeInTheDocument();
  });

  it('lists each session and keeps the current one open', async () => {
    serve(() => ({ body: view }));
    render(<AccountPanel />);
    const current = (await screen.findByText('Laptop browser')).closest('tr') as HTMLElement;
    expect(within(current).getByText('This one')).toBeInTheDocument();
    expect(within(current).getByText('10.0.0.4')).toBeInTheDocument();
    expect(within(current).getByRole('button', { name: 'Close' })).toBeDisabled();

    const other = screen.getByText('Phone browser').closest('tr') as HTMLElement;
    expect(within(other).queryByText('This one')).toBeNull();
    expect(within(other).getByText('this machine')).toBeInTheDocument();
    expect(
      within(other).getByText(new Date('2026-09-19T18:00:00.000Z').toLocaleString()),
    ).toBeInTheDocument();
    expect(within(other).getByRole('button', { name: 'Close' })).toBeEnabled();
  });

  it('closes another session and reads the screen again', async () => {
    const person = userEvent.setup();
    const calls = serve(() => ({ body: view }));
    render(<AccountPanel />);
    const other = (await screen.findByText('Phone browser')).closest('tr') as HTMLElement;
    await person.click(within(other).getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(reads(calls)).toBe(2));
    const closing = calls.find((call) => call.method === 'DELETE');
    expect(closing?.url).toBe('/api/dashboard/settings?sessionId=s%202');
  });

  it('names the fix when closing a session fails', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'DELETE'
        ? refusal('The session already ended.', 'Read the sessions again.')
        : { body: view },
    );
    render(<AccountPanel />);
    const other = (await screen.findByText('Phone browser')).closest('tr') as HTMLElement;
    await person.click(within(other).getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('The session already ended.')).toBeInTheDocument();
    expect(screen.getByText('Read the sessions again.')).toBeInTheDocument();
  });

  it('describes the workspace and what each member role may do', async () => {
    serve(() => ({ body: view }));
    render(<AccountPanel />);
    expect(await screen.findByText('Port authority')).toBeInTheDocument();
    expect(screen.getByText('government application, standard plan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change the plan' })).toHaveAttribute('href', '/pricing');

    const owner = screen.getByText('owner', { selector: 'td' }).closest('tr') as HTMLElement;
    expect(
      within(owner).getByText('Holds the workspace, transfers ownership and closes the workspace.'),
    ).toBeInTheDocument();

    // A member without a display name appears by email address.
    const invited = screen.getByText('ravi@cerulea.test').closest('tr') as HTMLElement;
    expect(
      within(invited).getByText('Reads the work, the audit record and the billing figures.'),
    ).toBeInTheDocument();
    expect(within(invited).getByText('invited')).toBeInTheDocument();

    // A role outside the known list carries an empty meaning cell.
    const guest = screen.getByText('Guest').closest('tr') as HTMLElement;
    const cells = within(guest).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('auditor');
    expect(cells[2]).toHaveTextContent('');
  });

  it('sends an invitation with the chosen role and shows the guidance', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'POST'
        ? { body: { guidance: 'Cerulea sent the invitation to ravi@cerulea.test.' } }
        : { body: view },
    );
    render(<AccountPanel />);
    await screen.findByText('Port authority');

    const send = screen.getByRole('button', { name: 'Send the invitation' });
    expect(send).toBeDisabled();
    expect(
      screen.getByText('Builds projects, writes Blueprints, takes checkpoints and deploys.'),
    ).toBeInTheDocument();

    const address = screen.getByLabelText('Email address');
    await person.click(address);
    await person.paste('r@c');
    expect(send).toBeDisabled();
    await person.paste('erulea.test');
    expect(send).toBeEnabled();

    await person.click(screen.getByRole('combobox'));
    await person.click(await screen.findByRole('option', { name: 'reviewer' }));
    expect(
      screen.getByText('Reads the work, the audit record and the billing figures.', {
        selector: 'p',
      }),
    ).toBeInTheDocument();

    await person.click(send);
    expect(
      await screen.findByText('Cerulea sent the invitation to ravi@cerulea.test.'),
    ).toBeInTheDocument();
    const invitation = calls.find((call) => call.method === 'POST');
    expect(invitation).toMatchObject({
      url: '/api/dashboard/settings',
      body: { email: 'r@cerulea.test', role: 'reviewer' },
    });
    expect(address).toHaveValue('');
    await waitFor(() => expect(reads(calls)).toBe(2));

    const notice = screen
      .getByText('Cerulea sent the invitation to ravi@cerulea.test.')
      .closest('.MuiAlert-root') as HTMLElement;
    await person.click(within(notice).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByText('Cerulea sent the invitation to ravi@cerulea.test.')).toBeNull(),
    );
  });

  it('names the fix when the invitation is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'POST'
        ? refusal('That address already belongs to a member.', 'Choose another address.')
        : { body: view },
    );
    render(<AccountPanel />);
    await screen.findByText('Port authority');
    await person.click(screen.getByLabelText('Email address'));
    await person.paste('anita@cerulea.test');
    await person.click(screen.getByRole('button', { name: 'Send the invitation' }));

    expect(await screen.findByText('That address already belongs to a member.')).toBeInTheDocument();
    expect(screen.getByText('Choose another address.')).toBeInTheDocument();
    // The address stays in place so the person can correct it.
    expect(screen.getByLabelText('Email address')).toHaveValue('anita@cerulea.test');
    expect(screen.getByRole('button', { name: 'Send the invitation' })).toBeEnabled();
  });

  it('names the fix when the screen cannot be read and reads again on request', async () => {
    const person = userEvent.setup();
    let attempt = 0;
    const calls = serve(() => {
      attempt += 1;
      return attempt === 1
        ? refusal('Cerulea APIs did not answer.', 'Start Cerulea APIs, then read again.')
        : { body: view };
    });
    render(<AccountPanel />);
    expect(await screen.findByText('Start Cerulea APIs, then read again.')).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Read again' }));
    expect(await screen.findByText('Port authority')).toBeInTheDocument();
    expect(reads(calls)).toBe(2);
  });
});
