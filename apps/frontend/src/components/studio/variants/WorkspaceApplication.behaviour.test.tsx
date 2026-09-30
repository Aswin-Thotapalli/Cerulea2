import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WorkspaceApplication, { readApplication } from './WorkspaceApplication';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { partsFor } from '@/lib/variants/application';

/**
 * The application a workspace serves.
 *
 * The surface states the gates the held application carries, lists the open
 * workspaces and opens a new workspace for another audience. These tests check
 * the figures it shows, the request it sends and the failures it names.
 */

type Call = { url: string; method: string; body: unknown };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stub(handler: (call: Call) => Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const call = {
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    return handler(call);
  });
  return calls;
}

function headerChips() {
  return within(screen.getByText(/ parts offered$/).closest('.MuiStack-root') as HTMLElement);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading a stored application', () => {
  it('keeps the three known names and falls back to Dapps', () => {
    expect(readApplication('government')).toBe('government');
    expect(readApplication('enterprise')).toBe('enterprise');
    expect(readApplication('dapps')).toBe('dapps');
    expect(readApplication('ministry')).toBe('dapps');
    expect(readApplication(undefined)).toBe('dapps');
  });
});

describe('the workspace application surface', { timeout: 30000 }, () => {
  it('states the gates of the enterprise application', async () => {
    stub(() => Promise.resolve(reply(200, { workspaces: [] })));
    render(<WorkspaceApplication application="enterprise" />);
    const chips = headerChips();
    expect(
      chips.getByText(`${partsFor('enterprise', SEED_MODULES).length} parts offered`),
    ).toBeInTheDocument();
    expect(chips.getByText('3 tiers')).toBeInTheDocument();
    expect(chips.getByText('A piece of work is a system')).toBeInTheDocument();
    expect(chips.getByText('Air-gapped option')).toBeInTheDocument();
    expect(chips.getByText('Residency lock')).toBeInTheDocument();
    expect(screen.getByText('Cerulea is reading the workspaces.')).toBeInTheDocument();
    expect(await screen.findByText('No workspace is open yet.')).toBeInTheDocument();
  });

  it('states one tier and no lock for the government and Dapps applications', () => {
    stub(() => new Promise<Response>(() => undefined));
    const { unmount } = render(<WorkspaceApplication application="government" />);
    expect(headerChips().getByText('1 tier')).toBeInTheDocument();
    unmount();

    render(<WorkspaceApplication application="dapps" />);
    const chips = headerChips();
    expect(chips.getByText('3 tiers')).toBeInTheDocument();
    expect(chips.getByText('A piece of work is a project')).toBeInTheDocument();
    expect(chips.queryByText('Air-gapped option')).toBeNull();
    expect(chips.queryByText('Residency lock')).toBeNull();
  });

  it('lists every open workspace with the application it serves', async () => {
    stub(() =>
      Promise.resolve(
        reply(200, {
          workspaces: [
            { workspaceId: 'w-1', name: 'Harbour', application: 'enterprise' },
            { workspaceId: 'w-2', name: 'Ledger lab', application: 'something else' },
          ],
        }),
      ),
    );
    render(<WorkspaceApplication application="dapps" />);
    expect(await screen.findByText('Harbour, Cerulea for Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Ledger lab, Cerulea for Dapps')).toBeInTheDocument();
    expect(screen.queryByText('No workspace is open yet.')).toBeNull();
  });

  it('reads a listing that carries no workspace array as empty', async () => {
    stub(() => Promise.resolve(reply(200, {})));
    render(<WorkspaceApplication application="dapps" />);
    expect(await screen.findByText('No workspace is open yet.')).toBeInTheDocument();
  });

  it('opens a workspace for the chosen audience and lists it', async () => {
    let listing = [{ workspaceId: 'w-1', name: 'Harbour', application: 'dapps' }];
    const calls = stub((call) => {
      if (call.method === 'POST') {
        const created = { workspaceId: 'w-2', name: 'Revenue office', application: 'government' };
        listing = [...listing, created];
        return Promise.resolve(reply(201, { workspace: created }));
      }
      return Promise.resolve(reply(200, { workspaces: listing }));
    });
    const onOpened = vi.fn();
    render(<WorkspaceApplication application="dapps" onOpened={onOpened} />);
    await screen.findByText('Harbour, Cerulea for Dapps');

    const open = screen.getByRole('button', { name: 'Open a Cerulea for Dapps workspace' });
    expect(open).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Cerulea for Government' }));
    await userEvent.click(screen.getByRole('button', { name: 'Serve Cerulea for Government' }));
    fireEvent.change(screen.getByLabelText('Name of the new workspace'), { target: { value: 'R' } });
    expect(screen.getByRole('button', { name: 'Open a Cerulea for Government workspace' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name of the new workspace'), { target: { value: 'Revenue office  ' } });
    await userEvent.click(screen.getByRole('button', { name: 'Open a Cerulea for Government workspace' }));

    expect(
      await screen.findByText(
        'Cerulea opened Revenue office, serving Cerulea for Government. Every project inside carries that application.',
      ),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')).toEqual({
      url: '/api/workspaces',
      method: 'POST',
      body: { name: 'Revenue office', application: 'government' },
    });
    expect(await screen.findByText('Revenue office, Cerulea for Government')).toBeInTheDocument();
    expect(onOpened).toHaveBeenCalledWith({
      workspaceId: 'w-2',
      name: 'Revenue office',
      application: 'government',
    });
    expect(screen.getByLabelText('Name of the new workspace')).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText(/Cerulea opened Revenue office/)).toBeNull());
  });

  it('shows the message and the fix when the listing fails', async () => {
    stub(() =>
      Promise.resolve(
        reply(503, {
          error: { code: 'workspaces.absent', message: 'Cerulea APIs is starting.', fix: 'Open the screen in a minute.' },
        }),
      ),
    );
    render(<WorkspaceApplication application="dapps" />);
    expect(await screen.findByText('Cerulea APIs is starting. Open the screen in a minute.')).toBeInTheDocument();
    expect(screen.getByText('Open the screen in a minute.')).toBeInTheDocument();
  });

  it('offers the general fix when the listing cannot reach Cerulea', async () => {
    stub(() => Promise.reject('offline'));
    render(<WorkspaceApplication application="dapps" />);
    expect(await screen.findByText('offline')).toBeInTheDocument();
    expect(
      screen.getByText('Open the screen again. Report the problem to the Cerulea operator when it repeats.'),
    ).toBeInTheDocument();
  });

  it('names the fix Cerulea gave when a workspace name is refused', async () => {
    stub((call) =>
      Promise.resolve(
        call.method === 'POST'
          ? reply(409, {
              error: { code: 'workspace.taken', message: 'A workspace holds this name.', fix: 'Pick another name.' },
            })
          : reply(200, { workspaces: [] }),
      ),
    );
    const onOpened = vi.fn();
    render(<WorkspaceApplication application="enterprise" onOpened={onOpened} />);
    await screen.findByText('No workspace is open yet.');
    fireEvent.change(screen.getByLabelText('Name of the new workspace'), { target: { value: 'Harbour' } });
    await userEvent.click(screen.getByRole('button', { name: 'Open a Cerulea for Enterprise workspace' }));
    expect(await screen.findByText('A workspace holds this name. Pick another name.')).toBeInTheDocument();
    expect(onOpened).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name of the new workspace')).toHaveValue('Harbour');
  });

  it('asks for a different name when the open request cannot reach Cerulea', async () => {
    stub((call) =>
      call.method === 'POST'
        ? Promise.reject(new Error('socket closed'))
        : Promise.resolve(reply(200, { workspaces: [] })),
    );
    render(<WorkspaceApplication application="dapps" />);
    await screen.findByText('No workspace is open yet.');
    fireEvent.change(screen.getByLabelText('Name of the new workspace'), { target: { value: 'Harbour' } });
    await userEvent.click(screen.getByRole('button', { name: 'Open a Cerulea for Dapps workspace' }));
    expect(await screen.findByText('socket closed')).toBeInTheDocument();
    expect(screen.getByText('Type a different name, then open the workspace again.')).toBeInTheDocument();
  });
});
