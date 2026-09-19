import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ManifestAtomic from './ManifestAtomic';
import { EXAMPLE_MANIFEST as manifest } from '@/lib/manifest/example';
import { GROUP_WORDING, MANIFEST_GROUPS, linesOfGroup } from '@/lib/manifest/groups';
import { controlsWithoutMirror } from '@/lib/studio/mirror';

function stubFetch(status: number, body: unknown) {
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

const atomic = { view: 'atomic', version: 4, manifest };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the manifest atomic view', () => {
  it('reads the atomic view of the manifest route', async () => {
    const seen = stubFetch(200, atomic);
    render(<ManifestAtomic projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('manifest-atomic')).toBeInTheDocument());
    expect(seen[0]).toBe('/api/projects/p-1/manifest?view=atomic');
  });

  it('groups every item by the twelve groups', async () => {
    const { container } = stubAndRender();
    await waitFor(() => expect(screen.getByTestId('manifest-atomic')).toBeInTheDocument());
    for (const group of MANIFEST_GROUPS) {
      const panel = container.querySelector(`[data-group="${group}"]`);
      expect(panel, group).toBeTruthy();
      expect(within(panel as HTMLElement).getByText(GROUP_WORDING[group].heading)).toBeTruthy();
    }
  });

  it('expands every item of every group', async () => {
    const { container } = stubAndRender();
    await waitFor(() => expect(screen.getByTestId('manifest-atomic')).toBeInTheDocument());
    for (const group of MANIFEST_GROUPS) {
      const panel = container.querySelector(`[data-group="${group}"]`) as HTMLElement;
      for (const line of linesOfGroup(manifest, group)) {
        expect(
          panel.querySelector(`[data-line-subject="${CSS.escape(line.subject)}"]`),
          `${group} ${line.subject}`,
        ).toBeTruthy();
      }
    }
  });

  it('counts every line across the twelve groups', async () => {
    stubAndRender();
    await waitFor(() => expect(screen.getByTestId('manifest-found')).toBeInTheDocument());
    const total = MANIFEST_GROUPS.reduce(
      (held, group) => held + linesOfGroup(manifest, group).length,
      0,
    );
    expect(screen.getByTestId('manifest-found')).toHaveTextContent(
      `${total} lines across the twelve groups.`,
    );
  });

  it('narrows every group to the lines that hold the words typed', async () => {
    stubAndRender();
    await waitFor(() => expect(screen.getByTestId('manifest-atomic')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('Search every line'), 'berth');
    await waitFor(() =>
      expect(screen.getByTestId('manifest-found')).toHaveTextContent('hold those words'),
    );
    expect(screen.queryByText('booking.amount')).toBeNull();
    expect(screen.getByText('booking.berth')).toBeInTheDocument();
  });

  it('names the screen on every line and opens it', async () => {
    stubFetch(200, atomic);
    const opened: string[] = [];
    render(<ManifestAtomic projectId="p-1" onOpenScreen={(name) => opened.push(name)} />);
    await waitFor(() => expect(screen.getByText('booking.berth')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'Model, records' })[0]);
    expect(opened).toEqual(['Model, records']);
  });

  it('carries the mirror on the search control', async () => {
    const { container } = stubAndRender();
    await waitFor(() => expect(screen.getByTestId('manifest-atomic')).toBeInTheDocument());
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('names the fix when the Blueprint holds corrections', async () => {
    stubFetch(404, {
      error: {
        code: 'compiler.manifest_absent',
        message: 'The Blueprint holds corrections to make, so Cerulea produced no manifest.',
        fix: 'Open the model screen and make the correction the report names.',
        details: {},
      },
    });
    render(<ManifestAtomic projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('manifest-atomic-failure')).toBeInTheDocument());
  });
});

function stubAndRender() {
  stubFetch(200, atomic);
  return render(<ManifestAtomic projectId="p-1" />);
}
