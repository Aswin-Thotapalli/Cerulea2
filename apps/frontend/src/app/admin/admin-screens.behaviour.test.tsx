import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

/**
 * The operator screens, rendered over a stubbed Studio fetch and a mocked
 * operator session. Each screen is checked empty, filled and with one failure.
 * The frame is checked for the entries it lists, the chip it shows, the live
 * counts it reads and the search it runs.
 */

const navigation = vi.hoisted(() => ({
  pathname: '/admin',
  push: vi.fn(),
  search: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, replace: navigation.push, prefetch: vi.fn() }),
  useSearchParams: () => navigation.search,
}));

const sessionState = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'loading' | 'unauthenticated',
  isAdmin: true,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    status: sessionState.status,
    data:
      sessionState.status === 'authenticated'
        ? { user: { name: 'Opal Rao', email: 'operator@cerulea.test', isAdmin: sessionState.isAdmin, isOperator: sessionState.isAdmin } }
        : null,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import AdminLayout from './layout';
import AdminOverviewPage from './page';
import AdminUsersPage from './users/page';
import AdminProjectsPage from './projects/page';
import AdminBlockchainPage from './blockchain/page';
import AdminSecurityPage from './security/page';
import AdminAuditPage from './audit/page';

type Answer = { body: unknown; status?: number };

let requested: string[] = [];

/** Answers each Studio route by the start of its address and records every call. */
function stubFetch(byUrl: Record<string, Answer>) {
  requested = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const url = String(input);
      requested.push(url);
      const key = Object.keys(byUrl)
        .sort((a, b) => b.length - a.length)
        .find((entry) => url.startsWith(entry));
      const answer = key ? byUrl[key] : { body: { error: `No answer for ${url}.` }, status: 404 };
      return Promise.resolve(
        new Response(JSON.stringify(answer.body), {
          status: answer.status ?? 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }),
  );
}

const failure = {
  body: {
    error: 'The administration screens open for the Cerulea operator role. Ask the Cerulea operator to add this address.',
    code: 'operator.role_absent',
    message: 'The administration screens open for the Cerulea operator role.',
    fix: 'Ask the Cerulea operator to add this address.',
    details: {},
  },
  status: 403,
};

const platform = {
  mode: 'local',
  chainName: 'Cerulea local',
  chainKind: 'local',
  head: 300,
  finalizedBlock: 298,
  activeValidators: 3,
  totalValidators: 4,
  consensusHealth: 'Healthy',
  healthy: true,
  issues: [],
  drivers: [
    { integration: 'objects', kind: 'local', ready: true, detail: 'directory open' },
    { integration: 'mail', kind: 'local', ready: false, detail: 'outbox folder missing' },
  ],
  readAt: '2026-10-04T06:00:00.000Z',
};

const stats = {
  platform,
  counts: { accounts: 4, projects: 3, checkpoints: 5, openSubscriptions: 1, refusedActions: 6 },
  totalUsers: 4,
  totalProjects: 3,
  activeSubscriptions: 1,
  blockchainProjects: 1,
  dappProjects: 2,
  totalSnapshots: 5,
  mode: 'local',
  refusedActions: 6,
  openItems: [{ id: 'driver-mail', source: 'driver', message: 'mail driver (local): outbox folder missing' }],
};

const quietStats = {
  ...stats,
  platform: { ...platform, drivers: [platform.drivers[0]] },
  refusedActions: 0,
  openItems: [],
};

const users = {
  users: [
    { id: 'act_1', name: 'Demo', email: 'demo@cerulea.local', state: 'active', multiFactorActive: true, openSessions: 1, workspaceCount: 3, lastSignInAt: null, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'act_2', name: null, email: 'second@cerulea.local', state: 'active', multiFactorActive: false, openSessions: 0, workspaceCount: 0, lastSignInAt: null, createdAt: '2026-02-01T00:00:00.000Z' },
  ],
  total: 2,
  plansKnown: false,
  plans: [],
  counts: { accounts: 2, withSecondFactor: 1, paid: null },
};

const usersWithPlans = {
  users: [
    { ...users.users[0], plan: 'plan_starter', subStatus: 'active', projectCount: 2 },
    { ...users.users[1], plan: null, subStatus: null, projectCount: 0 },
  ],
  total: 2,
  plansKnown: true,
  plans: ['free', 'plan_starter'],
  counts: { accounts: 2, withSecondFactor: 1, paid: 1 },
};

