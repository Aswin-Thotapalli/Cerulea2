import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  PanelBody,
  PanelEmpty,
  describeFailure,
  usePanelData,
} from './PanelState';
import { StudioRouteError } from '@/lib/apiClient';

function stubFetch(replies: Array<{ status: number; body: unknown }>) {
  let index = 0;
  const seen: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    seen.push(url);
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return seen;
}

function Panel({ url }: { url: string }) {
  const reading = usePanelData<{ nodes: string[] }>(url);
  return (
    <PanelBody reading={reading} subject="the node list">
      {(data) =>
        data.nodes.length === 0 ? (
          <PanelEmpty heading="No node answers yet" explanation="Start a node, then read again." />
        ) : (
          <ul>
            {data.nodes.map((node) => (
              <li key={node}>{node}</li>
            ))}
          </ul>
        )
      }
    </PanelBody>
  );
}

describe('describeFailure', () => {
  it('separates the message from the fix Cerulea named', () => {
    const named = describeFailure(
      new StudioRouteError(
        {
          code: 'chain.unreachable',
          message: 'The node did not answer.',
          fix: 'Start the node, then read the panel again.',
          details: {},
        },
        503,
      ),
    );
    expect(named.message).toBe('The node did not answer.');
    expect(named.fix).toBe('Start the node, then read the panel again.');
  });

  it('names a fix for a failure carrying none', () => {
    expect(describeFailure(new Error('connect refused')).fix).toMatch(/Cerulea operator/);
  });
});

describe('a panel', () => {
  it('reads its route and renders the answer', async () => {
    const seen = stubFetch([{ status: 200, body: { nodes: ['first node', 'second node'] } }]);
    render(<Panel url="/api/dashboard/nodes" />);
    expect(screen.getByText(/Cerulea is reading the node list/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('first node')).toBeInTheDocument());
    expect(seen).toEqual(['/api/dashboard/nodes']);
    vi.unstubAllGlobals();
  });

  it('states what to do when the answer holds nothing', async () => {
    stubFetch([{ status: 200, body: { nodes: [] } }]);
    render(<Panel url="/api/dashboard/nodes" />);
    await waitFor(() => expect(screen.getByText('No node answers yet')).toBeInTheDocument());
    expect(screen.getByText('Start a node, then read again.')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('names the fix on a failure and reads again on request', async () => {
    stubFetch([
      {
        status: 503,
        body: {
          error: {
            code: 'chain.unreachable',
            message: 'The node did not answer.',
            fix: 'Start the node, then read the panel again.',
            details: {},
          },
        },
      },
      { status: 200, body: { nodes: ['first node'] } },
    ]);
    render(<Panel url="/api/dashboard/nodes" />);
    await waitFor(() =>
      expect(screen.getByText('The node did not answer.')).toBeInTheDocument(),
    );
    expect(screen.getByText('Start the node, then read the panel again.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Read again' }));
    await waitFor(() => expect(screen.getByText('first node')).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
