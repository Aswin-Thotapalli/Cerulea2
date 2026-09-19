import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ManifestExport from './ManifestExport';
import { EXAMPLE_MANIFEST } from '@/lib/manifest/example';

const saved: { name: string; type: string }[] = [];

function stubFetch(status = 200, body?: unknown) {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          body ?? { view: 'atomic', version: 4, manifest: EXAMPLE_MANIFEST },
        ),
        { status, headers: { 'content-type': 'application/json' } },
      ),
    ),
  );
}

beforeEach(() => {
  saved.length = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:held',
    revokeObjectURL: () => undefined,
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(
    this: HTMLAnchorElement,
  ) {
    saved.push({ name: this.download, type: this.href });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the manifest export', () => {
  it('offers the document and the data file', async () => {
    stubFetch();
    render(<ManifestExport projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save the document' })).toBeEnabled(),
    );
    expect(screen.getByRole('button', { name: 'Save the data file' })).toBeEnabled();
  });

  it('saves the document in the house format', async () => {
    stubFetch();
    render(<ManifestExport projectId="p-1" statement="A buyer verifies a listing." />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save the document' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save the document' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe('berth-register-manifest-version-4.docx');
    await waitFor(() =>
      expect(screen.getByText(/berth-register-manifest-version-4.docx/)).toBeInTheDocument(),
    );
  });

  it('saves the data file beside it', async () => {
    stubFetch();
    render(<ManifestExport projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save the data file' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save the data file' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe('berth-register-manifest-version-4.json');
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
    render(<ManifestExport projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('manifest-export-failure')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Save the document' })).toBeDisabled();
  });
});