const projects = {
  projects: [
    { id: 'prj_a', name: 'Ledger', projectType: 'dapp', status: 'active', state: 'deployed', deployments: 1, workspaceId: 'wsp_d', workspaceName: 'Dapps', ownerEmail: null, ownerName: null, createdAt: '2026-01-03T00:00:00.000Z', updatedAt: '2026-01-04T00:00:00.000Z' },
    { id: 'prj_c', name: 'Registry', projectType: 'blockchain', status: 'draft', state: 'draft', deployments: 0, workspaceId: 'wsp_e', workspaceName: 'Enterprise', ownerEmail: 'owner@cerulea.test', ownerName: 'Omar', createdAt: '2026-01-07T00:00:00.000Z', updatedAt: '2026-01-08T00:00:00.000Z' },
  ],
  total: 2,
  counts: { projects: 2, dapp: 1, blockchain: 1 },
  statuses: ['active', 'draft'],
};

const workspaces = {
  workspaces: [
    { workspaceId: 'wsp_d', name: 'Dapps', application: 'dapps', tier: 'plan_starter', state: 'active', members: 1, projects: 2, createdAt: '2026-01-01T00:00:00.000Z' },
  ],
};

const chain = {
  network: {
    node: { systemName: 'cerulea-node', systemVersion: '1.0.0', chainName: 'Cerulea local', kind: 'local', peers: 0 },
    head: { number: 300 },
    finalizedBlock: 298,
    activeValidators: 3,
    totalValidators: 4,
    consensusHealth: 'Healthy',
    healthy: true,
    issues: [],
  },
  measurement: { sampledBlocks: 20, meanBlockSeconds: 3, transactions: 30, transactionsPerSecond: 0.5, measuredAt: '2026-10-04T06:00:00.000Z' },
  validators: [
    { profile: { account: 'val_abcdefghijklmnop', state: 'Active', authoredBlocks: 9, missedBlocks: 1 }, trust: { total: 91, standing: 40, performance: 28, custody: 15, verification: 8 } },
  ],
};

const audit = {
  logs: [
    { id: 'e1', createdAt: '2026-10-04T05:00:00.000Z', actorEmail: 'demo@cerulea.local', actorType: 'user', action: 'account.signed_in', resource: 'account', status: 'success', outcome: 'allowed', ip: '127.0.0.1' },
    { id: 'e2', createdAt: '2026-10-04T04:00:00.000Z', actorEmail: null, actorType: 'system', action: 'account.sign_in_refused', resource: 'account', status: 'failure', outcome: 'denied', ip: null },
    { id: 'e3', createdAt: '2026-10-04T03:00:00.000Z', actorEmail: 'second@cerulea.local', actorType: 'user', action: 'account.registered', resource: 'account', status: 'success', outcome: 'allowed', ip: '10.0.0.2' },
  ],
  total: 3,
  areas: ['account', 'workspaces'],
  sessions: [
    { sessionId: 's1', accountId: 'act_1', device: 'Cerulea Studio', networkAddress: '127.0.0.1', issuedAt: '2026-10-04T05:00:00.000Z', expiresAt: '2026-10-04T06:00:00.000Z', revokedAt: null, rotationCount: 2 },
  ],
};

