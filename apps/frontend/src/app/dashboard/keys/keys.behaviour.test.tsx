import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import KeysPanel from './page';

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
  return { status: 422, body: { error: { code: 'request.refused', message, fix, details: {} } } };
}

const view = {
  workspace: { workspaceId: 'w-1', name: 'Port authority' },
  keys: [
    {
      keyId: 'k 1',
      name: 'Berth reader',
      prefix: 'ck_berth01',
      scopes: ['records.read', 'proofs.read'],
      requestsPerMinute: 120,
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: '2026-09-19T06:30:00.000Z',
      createdAt: '2026-09-01T06:00:00.000Z',
    },
    {
      keyId: 'k-2',
      name: 'Old importer',
      prefix: 'ck_import1',
      scopes: ['records.write'],
      requestsPerMinute: 600,
      expiresAt: null,
      revokedAt: '2026-09-10T06:00:00.000Z',
      lastUsedAt: null,
      createdAt: '2026-08-01T06:00:00.000Z',
    },
  ],
  scopes: ['records.read', 'records.write', 'ledger.export'],
};

const empty = { ...view, keys: [] };

afterEach(() => {
  vi.unstubAllGlobals();
});

function reads(calls: Call[]): number {
  return calls.filter((call) => call.method === 'GET').length;
}

