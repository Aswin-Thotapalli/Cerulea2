import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import OverviewPanel from './page';
import NodesPanel from './nodes/page';
import AuditPanel from './audit/page';
import KeysPanel from './keys/page';
import VersionsPanel from './state/page';
import GovernancePanel from './governance/page';
import IntegrationsPanel from './integrations/page';
import ProjectsPanel from './projects/page';

function stubFetch(body: unknown, status = 200) {
  const seen: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    seen.push(url);
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Overview panel', () => {
  const overview = {
    account: { accountId: 'a', email: 'person@cerulea.test', displayName: 'Anita Rao' },
    counts: {
      workspaces: 1,
      projects: 2,
      projectsDeployed: 1,
      projectsInBuild: 1,
      blueprintVersions: 9,
      checkpoints: 2,
      deployments: 1,
      deploymentsRunning: 0,
      openKeys: 3,
    },
    chain: {
      chainName: 'Cerulea local',
      kind: 'local',
      head: 120,
      finalizedBlock: 118,
      activeValidators: 3,
      totalValidators: 3,
      consensusHealth: 'Healthy',
      healthy: true,
    },
    integrations: [{ integration: 'payments', kind: 'local', ready: true, detail: 'ready' }],
    attention: [
      { subject: 'A deployment stopped.', fix: 'Open the project and deploy again.' },
    ],
    recentProjects: [
      {
        projectId: 'p-1',
        name: 'Berth register',
        state: 'draft',
        headVersion: 4,
        updatedAt: '2026-09-19T06:00:00.000Z',
      },
    ],
    recentEvents: [
      {
        eventId: 'e-1',
        action: 'project.created',
        subjectType: 'project',
        outcome: 'allowed',
        occurredAt: '2026-09-19T06:00:00.000Z',
      },
    ],
  };

  it('counts the real work and names a fix beside every open item', async () => {
    const seen = stubFetch(overview);
    render(<OverviewPanel />);
    await waitFor(() => expect(screen.getByText(/Welcome back, Anita Rao/)).toBeInTheDocument());
    expect(seen[0]).toBe('/api/dashboard/overview');
    expect(screen.getByText('A deployment stopped.')).toBeInTheDocument();
    expect(screen.getByText('Open the project and deploy again.')).toBeInTheDocument();
    expect(screen.getByText('Berth register')).toBeInTheDocument();
    expect(screen.getByText('Created on a project')).toBeInTheDocument();
  });

  it('states what to do when no project exists yet', async () => {
    stubFetch({ ...overview, recentProjects: [], recentEvents: [] });
    render(<OverviewPanel />);
    await waitFor(() => expect(screen.getByText('No project yet')).toBeInTheDocument());
    expect(screen.getByText('Nothing recorded yet')).toBeInTheDocument();
  });
});