beforeEach(() => {
  navigation.pathname = '/admin';
  navigation.search = new URLSearchParams();
  navigation.push.mockReset();
  sessionState.status = 'authenticated';
  sessionState.isAdmin = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the administration frame', () => {
  it('lists the six entries with a screen under three sections and names the operator chip', async () => {
    stubFetch({ '/api/admin/stats': { body: stats } });
    render(<AdminLayout><div>screen body</div></AdminLayout>);
    const nav = screen.getByRole('navigation', { name: 'Operator sections' });
    for (const label of ['Overview', 'Users', 'Projects', 'Blockchain Ops', 'Security', 'Audit Logs']) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    for (const gone of ['Deployments', 'AI Monitor', 'Billing', 'Support', 'Config']) {
      expect(within(nav).queryByText(gone)).toBeNull();
    }
    expect(within(nav).getByText('Platform')).toBeInTheDocument();
    expect(within(nav).getByText('Infrastructure')).toBeInTheDocument();
    expect(within(nav).getByText('Operations')).toBeInTheDocument();
    expect(within(nav).queryByText('System')).toBeNull();
    expect(within(nav).getByText('CERULEA OPERATOR')).toBeInTheDocument();
    expect(within(nav).queryByText('SUPER ADMIN')).toBeNull();
    expect(screen.getByText('screen body')).toBeInTheDocument();
    expect(within(nav).getByText('Opal Rao')).toBeInTheDocument();
    expect(within(nav).getByText('operator@cerulea.test')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('shows the real mode, the refusal count and the open item count from the stats read', async () => {
    stubFetch({ '/api/admin/stats': { body: stats } });
    render(<AdminLayout><div /></AdminLayout>);
    await waitFor(() => expect(screen.getByTestId('mode-chip')).toHaveTextContent('LOCAL'));
    expect(screen.getByTestId('refusal-badge')).toHaveTextContent('6');
    const bell = screen.getByRole('button', { name: 'Open items' });
    expect(within(bell).getByText('1')).toBeInTheDocument();
    expect(requested).toContain('/api/admin/stats');
  });

  it('shows no badge and no bell count when the platform carries no refusal and no open item', async () => {
    stubFetch({ '/api/admin/stats': { body: { ...quietStats, mode: 'live' } } });
    render(<AdminLayout><div /></AdminLayout>);
    await waitFor(() => expect(screen.getByTestId('mode-chip')).toHaveTextContent('LIVE'));
    expect(screen.queryByTestId('refusal-badge')).toBeNull();
    const bell = screen.getByRole('button', { name: 'Open items' });
    expect(within(bell).queryByText('1')).toBeNull();
  });

  it('keeps the frame without a mode chip when the stats read fails', async () => {
    stubFetch({ '/api/admin/stats': failure });
    render(<AdminLayout><div>screen body</div></AdminLayout>);
    await waitFor(() => expect(requested).toContain('/api/admin/stats'));
    expect(screen.getByText('screen body')).toBeInTheDocument();
    expect(screen.queryByTestId('mode-chip')).toBeNull();
  });

  it('searches the loaded users and projects and opens the matching screen', async () => {
    stubFetch({
      '/api/admin/stats': { body: stats },
      '/api/admin/users': { body: users },
      '/api/admin/projects': { body: projects },
    });
    render(<AdminLayout><div /></AdminLayout>);
    const field = screen.getByRole('textbox', { name: 'Search users and projects' });
    fireEvent.change(field, { target: { value: 'reg' } });
    await waitFor(() => expect(screen.getByText('Registry')).toBeInTheDocument());
    expect(requested).toContain('/api/admin/users');
    expect(requested).toContain('/api/admin/projects');
    expect(screen.queryByText('Ledger')).toBeNull();
    fireEvent.click(screen.getByText('Registry'));
    expect(navigation.push).toHaveBeenCalledWith('/admin/projects?search=Registry');
    fireEvent.change(field, { target: { value: 'second' } });
    await waitFor(() => expect(screen.getAllByText('second@cerulea.local').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('second@cerulea.local')[0]);
    expect(navigation.push).toHaveBeenCalledWith('/admin/users?search=second%40cerulea.local');
    fireEvent.change(field, { target: { value: 'nothing here' } });
    await waitFor(() => expect(screen.getByText('No user or project matches.')).toBeInTheDocument());
  });

  it('renders nothing for an account without the operator role', () => {
    sessionState.isAdmin = false;
    stubFetch({});
    const { container } = render(<AdminLayout><div>screen body</div></AdminLayout>);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the Platform Overview', () => {
  it('shows the production cards over the real counts, the health list and the open alerts', async () => {
    stubFetch({ '/api/admin/stats': { body: stats } });
    render(<AdminOverviewPage />);
    expect(screen.getByText('Platform Overview')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('TOTAL USERS')).toBeInTheDocument());
    expect(screen.getByTestId('overview-mode-chip')).toHaveTextContent('LOCAL');
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1 with active plan')).toBeInTheDocument();
    expect(screen.getByText('2 dApp / 1 Chain')).toBeInTheDocument();
    expect(screen.getByText('SNAPSHOTS')).toBeInTheDocument();
    expect(screen.queryByText('AI CONVERSATIONS')).toBeNull();
    expect(screen.queryByText('API Requests (7d)')).toBeNull();
    expect(screen.getByText('2 / 3 Operational')).toBeInTheDocument();
    expect(screen.getByText('Cerulea local')).toBeInTheDocument();
    expect(screen.getByText('block 300, 3 of 4 validators')).toBeInTheDocument();
    expect(screen.getByText('mail driver')).toBeInTheDocument();
    expect(screen.getByText('1 open')).toBeInTheDocument();
    expect(screen.getByText('mail driver (local): outbox folder missing')).toBeInTheDocument();
  });

  it('shows the thread card once the count is present and the empty alert state when nothing is open', async () => {
    stubFetch({ '/api/admin/stats': { body: { ...quietStats, totalAiThreads: 12 } } });
    render(<AdminOverviewPage />);
    await waitFor(() => expect(screen.getByText('AI CONVERSATIONS')).toBeInTheDocument());
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2 / 2 Operational')).toBeInTheDocument();
    expect(screen.getByText('0 open')).toBeInTheDocument();
    expect(screen.getByText('No open alerts. The Blockchain and every driver answer as expected.')).toBeInTheDocument();
  });

  it('shows the Cerulea failure sentence when the read is refused', async () => {
    stubFetch({ '/api/admin/stats': failure });
    render(<AdminOverviewPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Ask the Cerulea operator to add this address.');
    expect(screen.queryByText('TOTAL USERS')).toBeNull();
  });
});

describe('the User Management screen', () => {
  it('lists every account with the second factor and hides the plan columns while the plan is unread', async () => {
    stubFetch({ '/api/admin/users': { body: users } });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('demo@cerulea.local')).toBeInTheDocument());
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('2 registered users across the Cerulea platform')).toBeInTheDocument();
    expect(screen.getByText('1 with second factor')).toBeInTheDocument();
    expect(screen.queryByText(/paid$/)).toBeNull();
    expect(screen.queryByText('PLAN')).toBeNull();
    expect(screen.queryByLabelText('Plan')).toBeNull();
    expect(screen.getByText('WORKSPACES')).toBeInTheDocument();
    expect(screen.getByText('SECOND FACTOR')).toBeInTheDocument();
    expect(screen.queryByText('ACTIONS')).toBeNull();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Absent')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('shows the plan filter, the plan columns and the paid chip once the rows carry a plan', async () => {
    stubFetch({ '/api/admin/users': { body: usersWithPlans } });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('PLAN')).toBeInTheDocument());
    expect(screen.getByText('1 paid')).toBeInTheDocument();
    expect(screen.getByText('SUB STATUS')).toBeInTheDocument();
    expect(screen.getByText('PROJECTS')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByLabelText('Plan')).toBeInTheDocument();
  });

  it('sends the search term to the route and reads the term the frame search passed', async () => {
    navigation.search = new URLSearchParams('search=second');
    stubFetch({ '/api/admin/users': { body: { ...users, users: [users.users[1]], total: 1 } } });
    render(<AdminUsersPage />);
    await waitFor(() => expect(requested[0]).toBe('/api/admin/users?search=second'));
    expect(screen.getByDisplayValue('second')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search name or email' }), { target: { value: 'demo' } });
    await waitFor(() => expect(requested).toContain('/api/admin/users?search=demo'));
  });

  it('shows the empty line and the failure sentence', async () => {
    stubFetch({ '/api/admin/users': { body: { ...users, users: [], total: 0 } } });
    const first = render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('No users found.')).toBeInTheDocument());
    first.unmount();
    stubFetch({ '/api/admin/users': failure });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('No users found.')).toBeNull();
  });
});

