import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Dana Mehta', plan: 'plan_starter' } },
    status: 'authenticated',
  }),
}));

import DashboardPage from './page';

const filled = {
  chain: {
    chainName: 'Cerulea',
    kind: 'local',
    head: 24,
    finalizedBlock: 22,
    activeValidators: 4,
    totalValidators: 4,
    consensusHealth: 'Healthy',
    healthy: true,
  },
  integrations: [
    { integration: 'payments', kind: 'local', ready: true, detail: 'The local ledger holds 1 subscriptions and 1 invoices.' },
    { integration: 'email', kind: 'local', ready: false, detail: 'The mail directory is missing.' },
  ],
  attention: [{ subject: 'The deployment of Land title registry rolled back', fix: 'Deploy the version that last ran.' }],
  recentEvents: [
    { eventId: 'aud_1', action: 'workspace.created', subjectType: 'workspace', outcome: 'allowed', occurredAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { eventId: 'aud_2', action: 'keys.issued', subjectType: 'access_key', outcome: 'refused', occurredAt: new Date(Date.now() - 60 * 1000).toISOString() },
  ],
  projects: [
    {
      id: 'prj_land', name: 'Land title registry', slug: 'land-title-registry', status: 'active', state: 'deployed',
      projectType: 'blockchain', division: 'govt', workspaceName: 'Registry office',
      createdAt: '2026-09-30T15:55:21.041Z', updatedAt: '2026-10-03T07:27:55.363Z',
    },
    {
      id: 'prj_vote', name: 'Voting dApp', slug: 'voting-dapp', status: 'draft', state: 'draft',
      projectType: 'dapp', division: 'dapp', workspaceName: 'Market dApps',
      createdAt: '2026-09-30T15:55:21.041Z', updatedAt: '2026-10-02T07:27:55.363Z',
    },
  ],
  tiles: {
    projects: 2, live: 1, inBuild: 1, drafts: 1, chains: 1, dapps: 1,
    deployments: 5, deploymentsRunning: 0, requests: 0, servingDeployments: 1,
    requestsSince: '2026-10-03T07:28:20.241Z',
  },
};

const empty = {
  ...filled,
  attention: [],
  integrations: [],
  recentEvents: [],
  projects: [],
  tiles: { ...filled.tiles, projects: 0, live: 0, inBuild: 0, drafts: 0, chains: 0, dapps: 0, deployments: 0, requests: 0, servingDeployments: 0, requestsSince: null },
};

type Reply = { status: number; body: unknown };

function stubFetch(replies: Record<string, Reply | ((init?: RequestInit) => Reply)>) {
  const seen: { url: string; method: string }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    seen.push({ url, method: init?.method ?? 'GET' });
    const found = replies[url] ?? replies['*'];
    const reply = typeof found === 'function' ? found(init) : found;
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Overview screen', { timeout: 30000 }, () => {
  it('greets the account, names the plan and feeds the five tiles from the route', async () => {
    const seen = stubFetch({ '/api/dashboard/overview': { status: 200, body: filled } });
    render(<DashboardPage />);
    expect(screen.getByText(/Good (morning|afternoon|evening), Dana/)).toBeInTheDocument();
    expect(screen.getByText('PLAN_STARTER')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    expect(seen[0]).toEqual({ url: '/api/dashboard/overview', method: 'GET' });

    for (const label of ['Projects', 'Live', 'Drafts', 'Chains', 'RPC requests']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('1 live, 1 in build')).toBeInTheDocument();
    expect(screen.getByText('5 deployments, 0 in progress')).toBeInTheDocument();
    expect(screen.getByText('1 dApps')).toBeInTheDocument();
    expect(screen.getByText(/Served since 3 Oct/)).toBeInTheDocument();
    expect(screen.queryByText(/this month/)).toBeNull();
    expect(screen.queryByText(/uptime/)).toBeNull();
    expect(screen.queryByText(/vs yesterday/)).toBeNull();
  });

  it('lists the projects with slug, type and status, and searches on name and slug', async () => {
    stubFetch({ '/api/dashboard/overview': { status: 200, body: filled } });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('/land-title-registry')).toBeInTheDocument());
    expect(screen.getByText('Blockchain')).toBeInTheDocument();
    expect(screen.getByText('dApp')).toBeInTheDocument();
    expect(screen.getAllByText('Live').length).toBeGreaterThan(1);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search...'), 'voting');
    expect(screen.queryByText('Land title registry')).toBeNull();
    expect(screen.getByText('Voting dApp')).toBeInTheDocument();
  });

  it('opens a project in its division on the current origin in a new tab', async () => {
    stubFetch({ '/api/dashboard/overview': { status: 200, body: filled } });
    const opened = vi.fn();
    vi.stubGlobal('open', opened);
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Open Land title registry in Studio' }));
    expect(opened).toHaveBeenCalledWith(
      `${window.location.origin}/govt?project=prj_land`,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('closes a project through the trunk route after the confirm dialog', async () => {
    const seen = stubFetch({
      '/api/dashboard/overview': { status: 200, body: filled },
      '/api/projects/prj_vote': { status: 200, body: { ok: true } },
    });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Voting dApp')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Close Voting dApp' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Close Project')).toBeInTheDocument();
    expect(within(dialog).getByText(/Every saved Blueprint version stays readable/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(seen).toContainEqual({ url: '/api/projects/prj_vote', method: 'DELETE' }),
    );
    await waitFor(() => expect(screen.queryByText('Voting dApp')).toBeNull());
  });

  it('points every Quick Access shortcut at a real screen', async () => {
    stubFetch({ '/api/dashboard/overview': { status: 200, body: filled } });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Quick Access')).toBeInTheDocument());
    const links = Object.fromEntries(
      ['API Keys', 'Governance', 'Smart Contracts', 'Audit Logs'].map((label) => [
        label,
        screen.getByText(label).closest('a')?.getAttribute('href'),
      ]),
    );
    expect(links).toEqual({
      'API Keys': '/dashboard/keys',
      Governance: '/dashboard/governance',
      'Smart Contracts': '/dashboard/contracts',
      'Audit Logs': '/dashboard/audit',
    });
    expect(screen.getByRole('button', { name: 'New dApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Blockchain' })).toBeInTheDocument();
  });

  it('shows the real audit events in plain words with a relative time', async () => {
    stubFetch({ '/api/dashboard/overview': { status: 200, body: filled } });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Created on a workspace')).toBeInTheDocument());
    expect(screen.getByText('Issued on a keys')).toBeInTheDocument();
    expect(screen.getByText('2 h ago')).toBeInTheDocument();
    expect(screen.getByText('1 min ago')).toBeInTheDocument();
    expect(screen.getByText('Access key, refused')).toBeInTheDocument();
  });

  it('draws Platform Health from the chain and every driver, and lists the open items', async () => {
    stubFetch({ '/api/dashboard/overview': { status: 200, body: filled } });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Agreement Healthy')).toBeInTheDocument());
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Holding back')).toBeInTheDocument();
    const bars = screen.getAllByRole('progressbar');
    expect(bars.map((bar) => bar.getAttribute('aria-valuenow'))).toEqual(['100', '100', '0']);
    expect(screen.getByLabelText('A service needs attention')).toBeInTheDocument();
    expect(screen.getByText('The deployment of Land title registry rolled back')).toBeInTheDocument();
    expect(screen.getByText('Deploy the version that last ran.')).toBeInTheDocument();
  });

  it('shows the production empty state and the measured window when nothing is held', async () => {
    stubFetch({ '/api/dashboard/overview': { status: 200, body: empty } });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('No projects yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Open Studio' })).toBeInTheDocument();
    expect(screen.getByText('No deployment serves requests yet')).toBeInTheDocument();
    expect(screen.getByText('The audit record holds no event for this account yet.')).toBeInTheDocument();
  });

  it('names the fix when the route fails and reads again on request', async () => {
    let attempt = 0;
    stubFetch({
      '/api/dashboard/overview': () => {
        attempt += 1;
        return attempt === 1
          ? {
              status: 503,
              body: {
                error: 'Cerulea APIs did not answer. Start Cerulea APIs, then read again.',
                code: 'service.unreachable',
                message: 'Cerulea APIs did not answer.',
                fix: 'Start Cerulea APIs, then read again.',
                details: {},
              },
            }
          : { status: 200, body: filled };
      },
    });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Cerulea APIs did not answer.')).toBeInTheDocument());
    expect(screen.getByText('Start Cerulea APIs, then read again.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Read again' }));
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
  });
});
