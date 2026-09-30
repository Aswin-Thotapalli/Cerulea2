import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AuditPanel from './page';

function serve(body: unknown): string[] {
  const seen: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      seen.push(url);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return seen;
}

const events = [
  {
    eventId: 'e-1',
    actorEmail: 'anita@cerulea.test',
    actorName: 'Anita Rao',
    action: 'key.revoked',
    subjectType: 'api_key',
    subjectId: 'k-1',
    outcome: 'allowed',
    networkAddress: '10.0.0.4',
    occurredAt: '2026-09-19T06:00:00.000Z',
  },
  {
    eventId: 'e-2',
    actorEmail: 'ravi@cerulea.test',
    actorName: '',
    action: 'workspaces.capability_refused',
    subjectType: 'workspace',
    subjectId: 'w-1',
    outcome: 'denied',
    networkAddress: '',
    occurredAt: '2026-09-19T05:00:00.000Z',
  },
  {
    eventId: 'e-3',
    actorEmail: '',
    actorName: '',
    action: 'deployment.finished',
    subjectType: 'deployment',
    subjectId: 'd-"9"',
    outcome: 'allowed',
    networkAddress: '',
    occurredAt: '2026-09-19T04:00:00.000Z',
  },
];

const view = {
  workspace: { workspaceId: 'w-1', name: 'Port authority' },
  events,
  total: 57,
  actions: ['key.revoked', 'workspaces.capability_refused'],
  outcomes: ['allowed', 'denied'],
};

/** Reads a saved file back as text through the browser reader. */
function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Captures the file the panel hands the browser to save. */
function captureDownloads() {
  const saved: { blob: Blob; name: string; href: string }[] = [];
  let pending: Blob | null = null;
  const revoked: string[] = [];
  class AddressBook extends URL {
    static createObjectURL(blob: Blob): string {
      pending = blob;
      return 'blob:cerulea-audit';
    }

    static revokeObjectURL(address: string): void {
      revoked.push(address);
    }
  }
  vi.stubGlobal('URL', AddressBook);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({ blob: pending as Blob, name: this.download, href: this.getAttribute('href') ?? '' });
  });
  return { saved, revoked };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Audit panel', { timeout: 60000 }, () => {
  it('shows each event with its actor, its action, its outcome and its origin', async () => {
    const seen = serve(view);
    render(<AuditPanel />);
    expect(screen.getByText('Cerulea is reading the audit record.')).toBeInTheDocument();
    await screen.findByText('Anita Rao');
    expect(seen[0]).toBe('/api/dashboard/audit?limit=200');
    expect(screen.getByText('3 of 57 events in Port authority.')).toBeInTheDocument();

    const first = within(screen.getByText('Anita Rao').closest('tr') as HTMLElement);
    expect(first.getByText('Revoked on a key')).toBeInTheDocument();
    expect(first.getByText('10.0.0.4')).toBeInTheDocument();
    expect(first.getByText('allowed').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(first.getByText(new Date('2026-09-19T06:00:00.000Z').toLocaleString())).toBeInTheDocument();

    // A missing name falls back to the email address, then to Cerulea itself.
    const second = within(screen.getByText('ravi@cerulea.test').closest('tr') as HTMLElement);
    expect(second.getByText('Capability refused on a workspaces')).toBeInTheDocument();
    expect(second.getByText('this machine')).toBeInTheDocument();
    expect(second.getByText('denied').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');

    const third = within(screen.getByText('Finished on a deployment').closest('tr') as HTMLElement);
    expect(third.getByText('Cerulea')).toBeInTheDocument();
  });

  it('asks Cerulea APIs again with each filter the person chooses', async () => {
    const person = userEvent.setup();
    const seen = serve(view);
    render(<AuditPanel />);
    await screen.findByText('Anita Rao');

    const [actionField, outcomeField] = screen.getAllByRole('combobox');
    await person.click(actionField);
    const actionList = await screen.findByRole('listbox');
    expect(within(actionList).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Every action',
      'Revoked on a key',
      'Capability refused on a workspaces',
    ]);
    await person.click(within(actionList).getByRole('option', { name: 'Revoked on a key' }));
    await waitFor(() =>
      expect(seen).toContain('/api/dashboard/audit?action=key.revoked&limit=200'),
    );

    await person.click(outcomeField);
    await person.click(await screen.findByRole('option', { name: 'denied' }));
    await waitFor(() =>
      expect(seen).toContain('/api/dashboard/audit?action=key.revoked&outcome=denied&limit=200'),
    );

    await person.click(screen.getByLabelText('Search'));
    await person.paste('ravi');
    await waitFor(() =>
      expect(seen).toContain(
        '/api/dashboard/audit?action=key.revoked&outcome=denied&search=ravi&limit=200',
      ),
    );
  });

  it('exports the rows on screen as delimited text', async () => {
    const person = userEvent.setup();
    serve(view);
    const { saved, revoked } = captureDownloads();
    render(<AuditPanel />);
    await screen.findByText('Anita Rao');
    await person.click(screen.getByRole('button', { name: 'Export the record' }));

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('cerulea-audit.csv');
    expect(saved[0].href).toBe('blob:cerulea-audit');
    expect(saved[0].blob.type).toBe('text/csv;charset=utf-8');
    expect(revoked).toEqual(['blob:cerulea-audit']);
    const lines = (await readText(saved[0].blob)).split('\n');
    expect(lines).toEqual([
      'occurred_at,actor,action,subject_type,subject,outcome',
      '"2026-09-19T06:00:00.000Z","anita@cerulea.test","key.revoked","api_key","k-1","allowed"',
      '"2026-09-19T05:00:00.000Z","ravi@cerulea.test","workspaces.capability_refused","workspace","w-1","denied"',
      '"2026-09-19T04:00:00.000Z","","deployment.finished","deployment","d-""9""","allowed"',
    ]);
  });

  it('states what to do when nothing matches', async () => {
    serve({ ...view, events: [], total: 0 });
    render(<AuditPanel />);
    expect(await screen.findByText('No event matches')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 events in Port authority.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