describe('the Project Management screen', () => {
  it('lists the projects with the owner or the workspace, the type chips and the workspaces table', async () => {
    stubFetch({ '/api/admin/projects': { body: projects }, '/api/admin/workspaces': { body: workspaces } });
    render(<AdminProjectsPage />);
    await waitFor(() => expect(screen.getByText('Ledger')).toBeInTheDocument());
    expect(screen.getByText('Project Management')).toBeInTheDocument();
    expect(screen.getByText('2 projects across all users')).toBeInTheDocument();
    expect(screen.getByText('1 dApps')).toBeInTheDocument();
    expect(screen.getByText('1 Chains')).toBeInTheDocument();
    expect(screen.getByText('Omar')).toBeInTheDocument();
    expect(screen.getByText('owner@cerulea.test')).toBeInTheDocument();
    expect(screen.getAllByText('workspace Dapps').length).toBeGreaterThan(0);
    expect(screen.getByText('prj_a')).toBeInTheDocument();
    expect(screen.queryByText('ACTIONS')).toBeNull();
    expect(screen.getByText('Workspaces')).toBeInTheDocument();
    expect(screen.getByText('wsp_d')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(requested).toContain('/api/admin/projects');
    expect(requested).toContain('/api/admin/workspaces');
  });

  it('sends the type and the status filters to the route', async () => {
    stubFetch({ '/api/admin/projects': { body: projects }, '/api/admin/workspaces': { body: workspaces } });
    render(<AdminProjectsPage />);
    await waitFor(() => expect(screen.getByText('Ledger')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByLabelText('Type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Blockchain' }));
    await waitFor(() => expect(requested).toContain('/api/admin/projects?type=blockchain'));
    fireEvent.mouseDown(screen.getByLabelText('Status'));
    fireEvent.click(await screen.findByRole('option', { name: 'Draft' }));
    await waitFor(() => expect(requested).toContain('/api/admin/projects?type=blockchain&status=draft'));
  });

  it('shows the empty lines and the failure sentence', async () => {
    stubFetch({
      '/api/admin/projects': { body: { ...projects, projects: [], total: 0, counts: { projects: 0, dapp: 0, blockchain: 0 }, statuses: [] } },
      '/api/admin/workspaces': { body: { workspaces: [] } },
    });
    const first = render(<AdminProjectsPage />);
    await waitFor(() => expect(screen.getByText('No projects found.')).toBeInTheDocument());
    expect(screen.getByText(/No workspace yet/)).toBeInTheDocument();
    first.unmount();
    stubFetch({ '/api/admin/projects': failure, '/api/admin/workspaces': failure });
    render(<AdminProjectsPage />);
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  });
});

describe('the Blockchain Projects screen', () => {
  it('fills a deployed card from the node and leaves a draft card awaiting deployment', async () => {
    const deployed = { ...projects.projects[1], id: 'prj_live', name: 'Land registry', status: 'active', state: 'deployed', deployments: 1 };
    stubFetch({
      '/api/admin/projects?type=blockchain': { body: { ...projects, projects: [deployed, projects.projects[1]] } },
      '/api/admin/chain': { body: chain },
    });
    render(<AdminBlockchainPage />);
    await waitFor(() => expect(screen.getAllByTestId('chain-card')).toHaveLength(2));
    expect(screen.getByText('Blockchain Projects')).toBeInTheDocument();
    const [live, draft] = screen.getAllByTestId('chain-card');
    expect(within(live).getByText('300')).toBeInTheDocument();
    expect(within(live).getByText('0.5')).toBeInTheDocument();
    expect(within(live).getByText('3 / 4')).toBeInTheDocument();
    expect(within(live).getByText('Healthy')).toBeInTheDocument();
    expect(within(draft).getAllByText('awaiting deployment')).toHaveLength(4);
    expect(screen.getByText('Validators on Cerulea local')).toBeInTheDocument();
    expect(screen.getByText('91')).toBeInTheDocument();
    expect(screen.getByText('val_abcd…mnop')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(requested).toContain('/api/admin/projects?type=blockchain');
    expect(requested).toContain('/api/admin/chain');
  });

  it('shows the production empty state and the validator empty line', async () => {
    stubFetch({
      '/api/admin/projects?type=blockchain': { body: { ...projects, projects: [], total: 0 } },
      '/api/admin/chain': { body: { ...chain, validators: [] } },
    });
    render(<AdminBlockchainPage />);
    await waitFor(() => expect(screen.getByText('No blockchain projects yet')).toBeInTheDocument());
    expect(screen.getByText(/No validator answers yet/)).toBeInTheDocument();
  });

  it('shows the failure sentence when the node read fails', async () => {
    stubFetch({
      '/api/admin/projects?type=blockchain': { body: projects },
      '/api/admin/chain': { body: { error: 'Cerulea APIs at http://127.0.0.1:4000 did not answer. Start Cerulea APIs.' }, status: 503 },
    });
    render(<AdminBlockchainPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Start Cerulea APIs.'));
    expect(screen.queryByText(/Validators on/)).toBeNull();
  });
});

describe('the Security & Auth Events screen', () => {
  it('counts the sign ins, the registrations and the failures and lists the sessions', async () => {
    stubFetch({ '/api/admin/audit': { body: audit } });
    render(<AdminSecurityPage />);
    await waitFor(() => expect(screen.getByText('account.signed_in')).toBeInTheDocument());
    expect(screen.getByText('Security & Auth Events')).toBeInTheDocument();
    expect(requested[0]).toBe('/api/admin/audit?action=auth.&limit=500&sessions=1');
    const cards = screen.getAllByTestId('security-card');
    expect(cards[0]).toHaveTextContent('TOTAL AUTH EVENTS3');
    expect(cards[1]).toHaveTextContent('LOGINS1');
    expect(cards[2]).toHaveTextContent('REGISTRATIONS1');
    expect(cards[3]).toHaveTextContent('FAILED EVENTS1');
    expect(screen.getByText('denied')).toBeInTheDocument();
    expect(screen.getByText('Cerulea Studio')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('narrows the table to the refusals', async () => {
    stubFetch({ '/api/admin/audit': { body: audit } });
    render(<AdminSecurityPage />);
    await waitFor(() => expect(screen.getByText('account.signed_in')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByLabelText('Show'));
    fireEvent.click(await screen.findByRole('option', { name: 'Refusals only' }));
    await waitFor(() => expect(screen.queryByText('account.signed_in')).toBeNull());
    expect(screen.getByText('account.sign_in_refused')).toBeInTheDocument();
    expect(screen.getByText('1 shown')).toBeInTheDocument();
  });

  it('shows the empty lines and the failure sentence', async () => {
    stubFetch({ '/api/admin/audit': { body: { logs: [], total: 0, areas: [], sessions: [] } } });
    const first = render(<AdminSecurityPage />);
    await waitFor(() => expect(screen.getByText(/No auth events yet/)).toBeInTheDocument());
    expect(screen.getByText(/No session yet/)).toBeInTheDocument();
    first.unmount();
    stubFetch({ '/api/admin/audit': failure });
    render(<AdminSecurityPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

describe('the Platform Audit Logs screen', () => {
  it('lists the production columns and sends the status and the action filters to the route', async () => {
    stubFetch({ '/api/admin/audit': { body: audit } });
    render(<AdminAuditPage />);
    await waitFor(() => expect(screen.getByText('account.signed_in')).toBeInTheDocument());
    expect(screen.getByText('Platform Audit Logs')).toBeInTheDocument();
    expect(requested[0]).toBe('/api/admin/audit?limit=500');
    for (const head of ['TIMESTAMP', 'ACTOR', 'TYPE', 'ACTION', 'RESOURCE', 'IP', 'STATUS']) {
      expect(screen.getByText(head)).toBeInTheDocument();
    }
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
    fireEvent.mouseDown(screen.getByLabelText('Status'));
    fireEvent.click(await screen.findByRole('option', { name: 'Failure' }));
    await waitFor(() => expect(requested).toContain('/api/admin/audit?limit=500&status=failure'));
    fireEvent.mouseDown(screen.getByLabelText('Action'));
    fireEvent.click(await screen.findByRole('option', { name: 'Workspaces' }));
    await waitFor(() => expect(requested).toContain('/api/admin/audit?limit=500&status=failure&action=workspaces.'));
  });

  it('searches the loaded rows on the screen', async () => {
    stubFetch({ '/api/admin/audit': { body: audit } });
    render(<AdminAuditPage />);
    await waitFor(() => expect(screen.getByText('account.registered')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: 'Search actor, action, resource' }), { target: { value: 'registered' } });
    expect(screen.getByText('1 entries')).toBeInTheDocument();
    expect(screen.queryByText('account.signed_in')).toBeNull();
  });

  it('shows the empty line and the failure sentence', async () => {
    stubFetch({ '/api/admin/audit': { body: { logs: [], total: 0, areas: [] } } });
    const first = render(<AdminAuditPage />);
    await waitFor(() => expect(screen.getByText(/No audit logs yet/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    first.unmount();
    stubFetch({ '/api/admin/audit': failure });
    render(<AdminAuditPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
