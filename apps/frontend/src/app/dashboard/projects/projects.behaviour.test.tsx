import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProjectsPage from './page';

const projects = [
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
  {
    id: 'prj_permit', name: 'Permit issuance', slug: 'permit-issuance', status: 'deploying', state: 'building',
    projectType: 'blockchain', division: 'enterprise', workspaceName: 'Caerulean Demonstrations',
    createdAt: '2026-09-30T15:55:21.041Z', updatedAt: '2026-10-01T07:27:55.363Z',
  },
];

type Reply = { status: number; body: unknown };

function stubFetch(replies: Record<string, Reply>) {
  const seen: { url: string; method: string }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    seen.push({ url, method: init?.method ?? 'GET' });
    const reply = replies[url] ?? { status: 404, body: { error: `No answer for ${url}` } };
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

describe('the Projects screen', { timeout: 30000 }, () => {
  it('reads its route and lists each project with type, status and the updated date', async () => {
    const seen = stubFetch({ '/api/dashboard/projects': { status: 200, body: { projects } } });
    render(<ProjectsPage />);
    expect(screen.getByText('WORKSPACE')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    expect(seen[0]).toEqual({ url: '/api/dashboard/projects', method: 'GET' });
    expect(screen.getByText('/land-title-registry')).toBeInTheDocument();
    expect(screen.getAllByText('Blockchain')).toHaveLength(2);
    expect(screen.getByText('dApp')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Deploying')).toBeInTheDocument();
    expect(screen.getByText(/3 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
  });

  it('filters by name or slug, by type and by status, and counts what remains', async () => {
    stubFetch({ '/api/dashboard/projects': { status: 200, body: { projects } } });
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('Voting dApp')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('Search projects'), 'permit-iss');
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Permit issuance')).toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText('Search projects'));

    await userEvent.click(screen.getByLabelText('Type'));
    await userEvent.click(screen.getByRole('option', { name: 'dApp' }));
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Voting dApp')).toBeInTheDocument();
    expect(screen.queryByText('Land title registry')).toBeNull();

    await userEvent.click(screen.getByLabelText('Type'));
    await userEvent.click(screen.getByRole('option', { name: 'All Types' }));
    await userEvent.click(screen.getByLabelText('Status'));
    await userEvent.click(screen.getByRole('option', { name: 'Deploying' }));
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Permit issuance')).toBeInTheDocument();
  });

  it('opens a project inside its division on the current origin in a new tab', async () => {
    stubFetch({ '/api/dashboard/projects': { status: 200, body: { projects } } });
    const opened = vi.fn();
    vi.stubGlobal('open', opened);
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('Voting dApp')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Open Voting dApp in Studio' }));
    expect(opened).toHaveBeenCalledWith(
      `${window.location.origin}/dapps?project=prj_vote`,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('closes a project through the trunk route after the confirm dialog', async () => {
    const seen = stubFetch({
      '/api/dashboard/projects': { status: 200, body: { projects } },
      '/api/projects/prj_land': { status: 200, body: { ok: true } },
    });
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Close Land title registry' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Close Project')).toBeInTheDocument();
    expect(within(dialog).getByText(/Every saved Blueprint version stays readable/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(seen).toContainEqual({ url: '/api/projects/prj_land', method: 'DELETE' }));
    await waitFor(() => expect(screen.queryByText('Land title registry')).toBeNull());
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });

  it('names the failure when a close is refused and keeps the project', async () => {
    stubFetch({
      '/api/dashboard/projects': { status: 200, body: { projects } },
      '/api/projects/prj_land': {
        status: 403,
        body: {
          error: 'Only an owner closes a project. Ask the workspace owner.',
          code: 'projects.role_short',
          message: 'Only an owner closes a project.',
          fix: 'Ask the workspace owner.',
          details: {},
        },
      },
    });
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('Land title registry')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Close Land title registry' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.getByText('Only an owner closes a project. Ask the workspace owner.')).toBeInTheDocument(),
    );
    // The row stays in the table behind the dialog, so the name appears twice.
    expect(screen.getAllByText('Land title registry')).toHaveLength(2);
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
  });

  it('shows the production empty state when the account holds no project', async () => {
    stubFetch({ '/api/dashboard/projects': { status: 200, body: { projects: [] } } });
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('No projects yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Create First Project' })).toBeInTheDocument();
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
  });

  it('names the fix when the route fails', async () => {
    stubFetch({
      '/api/dashboard/projects': {
        status: 503,
        body: {
          error: 'Cerulea APIs did not answer. Start Cerulea APIs, then read again.',
          code: 'service.unreachable',
          message: 'Cerulea APIs did not answer.',
          fix: 'Start Cerulea APIs, then read again.',
          details: {},
        },
      },
    });
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('Cerulea APIs did not answer.')).toBeInTheDocument());
    expect(screen.getByText('Start Cerulea APIs, then read again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read again' })).toBeInTheDocument();
  });
});
