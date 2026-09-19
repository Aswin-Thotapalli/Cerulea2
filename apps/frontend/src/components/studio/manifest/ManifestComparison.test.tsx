import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ManifestComparisonView from './ManifestComparison';
import {
  COMPARISON_BANDS,
  comparisonHeadline,
  comparisonKinds,
  screenForComparisonLine,
} from '@/lib/manifest/comparison';
import { controlsWithoutMirror } from '@/lib/studio/mirror';

const comparison = {
  previousBlueprintHash: 'hash-previous',
  currentBlueprintHash: 'hash-current',
  additions: ['Field booking.amount', 'Screen booking_list'],
  removals: ['Permission clerk on berth'],
  changes: ['Action record_booking'],
  identical: false,
};

const versions = [
  { version: 4, note: 'Added the amount field', createdAt: '2026-09-19T10:00:00.000Z' },
  { version: 3, note: 'Composed the parts', createdAt: '2026-09-19T09:00:00.000Z' },
];

function stubFetch(over: { comparison?: unknown; status?: number } = {}) {
  const seen: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    seen.push(url);
    if (url.includes('/blueprint/versions')) {
      return Promise.resolve(
        new Response(JSON.stringify({ versions }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify(
          over.comparison ?? { view: 'comparison', version: 4, comparison },
        ),
        {
          status: over.status ?? 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
  });
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading a comparison', () => {
  it('names three bands with a sentence each', () => {
    expect(COMPARISON_BANDS.map((band) => band.key)).toEqual([
      'additions',
      'removals',
      'changes',
    ]);
    for (const band of COMPARISON_BANDS) {
      expect(band.states.endsWith('.')).toBe(true);
      expect(band.whenEmpty.endsWith('.')).toBe(true);
      expect(band.heading.endsWith('.')).toBe(false);
    }
  });

  it('names the screen that produces every kind of line', () => {
    expect(screenForComparisonLine('Field booking.amount')).toBe('Model, records');
    expect(screenForComparisonLine('Action record_booking')).toBe('Model, rules and actions');
    expect(screenForComparisonLine('Workflow booking_flow')).toBe('Model, workflows');
    expect(screenForComparisonLine('Rule berth_free')).toBe('Model, rules and actions');
    expect(screenForComparisonLine('Permission clerk on booking')).toBe('Model, permissions');
    expect(screenForComparisonLine('Screen booking_list')).toBe('Blueprint, views');
    expect(screenForComparisonLine('Endpoint GET /booking')).toBe('Blueprint, views');
    expect(screenForComparisonLine('Something else')).toBe('Blueprint');
  });

  it('reads the kinds a set of lines names', () => {
    expect(comparisonKinds([...comparison.additions, ...comparison.removals])).toEqual([
      'Field',
      'Screen',
      'Permission',
    ]);
  });

  it('states what moved in one sentence', () => {
    expect(comparisonHeadline(comparison)).toBe(
      '4 lines moved. 2 added, 1 removed and 1 changed.',
    );
    expect(
      comparisonHeadline({ ...comparison, identical: true }),
    ).toContain('Nothing moved');
    expect(
      comparisonHeadline({ ...comparison, previousBlueprintHash: undefined }),
    ).toContain('first manifest');
  });
});

describe('the manifest comparison view', () => {
  it('sets the current manifest against the previous version', async () => {
    const seen = stubFetch();
    render(<ManifestComparisonView projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('manifest-comparison')).toBeInTheDocument());
    await waitFor(() =>
      expect(seen.some((url) => url.includes('view=comparison&against=3'))).toBe(true),
    );
  });

  it('shows the additions, the removals and the changes', async () => {
    const { container } = render2();
    await waitFor(() => expect(screen.getByTestId('manifest-comparison')).toBeInTheDocument());
    for (const band of COMPARISON_BANDS) {
      expect(container.querySelector(`[data-band="${band.key}"]`), band.key).toBeTruthy();
    }
    await waitFor(() => expect(screen.getByText('Field booking.amount')).toBeInTheDocument());
    expect(screen.getByText('Permission clerk on berth')).toBeInTheDocument();
    expect(screen.getByText('Action record_booking')).toBeInTheDocument();
  });

  it('states what moved', async () => {
    render2();
    await waitFor(() =>
      expect(screen.getByTestId('comparison-headline')).toHaveTextContent(
        '4 lines moved. 2 added, 1 removed and 1 changed.',
      ),
    );
  });

  it('opens the screen a moved line names', async () => {
    stubFetch();
    const opened: string[] = [];
    render(<ManifestComparisonView projectId="p-1" onOpenScreen={(name) => opened.push(name)} />);
    await waitFor(() => expect(screen.getByText('Field booking.amount')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'Model, records' })[0]);
    expect(opened).toEqual(['Model, records']);
  });

  it('states that nothing moved where the two manifests match', async () => {
    stubFetch({
      comparison: {
        view: 'comparison',
        version: 4,
        comparison: {
          ...comparison,
          additions: [],
          removals: [],
          changes: [],
          identical: true,
        },
      },
    });
    render(<ManifestComparisonView projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('comparison-headline')).toHaveTextContent('Nothing moved'),
    );
    expect(
      screen.getByText('This deployment adds nothing the previous deployment lacked.'),
    ).toBeInTheDocument();
  });

  it('carries the mirror on the version control', async () => {
    const { container } = render2();
    await waitFor(() => expect(screen.getByTestId('manifest-comparison')).toBeInTheDocument());
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('names the fix when the Blueprint holds corrections', async () => {
    stubFetch({
      status: 404,
      comparison: {
        error: {
          code: 'compiler.manifest_absent',
          message: 'The Blueprint holds corrections to make, so Cerulea produced no manifest.',
          fix: 'Open the model screen and make the correction the report names.',
          details: {},
        },
      },
    });
    render(<ManifestComparisonView projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('manifest-comparison-failure')).toBeInTheDocument(),
    );
  });
});

function render2() {
  stubFetch();
  return render(<ManifestComparisonView projectId="p-1" />);
}
