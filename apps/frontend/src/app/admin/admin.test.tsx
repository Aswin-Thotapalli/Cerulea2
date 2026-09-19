import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import OperatorPlatformScreen from './page';
import OperatorAccountsScreen from './users/page';
import OperatorWorkspacesScreen from './projects/page';
import OperatorSecurityScreen from './security/page';
import OperatorAuditScreen from './audit/page';

function stubFetch(byUrl: Record<string, unknown>, status = 200) {
  vi.stubGlobal('fetch', (url: string) => {
    const key = Object.keys(byUrl).find((entry) => url.startsWith(entry));
    return Promise.resolve(
      new Response(JSON.stringify(key ? byUrl[key] : {}), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const summary = {
  platform: {
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
    drivers: [{ integration: 'objects', kind: 'local', ready: true, detail: 'directory open' }],
    readAt: '2026-09-19T06:00:00.000Z',
  },
  counts: { accounts: 4, workspaces: 2, projects: 3, refusedActions: 1 },
};

const securityRecord = {
  events: [
    {
      eventId: 'e-1',
      action: 'workspaces.capability_refused',
      subjectType: 'workspace',
      outcome: 'denied',
      networkAddress: '127.0.0.1',
      accountEmail: 'builder@cerulea.test',
      occurredAt: '2026-09-19T06:00:00.000Z',
    },
    {
      eventId: 'e-2',
      action: 'project.created',
      subjectType: 'project',
      outcome: 'allowed',
      networkAddress: '127.0.0.1',
      accountEmail: 'builder@cerulea.test',
      occurredAt: '2026-09-19T05:00:00.000Z',
    },
  ],
  sessions: [
    {
      sessionId: 's-1',
      accountId: 'a-1',
      device: 'Cerulea Studio',
      networkAddress: '127.0.0.1',
      issuedAt: '2026-09-19T05:00:00.000Z',
      expiresAt: '2026-09-19T06:00:00.000Z',
      revokedAt: null,
      rotationCount: 2,
    },
  ],
};

describe('the operator platform screen', () => {
  it('states the platform counts and the driver states', async () => {
    stubFetch({ '/api/admin/summary': summary });
    render(<OperatorPlatformScreen />);
    await waitFor(() => expect(screen.getByText('Cerulea local')).toBeInTheDocument());
    expect(screen.getByText('directory open')).toBeInTheDocument();
    expect(screen.getByText('Accounts opened on this platform.')).toBeInTheDocument();
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
  });

  it('names the fix when the account holds no operator role', async () => {
    stubFetch(
      {
        '/api/admin/summary': {
          error: {
            code: 'operator.role_absent',
            message: 'The administration screens open for the Cerulea operator role.',
            fix: 'Ask the Cerulea operator to add this address to the operator list.',
            details: {},
          },
        },
      },
      403,
    );
    render(<OperatorPlatformScreen />);
    await waitFor(() =>
      expect(
        screen.getByText('Ask the Cerulea operator to add this address to the operator list.'),
      ).toBeInTheDocument(),
    );
  });
});

describe('the operator accounts screen', () => {
  it('states whether each account holds a second factor', async () => {
    stubFetch({
      '/api/admin/accounts': {
        accounts: [
          {
            accountId: 'a-1',
            email: 'builder@cerulea.test',
            displayName: 'A Builder',
            state: 'active',
            multiFactorActive: true,
            openSessions: 1,
            workspaces: 2,
            lastSignInAt: '2026-09-19T05:00:00.000Z',
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      },
    });
    render(<OperatorAccountsScreen />);
    await waitFor(() => expect(screen.getByText('A Builder')).toBeInTheDocument());
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('the operator workspaces screen', () => {
  it('lists workspaces and projects with their counts', async () => {
    stubFetch({
      '/api/admin/workspaces': {
        workspaces: [
          {
            workspaceId: 'w-1',
            name: 'Land office',
            application: 'government',
            tier: 'plan_government',
            state: 'active',
            members: 3,
            projects: 1,
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      },
      '/api/admin/projects': {
        projects: [
          {
            projectId: 'p-1',
            workspaceName: 'Land office',
            name: 'Parcel register',
            state: 'draft',
            headVersion: 3,
            deployments: 0,
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-19T05:00:00.000Z',
          },
        ],
      },
    });
    render(<OperatorWorkspacesScreen />);
    await waitFor(() => expect(screen.getByText('Parcel register')).toBeInTheDocument());
    expect(screen.getByText('government')).toBeInTheDocument();
  });
});

describe('the operator security screen', () => {
  it('shows refusals first and carries the allowed actions behind a choice', async () => {
    stubFetch({ '/api/admin/security': securityRecord });
    render(<OperatorSecurityScreen />);
    await waitFor(() =>
      expect(screen.getByText('Capability refused on a workspaces')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Created on a project')).toBeNull();
    expect(screen.getByText('Cerulea Studio')).toBeInTheDocument();
  });
});

describe('the operator audit screen', () => {
  it('reads the whole record with refusals beside allowed actions', async () => {
    stubFetch({ '/api/admin/security': securityRecord });
    render(<OperatorAuditScreen />);
    await waitFor(() => expect(screen.getAllByText('Created on a project').length).toBe(1));
    expect(screen.getAllByText('Capability refused on a workspaces').length).toBeGreaterThan(0);
  });
});