function rowOf(name: string): HTMLElement {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('the Keys panel', { timeout: 60000 }, () => {
  it('shows each key with its scopes, its limit and its state', async () => {
    const calls = serve(() => ({ body: view }));
    render(<KeysPanel />);
    await screen.findByText('Berth reader');
    const open = within(rowOf('Berth reader'));
    expect(calls[0]).toMatchObject({ url: '/api/dashboard/keys', method: 'GET' });
    expect(open.getByText('ck_berth01')).toBeInTheDocument();
    expect(open.getByText('records.read')).toBeInTheDocument();
    expect(open.getByText('proofs.read')).toBeInTheDocument();
    expect(open.getByText('120')).toBeInTheDocument();
    expect(open.getByText(new Date('2026-09-19T06:30:00.000Z').toLocaleString())).toBeInTheDocument();
    expect(open.getByText('Open')).toBeInTheDocument();
    expect(open.getByRole('button', { name: 'Rotate' })).toBeInTheDocument();
    expect(open.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();

    const closed = within(rowOf('Old importer'));
    expect(closed.getByText('Closed')).toBeInTheDocument();
    expect(closed.getByText('Not used yet')).toBeInTheDocument();
    expect(closed.queryByRole('button')).toBeNull();
  });

  it('rotates a key and shows the new secret once', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'PATCH'
        ? { body: { secret: 'ck_berth01_new_secret', guidance: 'Copy the new key now.' } }
        : { body: view },
    );
    render(<KeysPanel />);
    await screen.findByText('Berth reader');
    await person.click(within(rowOf('Berth reader')).getByRole('button', { name: 'Rotate' }));

    expect(await screen.findByText('ck_berth01_new_secret')).toBeInTheDocument();
    expect(screen.getByText('Copy the new key now.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')?.url).toBe('/api/dashboard/keys?keyId=k%201');
    await waitFor(() => expect(reads(calls)).toBe(2));

    const notice = screen.getByText('Copy the new key now.').closest('.MuiAlert-root') as HTMLElement;
    await person.click(within(notice).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('ck_berth01_new_secret')).toBeNull());
  });

  it('revokes a key and reads the list again without showing a secret', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'DELETE' ? { body: { guidance: 'Cerulea closed the key.' } } : { body: view },
    );
    render(<KeysPanel />);
    await screen.findByText('Berth reader');
    await person.click(within(rowOf('Berth reader')).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(reads(calls)).toBe(2));
    const revoking = calls.find((call) => call.method === 'DELETE');
    expect(revoking?.url).toBe('/api/dashboard/keys?keyId=k%201');
    expect(screen.queryByText('Cerulea closed the key.')).toBeNull();
  });

  it('names the fix when a key change is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'DELETE'
        ? refusal('The key is already closed.', 'Read the keys again.')
        : { body: view },
    );
    render(<KeysPanel />);
    await screen.findByText('Berth reader');
    await person.click(within(rowOf('Berth reader')).getByRole('button', { name: 'Revoke' }));
    expect(await screen.findByText('The key is already closed.')).toBeInTheDocument();
    expect(screen.getByText('Read the keys again.')).toBeInTheDocument();
  });

  it('states what to do while no key exists and opens the issue form from there', async () => {
    const person = userEvent.setup();
    serve(() => ({ body: empty }));
    render(<KeysPanel />);
    expect(await screen.findByText('No key yet')).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Issue the first key' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Issue a key')).toBeInTheDocument();
    // Every scope the workspace offers appears with its meaning.
    expect(within(dialog).getByText('Reads records from a collection.')).toBeInTheDocument();
    expect(within(dialog).getByText('Adds and changes records in a collection.')).toBeInTheDocument();
    expect(within(dialog).getByText('Reaches part of the generated surface.')).toBeInTheDocument();

    await person.click(within(dialog).getByRole('button', { name: 'Leave it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('issues a key with the chosen name, scopes and limit', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'POST'
        ? { body: { secret: 'ck_new_full_secret', guidance: 'Copy this key now. Cerulea shows it once.' } }
        : { body: empty },
    );
    render(<KeysPanel />);
    await screen.findByText('No key yet');
    await person.click(screen.getByRole('button', { name: 'Issue a key' }));
    const dialog = await screen.findByRole('dialog');
    const issue = within(dialog).getByRole('button', { name: 'Issue the key' });
    expect(issue).toBeDisabled();

    await person.click(within(dialog).getByLabelText('Name'));
    await person.paste('Gate scanner');
    expect(issue).toBeDisabled();

    await person.click(within(dialog).getByRole('checkbox', { name: 'records.read' }));
    await person.click(within(dialog).getByRole('checkbox', { name: 'records.write' }));
    await person.click(within(dialog).getByRole('checkbox', { name: 'records.write' }));
    expect(within(dialog).getByRole('checkbox', { name: 'records.write' })).not.toBeChecked();
    expect(issue).toBeEnabled();

    const limit = within(dialog).getByLabelText('Requests each minute');
    expect(limit).toHaveValue('600');
    await person.clear(limit);
    await person.paste('90');
    await person.click(issue);

    expect(await screen.findByText('ck_new_full_secret')).toBeInTheDocument();
    expect(screen.getByText('Copy this key now. Cerulea shows it once.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')).toMatchObject({
      url: '/api/dashboard/keys',
      body: { name: 'Gate scanner', scopes: ['records.read'], requestsPerMinute: 90 },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(reads(calls)).toBe(2));

    // The form starts empty the next time it opens.
    await person.click(screen.getByRole('button', { name: 'Issue a key' }));
    const again = await screen.findByRole('dialog');
    expect(within(again).getByLabelText('Name')).toHaveValue('');
    expect(within(again).getByRole('checkbox', { name: 'records.read' })).not.toBeChecked();
  });

  it('falls back to six hundred requests when the limit is no number', async () => {
    const person = userEvent.setup();
    const calls = serve((call) =>
      call.method === 'POST' ? { body: { secret: 'ck_x', guidance: 'Copy it.' } } : { body: empty },
    );
    render(<KeysPanel />);
    await screen.findByText('No key yet');
    await person.click(screen.getByRole('button', { name: 'Issue a key' }));
    const dialog = await screen.findByRole('dialog');
    await person.click(within(dialog).getByLabelText('Name'));
    await person.paste('Gate scanner');
    await person.click(within(dialog).getByRole('checkbox', { name: 'ledger.export' }));
    await person.clear(within(dialog).getByLabelText('Requests each minute'));
    await person.paste('many');
    await person.click(within(dialog).getByRole('button', { name: 'Issue the key' }));

    await screen.findByText('ck_x');
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
      scopes: ['ledger.export'],
      requestsPerMinute: 600,
    });
  });

  it('keeps the form open and names the fix when issuing is refused', async () => {
    const person = userEvent.setup();
    serve((call) =>
      call.method === 'POST'
        ? refusal('The workspace holds the most keys its plan allows.', 'Revoke an unused key first.')
        : { body: empty },
    );
    render(<KeysPanel />);
    await screen.findByText('No key yet');
    await person.click(screen.getByRole('button', { name: 'Issue a key' }));
    const dialog = await screen.findByRole('dialog');
    await person.click(within(dialog).getByLabelText('Name'));
    await person.paste('Gate scanner');
    await person.click(within(dialog).getByRole('checkbox', { name: 'records.read' }));
    await person.click(within(dialog).getByRole('button', { name: 'Issue the key' }));

    expect(
      await screen.findByText('The workspace holds the most keys its plan allows.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Revoke an unused key first.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText('Name')).toHaveValue('Gate scanner');
  });
});
