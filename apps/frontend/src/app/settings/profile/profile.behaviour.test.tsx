import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The profile screen.
 *
 * Each test renders the screen against a stubbed fetch and a mocked session,
 * so every figure comes from the profile route and the sessions route, and
 * every control sends the call the route expects.
 */

const navigation = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
const session = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'loading' | 'unauthenticated',
  update: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, back: navigation.back, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: session.status === 'authenticated' ? { user: { email: 'anita@cerulea.test', name: 'Anita Rao' } } : null,
    status: session.status,
    update: session.update,
  }),
}));

import ProfilePage from './page';

type Call = { url: string; method: string; body: unknown };
type Reply = { status?: number; body: unknown };

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
  plan: {
    division: 'dapp',
    tierId: 'private_dapps',
    label: 'Private Dapps',
    status: 'active',
    limits: { projects: 3, txPerMonth: 50000 },
    specs: [
      { label: 'Validators', value: '3' },
      { label: 'Transactions / month', value: '50,000' },
    ],
    pricingPath: '/pricing?division=dapp',
  },
  workspace: { workspaceId: 'w-1', name: 'Shop chain', application: 'dapps' },
  projectCount: 2,
  usage: {
    from: '2026-09-04T00:00:00.000Z',
    to: '2026-10-04T00:00:00.000Z',
    totals: [
      { metric: 'transactions', unit: 'count', quantity: 156 },
      { metric: 'records_written', unit: 'count', quantity: 40 },
    ],
  },
  usageFix: null,
};

const sessions = { count: 3, sessions: [{ sessionId: 's-1' }, { sessionId: 's-2' }, { sessionId: 's-3' }] };

function answerReads(call: Call): Reply {
  if (call.url === '/api/profile') return { body: profile };
  if (call.url === '/api/dashboard/sessions') return { body: sessions };
  return { status: 404, body: { error: `No answer for ${call.url}` } };
}

const assign = vi.fn();

