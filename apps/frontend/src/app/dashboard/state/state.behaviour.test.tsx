import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StatePage from './page';

/**
 * The State Snapshots screen.
 *
 * Each test serves the state route reply, then checks the stats, the
 * snapshot list, the versions, the create and restore dialogs and the calls
 * the screen sends back to its own routes.
 */

type Served = { status?: number; body: unknown };

function serve(table: Record<string, Served>): { method: string; url: string; body: unknown }[] {
  const seen: { method: string; url: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      seen.push({ method, url, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
      const entry = table[`${method} ${url}`];
      if (!entry) {
        return new Response(JSON.stringify({ error: `No answer for ${method} ${url}.`, code: 'suite.unanswered', message: `No answer for ${method} ${url}.`, fix: 'Add one.', details: {} }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(entry.body), { status: entry.status ?? 200, headers: { 'content-type': 'application/json' } });
    }),
  );
  return seen;
}

const land = {
  projectId: 'prj_land',
  projectName: 'Land title registry',
  workspaceName: 'Registry office',
  state: 'draft',
  headVersion: 6,
  blueprintHash: 'f'.repeat(64),
  counts: { collections: 7, actions: 18, workflows: 2, permissions: 27, rules: 4 },
  versions: [
    { blueprintId: 'blp_6', version: 6, blueprintHash: 'f'.repeat(64), note: 'Added the lien release', createdAt: '2026-10-03T07:27:55.363Z' },
    { blueprintId: 'blp_5', version: 5, blueprintHash: 'e'.repeat(64), note: '', createdAt: '2026-10-02T07:27:55.363Z' },
  ],
  checkpoints: [
    { checkpointId: 'chk_before', projectId: 'prj_land', blueprintId: 'blp_5', blueprintHash: 'e'.repeat(64), version: 5, label: 'Before the lien change', note: 'Taken before the release rule.', createdAt: '2026-10-02T08:00:00.000Z' },
  ],
};

const permit = { ...land, projectId: 'prj_permit', projectName: 'Permit issuance', headVersion: 4, versions: [], checkpoints: [] };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the State Snapshots screen', { timeout: 60000 }, () => {
  it('shows the snapshots and the versions of the first project with real counts', async () => {
    const seen = serve({ 'GET /api/dashboard/state': { body: { projects: [land, permit] } } });
    render(<StatePage />);
    expect(screen.getByRole('status', { name: 'Reading the snapshots' })).toBeInTheDocument();
    await screen.findByText('Before the lien change');
    expect(seen[0].url).toBe('/api/dashboard/state');
    expect(screen.getByText('State Snapshots')).toBeInTheDocument();
    expect(screen.getByText('DISASTER RECOVERY')).toBeInTheDocument();

    expect(within(screen.getByTestId('stat-Ready Snapshots')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Blueprint Versions')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Project')).getByText('Land title registry')).toBeInTheDocument();
    expect(screen.getByText('The Blueprint at version 6 holds 7 collections, 18 actions, 2 workflows, 27 permission entries, 4 rules.')).toBeInTheDocument();

    const snapshot = within(screen.getByTestId('snapshot-chk_before'));
    expect(snapshot.getByText('Taken before the release rule.')).toBeInTheDocument();
    expect(snapshot.getByText('Version 5 · eeeeeeeeeeee')).toBeInTheDocument();
    expect(snapshot.getByText('Ready')).toBeInTheDocument();

    const head = within(screen.getByTestId('version-6'));
    expect(head.getByText('Added the lien release')).toBeInTheDocument();
    expect(head.getByText('Current')).toBeInTheDocument();
    expect(head.getByText('ffffffffffff')).toBeInTheDocument();
    expect(within(screen.getByTestId('version-5')).getByText('No note on this save')).toBeInTheDocument();

    // The schedule and the delete control of the earlier screen are gone.
    expect(screen.queryByText(/Auto-Snapshot/)).toBeNull();
    expect(screen.queryByText(/Coming soon/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
  });

  it('switches project and reloads on the reload control', async () => {
    const person = userEvent.setup();
    const seen = serve({ 'GET /api/dashboard/state': { body: { projects: [land, permit] } } });
    render(<StatePage />);
    await screen.findByText('Before the lien change');
    await person.click(screen.getByLabelText('Project'));
    await person.click(await screen.findByRole('option', { name: 'Permit issuance' }));
    expect(await screen.findByText('No snapshots yet.')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Project')).getByText('Permit issuance')).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(seen.filter((call) => call.url === '/api/dashboard/state')).toHaveLength(2));
  });

  it('creates a snapshot with a name and a description on the real checkpoint call', async () => {
    const person = userEvent.setup();
    const seen = serve({
      'GET /api/dashboard/state': { body: { projects: [land] } },
      'POST /api/dashboard/state': { status: 201, body: { checkpoint: { checkpointId: 'chk_new' } } },
    });
    render(<StatePage />);
    await screen.findByText('Before the lien change');
    await person.click(screen.getByRole('button', { name: 'Create Snapshot' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('The snapshot names Blueprint version 6 of Land title registry.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
    await person.type(dialog.getByLabelText(/Snapshot name/), 'Before economics');
    await person.type(dialog.getByLabelText(/Description/), 'Taken on Friday.');
    await person.click(dialog.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(seen.some((call) => call.method === 'POST')).toBe(true));
    expect(seen.find((call) => call.method === 'POST')?.body).toEqual({ projectId: 'prj_land', label: 'Before economics', note: 'Taken on Friday.' });
    expect(await screen.findByText('Snapshot created')).toBeInTheDocument();
    await waitFor(() => expect(seen.filter((call) => call.url === '/api/dashboard/state' && call.method === 'GET')).toHaveLength(2));
  });

  it('restores a snapshot after a confirm through the restoration route', async () => {
    const person = userEvent.setup();
    const seen = serve({
      'GET /api/dashboard/state': { body: { projects: [land] } },
      'POST /api/dashboard/state/chk_before/restore': {
        status: 201,
        body: { checkpoint: { checkpointId: 'chk_after' }, blueprint: { version: 7 }, alreadyAtHead: false },
      },
    });
    render(<StatePage />);
    await screen.findByText('Before the lien change');
    await person.click(screen.getByRole('button', { name: 'Restore Before the lien change' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Restore Snapshot?')).toBeInTheDocument();
    expect(seen.some((call) => call.method === 'POST')).toBe(false);
    await person.click(dialog.getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Snapshot restored. The Blueprint is now version 7.')).toBeInTheDocument();
    const restore = seen.find((call) => call.method === 'POST');
    expect(restore?.url).toBe('/api/dashboard/state/chk_before/restore');
    expect(restore?.body).toEqual({ projectId: 'prj_land' });
  });

  it('shows the empty state and the failure with a retry', async () => {
    serve({ 'GET /api/dashboard/state': { body: { projects: [] } } });
    const first = render(<StatePage />);
    expect(await screen.findByText('No project yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Snapshot' })).toBeDisabled();
    first.unmount();

    serve({
      'GET /api/dashboard/state': {
        status: 503,
        body: { error: 'Cerulea APIs is unreachable. Start Cerulea APIs.', code: 'apis.unreachable', message: 'Cerulea APIs is unreachable.', fix: 'Start Cerulea APIs.', details: {} },
      },
    });
    render(<StatePage />);
    expect(await screen.findByText('Cerulea APIs is unreachable. Start Cerulea APIs.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
