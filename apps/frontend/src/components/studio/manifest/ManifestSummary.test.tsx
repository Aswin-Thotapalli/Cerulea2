import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ManifestSummary from './ManifestSummary';
import { EXAMPLE_MANIFEST as manifest } from '@/lib/manifest/example';

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the manifest summary view', () => {
  it('reads the summary view of the manifest route', async () => {
    const seen = stubFetch(200, { view: 'summary', version: 4, summary: manifest.summary });
    render(<ManifestSummary projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('manifest-summary')).toBeInTheDocument());
    expect(seen[0]).toBe('/api/projects/p-1/manifest?view=summary');
    expect(screen.getByText('Version 4')).toBeInTheDocument();
  });

  it('shows every headline figure with its sentence', async () => {
    stubFetch(200, { view: 'summary', version: 4, summary: manifest.summary });
    render(<ManifestSummary projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('Kinds of record')).toBeInTheDocument());
    expect(screen.getByText('Every kind of record this system keeps.')).toBeInTheDocument();
    expect(screen.getByText('Parts installed')).toBeInTheDocument();
    expect(screen.getByText(/This deployment installs 6 parts/)).toBeInTheDocument();
  });

  it('opens the screen a figure names', async () => {
    stubFetch(200, { view: 'summary', version: 4, summary: manifest.summary });
    const opened: string[] = [];
    render(<ManifestSummary projectId="p-1" onOpenScreen={(screenName) => opened.push(screenName)} />);
    await waitFor(() => expect(screen.getByText('Kinds of record')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'Model, records' })[0]);
    expect(opened).toEqual(['Model, records']);
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
    render(<ManifestSummary projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('manifest-summary-failure')).toBeInTheDocument(),
    );
    expect(
      screen.getByText('Open the model screen and make the correction the report names.'),
    ).toBeInTheDocument();
  });
});
