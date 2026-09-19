import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import IntentReconciliation from './IntentReconciliation';
import { EXAMPLE_MANIFEST } from '@/lib/manifest/example';
import type { DeploymentManifest } from '@/lib/manifest/types';

const BUYER_STATEMENT =
  'We run a marketplace where a buyer verifies that a listing is authentic before paying the seller.';

function stubFetch(manifest: DeploymentManifest) {
  const seen: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    seen.push(url);
    return Promise.resolve(
      new Response(JSON.stringify({ view: 'atomic', version: 4, manifest }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return seen;
}

const withoutPublicEndpoint: DeploymentManifest = {
  ...EXAMPLE_MANIFEST,
  integration: EXAMPLE_MANIFEST.integration.map((entry) => ({ ...entry, visibility: 'clerk' })),
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('intent reconciliation on a seeded project', () => {
  it('flags buyer verification with the words that raised it', async () => {
    stubFetch(withoutPublicEndpoint);
    render(<IntentReconciliation projectId="p-1" statement={BUYER_STATEMENT} />);
    await waitFor(() =>
      expect(screen.getByTestId('intent-reconciliation')).toBeInTheDocument(),
    );
    const flags = screen.getByTestId('reconciliation-flags');
    expect(flags).toHaveTextContent('Verification anyone can carry out');
    expect(flags).toHaveTextContent('publishes no endpoint');
    expect(flags).toHaveTextContent('verifies');
  });

  it('states the goal it checked against', async () => {
    stubFetch(withoutPublicEndpoint);
    render(<IntentReconciliation projectId="p-1" statement={BUYER_STATEMENT} />);
    await waitFor(() => expect(screen.getByText(BUYER_STATEMENT)).toBeInTheDocument());
    expect(screen.getByTestId('reconciliation-headline')).toHaveTextContent('look absent');
  });

  it('opens the screen that closes the gap', async () => {
    stubFetch(withoutPublicEndpoint);
    const opened: string[] = [];
    render(
      <IntentReconciliation
        projectId="p-1"
        statement={BUYER_STATEMENT}
        onOpenScreen={(name) => opened.push(name)}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('reconciliation-flags')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Blueprint, views' }));
    expect(opened).toEqual(['Blueprint, views']);
  });

  it('says so once nothing the goal named looks absent', async () => {
    stubFetch({
      ...EXAMPLE_MANIFEST,
      integration: [
        ...EXAMPLE_MANIFEST.integration,
        {
          method: 'GET',
          path: '/verify/{record}',
          parameters: ['record in path'],
          response: 'The proof of one record',
          visibility: 'every role',
        },
      ],
    });
    render(
      <IntentReconciliation
        projectId="p-1"
        statement="A buyer verifies a listing before paying."
      />,
    );
    await waitFor(() => expect(screen.getByTestId('reconciliation-clear')).toBeInTheDocument());
  });

  it('names the words of the goal nothing answers', async () => {
    stubFetch(EXAMPLE_MANIFEST);
    render(
      <IntentReconciliation
        projectId="p-1"
        statement="We register every mooring against the harbour almanac."
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('reconciliation-unmatched')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('reconciliation-unmatched')).toHaveTextContent('almanac');
  });

  it('names the fix when the Blueprint holds corrections', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: 'compiler.manifest_absent',
              message: 'The Blueprint holds corrections to make, so Cerulea produced no manifest.',
              fix: 'Open the model screen and make the correction the report names.',
              details: {},
            },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    render(<IntentReconciliation projectId="p-1" statement={BUYER_STATEMENT} />);
    await waitFor(() => expect(screen.getByTestId('reconciliation-failure')).toBeInTheDocument());
  });
});