beforeEach(() => {
  session.status = 'authenticated';
  session.update.mockReset();
  navigation.push.mockReset();
  navigation.back.mockReset();
  assign.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the profile screen', { timeout: 60000 }, () => {
  it('shows the identity card, the account details and the plan from Cerulea APIs', async () => {
    const calls = serve(answerReads);
    render(<ProfilePage />);
    expect(await screen.findByRole('heading', { name: 'Anita Rao' })).toBeInTheDocument();
    expect(screen.getByText('AR')).toBeInTheDocument();
    expect(screen.getAllByText('anita@cerulea.test').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Private Dapps').length).toBeGreaterThan(0);
    expect(screen.getByText('Member since March 2026')).toBeInTheDocument();
    expect(screen.getByText('Port authority')).toBeInTheDocument();
    expect(screen.getByText('Registrar')).toBeInTheDocument();
    // The user id stays off the screen.
    expect(screen.queryByText('User ID')).toBeNull();
    expect(screen.queryByText('a-1')).toBeNull();
    expect(calls.map((call) => call.url)).toEqual(
      expect.arrayContaining(['/api/profile', '/api/dashboard/sessions']),
    );
  });

  it('keeps Back and signs out through the force sign out route', async () => {
    const person = userEvent.setup();
    serve(answerReads);
    render(<ProfilePage />);
    await screen.findByRole('heading', { name: 'Anita Rao' });
    await person.click(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.back).toHaveBeenCalled();
    await person.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(assign).toHaveBeenCalledWith('/api/auth/force-signout?next=/');
  });

  it('renames the account through PUT /api/auth/me and refreshes the session', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'PUT' ? { body: { id: 'a-1', email: 'anita@cerulea.test', name: 'Anita R' } } : answerReads(call),
    );
    render(<ProfilePage />);
    await screen.findByRole('heading', { name: 'Anita Rao' });
    await person.click(screen.getByRole('button', { name: 'Edit name' }));
    const field = screen.getByLabelText('Full name');
    await person.clear(field);
    await person.click(field);
    await person.paste('Anita R');
    await person.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Name updated successfully')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anita R' })).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PUT')).toMatchObject({
      url: '/api/auth/me',
      body: { name: 'Anita R' },
    });
    expect(session.update).toHaveBeenCalledWith({ name: 'Anita R' });
  });

  it('names the fix when the rename is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'PUT'
        ? refusal('The name holds fewer than two characters.', 'Supply a longer name.')
        : answerReads(call),
    );
    render(<ProfilePage />);
    await screen.findByRole('heading', { name: 'Anita Rao' });
    await person.click(screen.getByRole('button', { name: 'Edit name' }));
    await person.click(screen.getByRole('button', { name: 'Save name' }));
    expect(
      await screen.findByText('The name holds fewer than two characters. Supply a longer name.'),
    ).toBeInTheDocument();
    expect(session.update).not.toHaveBeenCalled();
  });

  it('shows the plan specs and the usage meters the read carries', async () => {
    const person = userEvent.setup();
    serve(answerReads);
    render(<ProfilePage />);
    expect(await screen.findByText('Private Dapps Plan')).toBeInTheDocument();
    expect(screen.getByText('Validators: 3')).toBeInTheDocument();
    expect(screen.getByText('Usage of Shop chain over the last thirty days.')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('156 / 50,000')).toBeInTheDocument();
    expect(screen.getByText('Records written')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.queryByText(/API calls/)).toBeNull();
    await person.click(screen.getByRole('button', { name: 'Upgrade Plan' }));
    expect(navigation.push).toHaveBeenCalledWith('/dashboard/billing');
  });

  it('states when no usage is recorded and shows the fix when the usage read is refused', async () => {
    serve((call) =>
      call.url === '/api/profile'
        ? { body: { ...profile, projectCount: null, usage: null, usageFix: 'Ask an administrator for the billing role.' } }
        : answerReads(call),
    );
    render(<ProfilePage />);
    expect(await screen.findByText('Ask an administrator for the billing role.')).toBeInTheDocument();
    expect(screen.getByText('No usage recorded in the last thirty days.')).toBeInTheDocument();
  });

  it('shows the real security rows and drops the notification, connected account and delete blocks', async () => {
    serve(answerReads);
    render(<ProfilePage />);
    await screen.findByRole('heading', { name: 'Anita Rao' });
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/dashboard/settings#password');
    const twoFactor = screen.getByText('Two-factor authentication').parentElement as HTMLElement;
    expect(within(twoFactor).getByText('Enabled')).toBeInTheDocument();
    expect(screen.queryByText('Enable 2FA')).toBeNull();
    expect(await screen.findByText('3 devices')).toBeInTheDocument();
    const lastSignIn = screen.getByText('Last sign in').parentElement as HTMLElement;
    expect(
      within(lastSignIn).getByText(new Date('2026-10-03T07:00:00.000Z').toLocaleString()),
    ).toBeInTheDocument();
    expect(screen.queryByText('Notification Preferences')).toBeNull();
    expect(screen.queryByText('Connected Accounts')).toBeNull();
    expect(screen.queryByText('Danger Zone')).toBeNull();
    expect(screen.queryByText('Delete account')).toBeNull();
  });

  it('closes every session through the revocations route and signs this browser out', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.url === '/api/dashboard/sessions/revocations'
        ? { body: { closed: 3, guidance: 'Every session on the account is closed.', signOutPath: '/api/auth/force-signout?next=/auth/login' } }
        : answerReads(call),
    );
    render(<ProfilePage />);
    await screen.findByText('3 devices');
    await person.click(screen.getByRole('button', { name: 'Sign out all' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/api/auth/force-signout?next=/auth/login'));
    expect(calls.find((call) => call.url === '/api/dashboard/sessions/revocations')?.method).toBe('POST');
  });

  it('names the fix and offers to read again when the profile read fails', async () => {
    const person = userEvent.setup();
    let attempt = 0;
    serve((call) => {
      if (call.url !== '/api/profile') return answerReads(call);
      attempt += 1;
      return attempt === 1
        ? refusal('Cerulea APIs did not answer.', 'Start Cerulea APIs, then read again.')
        : { body: profile };
    });
    render(<ProfilePage />);
    expect(
      await screen.findByText('Cerulea APIs did not answer. Start Cerulea APIs, then read again.'),
    ).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Read again' }));
    expect(await screen.findByText('Private Dapps Plan')).toBeInTheDocument();
  });

  it('sends a signed out visitor to the sign in screen', () => {
    session.status = 'unauthenticated';
    serve(answerReads);
    render(<ProfilePage />);
    expect(navigation.push).toHaveBeenCalledWith('/auth/login?next=/settings/profile');
  });
});