describe('the Nodes panel', () => {
  it('renders every validator with its Trust Score', async () => {
    stubFetch({
      network: {
        node: {
          systemName: 'cerulea-node',
          systemVersion: '0.1.0',
          chainName: 'Cerulea local',
          kind: 'local',
          peers: 2,
          isSyncing: false,
          shouldHavePeers: true,
          observedAt: '2026-09-19T06:00:00.000Z',
        },
        head: { number: 120 },
        finalizedBlock: 118,
        epoch: 4,
        activeValidators: 1,
        totalValidators: 1,
      },
      validators: [
        {
          profile: {
            account: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            stake: '1000',
            standingScore: 80,
            trustScore: 76,
            state: 'Active',
            authoredBlocks: 40,
            missedBlocks: 0,
          },
          trust: { total: 76, standing: 40, performance: 20, custody: 10, verification: 6 },
        },
      ],
    });
    render(<NodesPanel />);
    await waitFor(() => expect(screen.getByText('cerulea-node 0.1.0')).toBeInTheDocument());
    expect(screen.getByText('76')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('states what to do when no validator answers', async () => {
    stubFetch({
      network: {
        node: {
          systemName: 'cerulea-node',
          systemVersion: '0.1.0',
          chainName: 'Cerulea local',
          kind: 'local',
          peers: 0,
          isSyncing: false,
          shouldHavePeers: false,
          observedAt: '2026-09-19T06:00:00.000Z',
        },
        head: { number: 1 },
        finalizedBlock: 0,
        epoch: 0,
        activeValidators: 0,
        totalValidators: 0,
      },
      validators: [],
    });
    render(<NodesPanel />);
    await waitFor(() =>
      expect(screen.getByText('No validator answers yet')).toBeInTheDocument(),
    );
  });
});

describe('the Audit panel', () => {
  it('renders the record with the actor and the outcome', async () => {
    const seen = stubFetch({
      workspace: { workspaceId: 'w', name: 'Port authority' },
      events: [
        {
          eventId: 'e-1',
          actorEmail: 'person@cerulea.test',
          actorName: 'Anita Rao',
          action: 'key.revoked',
          subjectType: 'api_key',
          subjectId: 'k-1',
          outcome: 'allowed',
          networkAddress: '127.0.0.1',
          occurredAt: '2026-09-19T06:00:00.000Z',
        },
      ],
      total: 1,
      actions: ['key.revoked'],
      outcomes: ['allowed'],
    });
    render(<AuditPanel />);
    await waitFor(() => expect(screen.getByText('Anita Rao')).toBeInTheDocument());
    expect(seen[0]).toContain('/api/dashboard/audit?');
    expect(screen.getAllByText('Revoked on a key').length).toBeGreaterThan(0);
  });

  it('states what to do when nothing matches', async () => {
    stubFetch({
      workspace: { workspaceId: 'w', name: 'Port authority' },
      events: [],
      total: 0,
      actions: [],
      outcomes: [],
    });
    render(<AuditPanel />);
    await waitFor(() => expect(screen.getByText('No event matches')).toBeInTheDocument());
  });
});

describe('the Keys panel', () => {
  it('states what to do while the workspace holds no key', async () => {
    stubFetch({
      workspace: { workspaceId: 'w', name: 'Port authority' },
      keys: [],
      scopes: ['records.read'],
    });
    render(<KeysPanel />);
    await waitFor(() => expect(screen.getByText('No key yet')).toBeInTheDocument());
  });

  it('shows the opening of each key rather than the key itself', async () => {
    stubFetch({
      workspace: { workspaceId: 'w', name: 'Port authority' },
      keys: [
        {
          keyId: 'k-1',
          name: 'Berth reader',
          prefix: 'ck_abcdefg',
          scopes: ['records.read'],
          requestsPerMinute: 120,
          expiresAt: null,
          revokedAt: null,
          lastUsedAt: null,
          createdAt: '2026-09-19T06:00:00.000Z',
        },
      ],
      scopes: ['records.read'],
    });
    render(<KeysPanel />);
    await waitFor(() => expect(screen.getByText('Berth reader')).toBeInTheDocument());
    expect(screen.getByText('ck_abcdefg')).toBeInTheDocument();
    expect(screen.getByText('Not used yet')).toBeInTheDocument();
  });
});

describe('the Versions panel', () => {
  it('lists every save with its content address', async () => {
    stubFetch({
      projects: [
        {
          projectId: 'p-1',
          projectName: 'Berth register',
          workspaceName: 'Port authority',
          state: 'draft',
          headVersion: 2,
          blueprintHash: 'b'.repeat(64),
          counts: { collections: 2, actions: 1 },
          versions: [
            {
              blueprintId: 'bp-2',
              version: 2,
              blueprintHash: 'b'.repeat(64),
              note: 'Added the berth collection',
              createdAt: '2026-09-19T06:00:00.000Z',
            },
          ],
          checkpoints: [],
        },
      ],
    });
    render(<VersionsPanel />);
    await waitFor(() => expect(screen.getByText('Berth register')).toBeInTheDocument());
    expect(screen.getByText('Added the berth collection')).toBeInTheDocument();
    expect(screen.getByText('bbbbbbbbbbbb')).toBeInTheDocument();
    expect(
      screen.getByText(/2 collections, 1 actions, 0 workflows/),
    ).toBeInTheDocument();
  });
});

describe('the Governance panel', () => {
  it('states the share each transaction class needs', async () => {
    stubFetch({
      classes: [
        {
          name: 'Routine',
          architectureThreshold: 51,
          mandatoryDelay: false,
          meaning: 'Everyday records.',
        },
        {
          name: 'Constitutional',
          architectureThreshold: 90,
          mandatoryDelay: true,
          meaning: 'Changes to the rules.',
        },
      ],
      projects: [
        {
          projectId: 'p-1',
          projectName: 'Berth register',
          workspaceName: 'Port authority',
          state: 'draft',
          version: 2,
          authority: ['Owner'],
          quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 },
          constitutionalDelayBlocks: 28800,
          changeProcess: 'The owner proposes a change.',
          roleCount: 1,
        },
      ],
    });
    render(<GovernancePanel />);
    await waitFor(() => expect(screen.getByText('Berth register')).toBeInTheDocument());
    expect(screen.getByText('The owner proposes a change.')).toBeInTheDocument();
    expect(screen.getByText(/28800 blocks, close to/)).toBeInTheDocument();
  });
});

describe('the Integrations panel', () => {
  it('reports the platform drivers and what each system reaches', async () => {
    stubFetch({
      platform: {
        mode: 'local',
        ready: true,
        checkedAt: '2026-09-19T06:00:00.000Z',
        drivers: [{ integration: 'email', kind: 'local', ready: true, detail: 'inbox open' }],
      },
      projects: [
        {
          projectId: 'p-1',
          projectName: 'Berth register',
          workspaceName: 'Port authority',
          version: 2,
          feeds: [],
          bridges: [],
          triggers: [],
        },
      ],
    });
    render(<IntegrationsPanel />);
    await waitFor(() => expect(screen.getByText('inbox open')).toBeInTheDocument());
    expect(
      screen.getByText(/This system reaches nothing outside itself yet/),
    ).toBeInTheDocument();
  });
});

describe('the Projects panel', () => {
  it('lists every project across every workspace', async () => {
    stubFetch({
      projects: [
        {
          projectId: 'p-1',
          workspaceId: 'w-1',
          name: 'Berth register',
          slug: 'berth-register',
          summary: 'A register of berths.',
          state: 'draft',
          headVersion: 2,
          createdAt: '2026-09-19T06:00:00.000Z',
          updatedAt: '2026-09-19T06:00:00.000Z',
          workspaceName: 'Port authority',
          workspaceApplication: 'enterprise',
        },
      ],
      workspaces: [{ workspaceId: 'w-1', name: 'Port authority' }],
    });
    render(<ProjectsPanel />);
    await waitFor(() => expect(screen.getByText('Berth register')).toBeInTheDocument());
    expect(screen.getByText('A register of berths.')).toBeInTheDocument();
    expect(screen.getByText('Port authority')).toBeInTheDocument();
  });

  it('states what to do when no project exists', async () => {
    stubFetch({ projects: [], workspaces: [] });
    render(<ProjectsPanel />);
    await waitFor(() => expect(screen.getByText('No project yet')).toBeInTheDocument());
  });
});
