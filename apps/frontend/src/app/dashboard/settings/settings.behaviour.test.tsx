import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The account screen under the dashboard.
 *
 * Each test renders the screen against a stubbed fetch, so every figure on
 * the screen comes from the two Studio routes, and every control sends the
 * call the route expects.
 */

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { email: 'anita@cerulea.test', name: 'Anita Rao' } },
    status: 'authenticated',
    update: vi.fn(),
  }),
}));

import SettingsPage from './page';

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
  return {
    status: 409,
    body: { error: `${message} ${fix}`, code: 'request.refused', message, fix, details: {} },
  };
}

const profile = {
  user: {
    id: 'a-1',
    email: 'anita@cerulea.test',
    name: 'Anita Rao',
    createdAt: '2026-03-04T06:00:00.000Z',
    state: 'active',
    multiFactorActive: true,
    lastSignInAt: '2026-10-03T07:00:00.000Z',
  },
  profile: { displayName: null, avatarUrl: null, company: 'Port authority', role: 'Registrar' },
};

const view = {
  account: {
    accountId: 'a-1',
    email: 'anita@cerulea.test',
    displayName: 'Anita Rao',
    state: 'active',
    multiFactorActive: true,
    lastSignInAt: '2026-10-03T07:00:00.000Z',
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
  workspace: { workspaceId: 'w-1', name: 'Port authority', application: 'dapps', tier: 'private_dapps' },
  workspaces: [],
  members: [
    { memberId: 'm-1', email: 'anita@cerulea.test', displayName: 'Anita Rao', role: 'owner', state: 'active' },
    { memberId: 'm-2', email: 'ravi@cerulea.test', displayName: '', role: 'reviewer', state: 'invited' },
  ],
  roles: [
    { role: 'owner', capabilities: [] },
    { role: 'builder', capabilities: [] },
    { role: 'reviewer', capabilities: [] },
  ],
  plan: {
    division: 'dapp',
    tierId: 'private_dapps',
    label: 'Private Dapps',
    status: 'active',
    limits: { projects: 3, txPerMonth: 50000 },
    pricingPath: '/pricing?division=dapp',
  },
  projectCount: 2,
};

function answerReads(call: Call): Reply {
  if (call.url === '/api/profile') return { body: profile };
  if (call.url === '/api/dashboard/settings') return { body: view };
  return { status: 404, body: { error: `No answer for ${call.url}` } };
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

describe('the account screen', { timeout: 60000 }, () => {
  it('keeps the production header and fills the profile from Cerulea APIs', async () => {
    const calls = serve(answerReads);
    render(<SettingsPage />);
    expect(screen.getByText('ACCOUNT')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

    expect(await screen.findByLabelText('Full Name')).toHaveValue('Anita Rao');
    expect(screen.getByLabelText('Email Address')).toHaveValue('anita@cerulea.test');
    expect(screen.getByLabelText('Email Address')).toBeDisabled();
    expect(screen.getByLabelText('Company / Organisation')).toHaveValue('Port authority');
    expect(screen.getByDisplayValue('Registrar')).toBeInTheDocument();
    expect(calls.map((call) => call.url)).toEqual(
      expect.arrayContaining(['/api/profile', '/api/dashboard/settings']),
    );
  });

  it('saves the name, the company and the role through PUT /api/profile', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'PUT' ? { body: profile } : answerReads(call),
    );
    render(<SettingsPage />);
    const company = await screen.findByLabelText('Company / Organisation');
    await person.clear(company);
    await person.click(company);
    await person.paste('Harbour board');
    await person.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByRole('button', { name: 'Saved!' })).toBeInTheDocument();
    const saved = calls.find((call) => call.method === 'PUT');
    expect(saved).toMatchObject({
      url: '/api/profile',
      body: { name: 'Anita Rao', company: 'Harbour board', role: 'Registrar' },
    });
  });

  it('shows the one sentence failure when the save is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'PUT'
        ? refusal('The name holds fewer than two characters.', 'Supply a longer name.')
        : answerReads(call),
    );
    render(<SettingsPage />);
    await screen.findByLabelText('Full Name');
    await person.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(
      await screen.findByText('The name holds fewer than two characters. Supply a longer name.'),
    ).toBeInTheDocument();
  });

  it('updates the password through /api/auth/change-password once both new entries agree', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.url === '/api/auth/change-password' ? { body: { ok: true } } : answerReads(call),
    );
    render(<SettingsPage />);
    await screen.findByLabelText('Full Name');
    const update = screen.getByRole('button', { name: 'Update Password' });
    expect(update).toBeDisabled();

    await person.click(screen.getByLabelText('Current Password'));
    await person.paste('old phrase of words');
    await person.click(screen.getByLabelText('New Password'));
    await person.paste('new phrase of four words');
    await person.click(screen.getByLabelText('Confirm Password'));
    await person.paste('new phrase of four');
    expect(screen.getByText('The two passwords differ')).toBeInTheDocument();
    expect(update).toBeDisabled();
    await person.click(screen.getByLabelText('Confirm Password'));
    await person.paste(' words');
    expect(update).toBeEnabled();

    await person.click(update);
    expect(await screen.findByText('Password updated successfully.')).toBeInTheDocument();
    expect(calls.find((call) => call.url === '/api/auth/change-password')).toMatchObject({
      method: 'POST',
      body: { currentPassword: 'old phrase of words', newPassword: 'new phrase of four words' },
    });
    expect(screen.getByLabelText('New Password')).toHaveValue('');
  });

  it('names the fix when the password change is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.url === '/api/auth/change-password'
        ? refusal('The password fails the strength rules.', 'Choose a password of at least twelve characters.')
        : answerReads(call),
    );
    render(<SettingsPage />);
    await screen.findByLabelText('Full Name');
    await person.click(screen.getByLabelText('Current Password'));
    await person.paste('old phrase of words');
    await person.click(screen.getByLabelText('New Password'));
    await person.paste('short');
    await person.click(screen.getByLabelText('Confirm Password'));
    await person.paste('short');
    await person.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(
      await screen.findByText(
        'The password fails the strength rules. Choose a password of at least twelve characters.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the real second factor state with no switch', async () => {
    serve(answerReads);
    render(<SettingsPage />);
    expect(await screen.findByText('Enabled')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('marks a second factor awaiting activation', async () => {
    serve((call) =>
      call.url === '/api/dashboard/settings'
        ? { body: { ...view, account: { ...view.account, multiFactorActive: false } } }
        : answerReads(call),
    );
    render(<SettingsPage />);
    expect(await screen.findByText('Awaiting activation')).toBeInTheDocument();
  });

  it('lists the open sessions, marks this device and closes another one', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'DELETE' ? { body: { session: view.sessions[1] } } : answerReads(call),
    );
    render(<SettingsPage />);
    const current = (await screen.findByText('Laptop browser from 10.0.0.4')).closest('.MuiStack-root') as HTMLElement;
    expect(within(current).getByText('This device')).toBeInTheDocument();
    expect(within(current).queryByRole('button', { name: 'Close' })).toBeNull();

    const other = screen.getByText('Phone browser').closest('.MuiStack-root') as HTMLElement;
    expect(
      within(other).getByText(
        `Opened ${new Date('2026-09-18T06:00:00.000Z').toLocaleString()}, ends ${new Date('2026-09-19T18:00:00.000Z').toLocaleString()}`,
      ),
    ).toBeInTheDocument();
    await person.click(within(other).getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(calls.filter((call) => call.url === '/api/dashboard/settings' && call.method === 'GET')).toHaveLength(2),
    );
    expect(calls.find((call) => call.method === 'DELETE')?.url).toBe('/api/dashboard/sessions/s%202');
  });

  it('names the fix when closing a session is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'DELETE'
        ? refusal('The session already ended.', 'Read the sessions again.')
        : answerReads(call),
    );
    render(<SettingsPage />);
    await screen.findByText('Phone browser');
    await person.click(screen.getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('The session already ended. Read the sessions again.')).toBeInTheDocument();
  });

  it('keeps the developer cards for the keys and the reference and drops the rest', async () => {
    const person = userEvent.setup();
    serve(answerReads);
    render(<SettingsPage />);
    await screen.findByLabelText('Full Name');
    await person.click(screen.getByRole('button', { name: 'Manage Keys' }));
    expect(push).toHaveBeenCalledWith('/dashboard/keys');
    expect(screen.getByRole('link', { name: 'Open Docs' })).toHaveAttribute('href', '/docs/');
    expect(screen.queryByText('Webhook Secret')).toBeNull();
    expect(screen.queryByText(/npm install/)).toBeNull();
    expect(screen.queryByText('NOTIFICATIONS')).toBeNull();
    expect(screen.queryByText('DANGER ZONE')).toBeNull();
    expect(screen.queryByText('Delete Account')).toBeNull();
  });

  it('shows the real plan label and the projects meter against the entitlement limit', async () => {
    const person = userEvent.setup();
    serve(answerReads);
    render(<SettingsPage />);
    expect(await screen.findByTestId('plan-label')).toHaveTextContent('Private Dapps');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Billing History' }));
    expect(push).toHaveBeenCalledWith('/dashboard/billing');
    expect(screen.getByRole('link', { name: 'Contact Sales' })).toHaveAttribute(
      'href',
      'https://cerulea.io/company/contact-sales',
    );
  });

  it('shows the count alone when the plan holds no project limit', async () => {
    serve((call) =>
      call.url === '/api/dashboard/settings'
        ? { body: { ...view, plan: { ...view.plan, tierId: null, label: 'No plan', limits: {} } } }
        : answerReads(call),
    );
    render(<SettingsPage />);
    expect(await screen.findByTestId('plan-label')).toHaveTextContent('No plan');
    expect(screen.getByText('2, no limit on record')).toBeInTheDocument();
  });

  it('lists the workspace members and sends an invitation with the chosen role', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'POST'
        ? { status: 201, body: { guidance: 'Cerulea sent the invitation to r@cerulea.test.' } }
        : answerReads(call),
    );
    render(<SettingsPage />);
    const invited = (await screen.findByText('ravi@cerulea.test')).closest('tr') as HTMLElement;
    expect(within(invited).getByText('Reads the work, the audit record and the billing figures.')).toBeInTheDocument();
    expect(within(invited).getByText('invited')).toBeInTheDocument();

    const send = screen.getByRole('button', { name: 'Send the invitation' });
    expect(send).toBeDisabled();
    await person.click(screen.getByLabelText('Email address'));
    await person.paste('r@cerulea.test');
    expect(send).toBeEnabled();
    await person.click(screen.getByRole('combobox'));
    await person.click(await screen.findByRole('option', { name: 'reviewer' }));
    await person.click(send);

    expect(await screen.findByText('Cerulea sent the invitation to r@cerulea.test.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')).toMatchObject({
      url: '/api/dashboard/settings',
      body: { email: 'r@cerulea.test', role: 'reviewer', workspaceId: 'w-1' },
    });
  });

  it('names the fix and offers to read again when the account read fails', async () => {
    const person = userEvent.setup();
    let attempt = 0;
    serve((call) => {
      if (call.url !== '/api/dashboard/settings') return answerReads(call);
      attempt += 1;
      return attempt === 1
        ? refusal('Cerulea APIs did not answer.', 'Start Cerulea APIs, then read again.')
        : { body: view };
    });
    render(<SettingsPage />);
    expect(
      await screen.findByText('Cerulea APIs did not answer. Start Cerulea APIs, then read again.'),
    ).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Read again' }));
    expect(await screen.findByText('Phone browser')).toBeInTheDocument();
  });
});
