import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AuditPage from './page';

/**
 * The Audit Logs screen.
 *
 * Each test serves the audit-logs route reply and checks the stat strip,
 * the chips, the search, the table and the export.
 */

function serve(body: unknown, status = 200): string[] {
  const seen: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      seen.push(url);
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }),
  );
  return seen;
}

const today = new Date().toISOString();

const logs = [
  { id: 'e-1', createdAt: today, actorEmail: 'anita@cerulea.test', actorName: 'Anita Rao', actorType: 'user', action: 'key.revoked', resource: 'api_key', resourceId: 'k-1', status: 'success', outcome: 'allowed', ip: '10.0.0.4', workspaceName: 'Port authority' },
  { id: 'e-2', createdAt: '2026-09-19T05:00:00.000Z', actorEmail: 'ravi@cerulea.test', actorName: null, actorType: 'user', action: 'workspace.capability_refused', resource: 'workspace', resourceId: 'w-1', status: 'failure', outcome: 'denied', ip: null, workspaceName: 'Port authority' },
  { id: 'e-3', createdAt: '2026-09-19T04:00:00.000Z', actorEmail: null, actorName: null, actorType: 'system', action: 'deployment.failed', resource: 'deployment', resourceId: 'd-"9"', status: 'failure', outcome: 'failed', ip: null, workspaceName: 'Clinic' },
  { id: 'e-4', createdAt: '2026-09-18T04:00:00.000Z', actorEmail: 'anita@cerulea.test', actorName: 'Anita Rao', actorType: 'user', action: 'account.signed_in', resource: 'account', resourceId: 'a-1', status: 'success', outcome: 'allowed', ip: '10.0.0.4', workspaceName: null },
];

/** Reads a saved file back as text through the browser reader. */
function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Captures the file the screen hands the browser to save. */
function captureDownloads() {
  const saved: { blob: Blob; name: string }[] = [];
  let pending: Blob | null = null;
  class AddressBook extends URL {
    static createObjectURL(blob: Blob): string {
      pending = blob;
      return 'blob:cerulea-audit';
    }

    static revokeObjectURL(): void {}
  }
  vi.stubGlobal('URL', AddressBook);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ blob: pending as Blob, name: this.download });
  });
  return saved;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Audit Logs screen', { timeout: 60000 }, () => {
  it('shows real counts, real action groups and each row in plain words', async () => {
    const seen = serve({ logs, total: 4 });
    render(<AuditPage />);
    expect(screen.getByRole('status', { name: 'Reading the audit record' })).toBeInTheDocument();
    await screen.findByText('Revoked on a key');
    expect(seen).toEqual(['/api/dashboard/audit-logs']);
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('SECURITY & COMPLIANCE')).toBeInTheDocument();

    expect(within(screen.getByTestId('stat-Total Events')).getByText('4')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Today')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Failures')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Sign ins')).getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('WARNINGS')).toBeNull();

    // The category chips come from the recorded action groups.
    const chips = screen.getAllByRole('button', { pressed: false }).map((chip) => chip.getAttribute('aria-label'));
    expect(chips).toEqual(expect.arrayContaining([
      'Category account, 1 events',
      'Category deployment, 1 events',
      'Category key, 1 events',
      'Category workspace, 1 events',
    ]));
    expect(screen.queryByText('auth')).toBeNull();

    const first = within(screen.getByText('Revoked on a key').closest('tr') as HTMLElement);
    expect(first.getByText('Anita Rao')).toBeInTheDocument();
    expect(first.getByText('anita@cerulea.test')).toBeInTheDocument();
    expect(first.getByText('key.revoked')).toBeInTheDocument();
    expect(first.getByText('api_key k-1')).toBeInTheDocument();
    expect(first.getByText('Allowed')).toBeInTheDocument();

    const second = within(screen.getByText('Capability refused on a workspace').closest('tr') as HTMLElement);
    expect(second.getByText('ravi@cerulea.test')).toBeInTheDocument();
    expect(second.getByText('Denied')).toBeInTheDocument();

    const third = within(screen.getByText('Failed on a deployment').closest('tr') as HTMLElement);
    expect(third.getByText('Cerulea')).toBeInTheDocument();
    expect(third.getByText('the platform itself')).toBeInTheDocument();
    expect(third.getByText('Failed')).toBeInTheDocument();
  });

  it('filters by outcome, by action group and by search', async () => {
    const person = userEvent.setup();
    serve({ logs, total: 4 });
    render(<AuditPage />);
    await screen.findByText('Revoked on a key');

    await person.click(screen.getByRole('button', { name: 'Status Denied' }));
    expect(screen.getByText('1 entries')).toBeInTheDocument();
    expect(screen.queryByText('Revoked on a key')).toBeNull();
    expect(screen.getByText('Capability refused on a workspace')).toBeInTheDocument();

    await person.click(screen.getByRole('button', { name: 'Status all' }));
    await person.click(screen.getByRole('button', { name: 'Category key, 1 events' }));
    expect(screen.getByText('1 entries')).toBeInTheDocument();
    expect(screen.getByText('Revoked on a key')).toBeInTheDocument();

    await person.click(screen.getByRole('button', { name: 'Category all, 4 events' }));
    await person.type(screen.getByLabelText('Search'), 'ravi');
    expect(screen.getByText('1 entries')).toBeInTheDocument();
    expect(screen.getByText('Capability refused on a workspace')).toBeInTheDocument();

    await person.clear(screen.getByLabelText('Search'));
    await person.type(screen.getByLabelText('Search'), 'nothing matches this');
    expect(screen.getByText('No log entries match the filters.')).toBeInTheDocument();
  });

  it('exports the rows on screen as delimited text', async () => {
    const person = userEvent.setup();
    serve({ logs, total: 4 });
    const saved = captureDownloads();
    render(<AuditPage />);
    await screen.findByText('Revoked on a key');
    await person.click(screen.getByRole('button', { name: 'Status Denied' }));
    await person.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toMatch(/^cerulea-audit-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = (await readText(saved[0].blob)).split('\n');
    expect(lines).toEqual([
      'Timestamp,Actor,Action,Resource,Category,Status',
      '"2026-09-19T05:00:00.000Z","ravi@cerulea.test","workspace.capability_refused","workspace w-1","workspace","denied"',
    ]);
  });

  it('shows the empty state and the failure with a retry', async () => {
    serve({ logs: [], total: 0 });
    const first = render(<AuditPage />);
    expect(await screen.findByText('No event recorded yet.')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-Total Events')).getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    first.unmount();

    serve({ error: 'Cerulea APIs is unreachable. Start Cerulea APIs.', code: 'apis.unreachable', message: 'Cerulea APIs is unreachable.', fix: 'Start Cerulea APIs.', details: {} }, 503);
    render(<AuditPage />);
    expect(await screen.findByText('Cerulea APIs is unreachable. Start Cerulea APIs.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
