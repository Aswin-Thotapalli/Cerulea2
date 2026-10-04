import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import KeysPage from './page';

/**
 * The Keys & Access screen.
 *
 * Each test serves the route reply the screen reads, then checks the rows,
 * the dialogs and the calls the screen sends back to its own route.
 */

type Served = { status?: number; body: unknown };

function serve(table: Record<string, Served | ((init: RequestInit) => Served)>): { method: string; url: string; body: unknown }[] {
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
      const answer = typeof entry === 'function' ? entry(init) : entry;
      return new Response(JSON.stringify(answer.body), {
        status: answer.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return seen;
}

const scopePurposes = [
  { scope: 'records.read', purpose: 'Reads records through the generated record interface.' },
  { scope: 'actions.invoke', purpose: 'Runs the actions the Blueprint declares.' },
];

const view = {
  workspace: { workspaceId: 'wsp_registry', name: 'Registry office' },
  workspaces: [
    { workspaceId: 'wsp_registry', name: 'Registry office' },
    { workspaceId: 'wsp_clinic', name: 'Clinic network' },
  ],
  keys: [
    {
      keyId: 'key_bank',
      name: 'Partner bank title verification',
      prefix: 'ck_9z40zygj',
      scopes: ['records.read', 'proofs.read'],
      requestsPerMinute: 120,
      expiresAt: '2027-03-30T04:10:30.298Z',
      revokedAt: null,
      lastUsedAt: null,
      createdAt: '2026-10-01T04:10:30.298Z',
    },
    {
      keyId: 'key_old',
      name: 'Sub registrar office',
      prefix: 'ck_teasnwze',
      scopes: ['records.read'],
      requestsPerMinute: 600,
      expiresAt: null,
      revokedAt: '2026-10-01T04:10:00.989Z',
      lastUsedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      createdAt: '2026-10-01T03:08:57.973Z',
    },
  ],
  scopes: ['records.read', 'actions.invoke'],
  scopePurposes,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Keys & Access screen', { timeout: 60000 }, () => {
  it('shows each key with its real prefix, scopes, limit, expiry and relative times', async () => {
    const seen = serve({ 'GET /api/dashboard/keys': { body: view } });
    render(<KeysPage />);
    expect(screen.getByRole('status', { name: 'Reading the keys' })).toBeInTheDocument();
    await screen.findByText('Partner bank title verification');
    expect(seen[0].url).toBe('/api/dashboard/keys');
    expect(screen.getByText('Keys & Access')).toBeInTheDocument();
    expect(screen.getByText('ACCESS MANAGEMENT')).toBeInTheDocument();

    const bank = within(screen.getByTestId('key-row-key_bank'));
    expect(bank.getByText(/^ck_9z40zygj/)).toBeInTheDocument();
    expect(bank.getByText('records.read')).toBeInTheDocument();
    expect(bank.getByText('proofs.read')).toBeInTheDocument();
    expect(bank.getByText('120 requests a minute')).toBeInTheDocument();
    expect(bank.getByText(/^Expires /)).toBeInTheDocument();
    expect(bank.getByText('Never used')).toBeInTheDocument();
    expect(bank.getByText(/^Created /)).toBeInTheDocument();
    expect(bank.getByRole('button', { name: 'Rotate Partner bank title verification' })).toBeInTheDocument();

    const old = within(screen.getByTestId('key-row-key_old'));
    expect(old.getByText('Revoked')).toBeInTheDocument();
    expect(old.getByText('No expiry')).toBeInTheDocument();
    expect(old.getByText('Used 3 hours ago')).toBeInTheDocument();
    expect(old.queryByRole('button', { name: /Revoke/ })).toBeNull();

    // The count chip counts the open keys only.
    expect(screen.getByText('1', { selector: '.MuiChip-label' })).toBeInTheDocument();
  });

  it('reads the keys of the workspace the person chooses', async () => {
    const person = userEvent.setup();
    const seen = serve({
      'GET /api/dashboard/keys': { body: view },
      'GET /api/dashboard/keys?workspaceId=wsp_clinic': {
        body: { ...view, workspace: view.workspaces[1], keys: [] },
      },
    });
    render(<KeysPage />);
    await screen.findByText('Partner bank title verification');
    await person.click(screen.getByLabelText('Workspace'));
    await person.click(await screen.findByRole('option', { name: 'Clinic network' }));
    await screen.findByText('No API keys yet.');
    expect(seen.map((call) => call.url)).toContain('/api/dashboard/keys?workspaceId=wsp_clinic');
  });

  it('generates a key with a name, scopes and a limit, then shows the secret once with a copy control', async () => {
    const person = userEvent.setup();
    const seen = serve({
      'GET /api/dashboard/keys': { body: view },
      'GET /api/dashboard/keys?workspaceId=wsp_registry': { body: view },
      'POST /api/dashboard/keys': {
        status: 201,
        body: { key: { keyId: 'key_new' }, secret: 'ck_new_secret_value', guidance: 'Cerulea shows this key once.' },
      },
    });
    render(<KeysPage />);
    await screen.findByText('Partner bank title verification');
    await person.click(screen.getByRole('button', { name: 'Generate API Key' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Generate New API Key')).toBeInTheDocument();
    expect(dialog.getByText('Reads records through the generated record interface.')).toBeInTheDocument();
    const generate = dialog.getByRole('button', { name: 'Generate' });
    expect(generate).toBeDisabled();

    await person.type(dialog.getByLabelText('Key Name'), 'Reporting service');
    expect(generate).toBeDisabled();
    await person.click(dialog.getByRole('checkbox', { name: 'records.read' }));
    expect(generate).toBeEnabled();
    await person.clear(dialog.getByLabelText('Requests a minute'));
    await person.type(dialog.getByLabelText('Requests a minute'), '90');
    await person.type(dialog.getByLabelText('Expires in days'), '30');
    await person.click(generate);

    expect(await screen.findByTestId('generated-key')).toHaveTextContent('ck_new_secret_value');
    expect(screen.getByText('Copy this key now. Cerulea shows it once.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy the key' })).toBeInTheDocument();
    const issued = seen.find((call) => call.method === 'POST');
    expect(issued?.body).toEqual({
      name: 'Reporting service',
      scopes: ['records.read'],
      requestsPerMinute: 90,
      workspaceId: 'wsp_registry',
      expiresInDays: 30,
    });
    await waitFor(() =>
      expect(seen.map((call) => call.url)).toContain('/api/dashboard/keys?workspaceId=wsp_registry'),
    );
  });

  it('asks before revoking and sends the revoke to its own route', async () => {
    const person = userEvent.setup();
    const seen = serve({
      'GET /api/dashboard/keys': { body: view },
      'GET /api/dashboard/keys?workspaceId=wsp_registry': { body: { ...view, keys: [view.keys[1]] } },
      'DELETE /api/dashboard/keys?keyId=key_bank&workspaceId=wsp_registry': {
        body: { key: { keyId: 'key_bank' }, guidance: 'The key is closed.' },
      },
    });
    render(<KeysPage />);
    await screen.findByText('Partner bank title verification');
    await person.click(screen.getByRole('button', { name: 'Revoke Partner bank title verification' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Revoke API Key?')).toBeInTheDocument();
    expect(seen.some((call) => call.method === 'DELETE')).toBe(false);
    await person.click(dialog.getByRole('button', { name: 'Revoke' }));
    await waitFor(() =>
      expect(seen.some((call) => call.method === 'DELETE' && call.url === '/api/dashboard/keys?keyId=key_bank&workspaceId=wsp_registry')).toBe(true),
    );
    await waitFor(() => expect(screen.queryByTestId('key-row-key_bank')).toBeNull());
  });

  it('rotates a key after a confirm and shows the new secret once', async () => {
    const person = userEvent.setup();
    const seen = serve({
      'GET /api/dashboard/keys': { body: view },
      'GET /api/dashboard/keys?workspaceId=wsp_registry': { body: view },
      'PATCH /api/dashboard/keys?keyId=key_bank&workspaceId=wsp_registry': {
        body: { key: { keyId: 'key_bank_2' }, secret: 'ck_rotated_secret', guidance: 'The earlier key is closed.' },
      },
    });
    render(<KeysPage />);
    await screen.findByText('Partner bank title verification');
    await person.click(screen.getByRole('button', { name: 'Rotate Partner bank title verification' }));
    expect(await screen.findByText('Rotate API Key?')).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Rotate' }));
    expect(await screen.findByTestId('generated-key')).toHaveTextContent('ck_rotated_secret');
    expect(seen.some((call) => call.method === 'PATCH')).toBe(true);
  });

  it('shows the empty state and the failure with a retry', async () => {
    serve({ 'GET /api/dashboard/keys': { body: { ...view, keys: [] } } });
    const first = render(<KeysPage />);
    expect(await screen.findByText('No API keys yet.')).toBeInTheDocument();
    first.unmount();

    serve({
      'GET /api/dashboard/keys': {
        status: 503,
        body: { error: 'Cerulea APIs is unreachable. Start Cerulea APIs.', code: 'apis.unreachable', message: 'Cerulea APIs is unreachable.', fix: 'Start Cerulea APIs.', details: {} },
      },
    });
    render(<KeysPage />);
    expect(await screen.findByText('Cerulea APIs is unreachable. Start Cerulea APIs.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('Validator Keys')).toBeNull();
  });
});
