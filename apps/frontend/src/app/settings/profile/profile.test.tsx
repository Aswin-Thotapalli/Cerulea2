import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from './page';

/**
 * The profile screen.
 *
 * Plain sentence. These tests check that the screen shows the account Cerulea
 * APIs holds, and names the fix when the account read fails.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

function answering(replies: { status: number; body: unknown }[]) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      const next = replies.shift() ?? { status: 500, body: {} };
      return new Response(JSON.stringify(next.body), {
        status: next.status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

describe('the profile screen', () => {
  it('shows the account behind the session', async () => {
    const calls = answering([
      {
        status: 200,
        body: {
          account: {
            displayName: 'Amara Registrar',
            email: 'amara@cerulea.test',
            multiFactorActive: true,
            lastSignInAt: null,
            createdAt: '2026-09-30T08:00:00.000Z',
          },
        },
      },
    ]);
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText('Amara Registrar')).toBeInTheDocument());
    expect(screen.getByText('amara@cerulea.test')).toBeInTheDocument();
    expect(screen.getByText(/Active. Every sign in asks for the code/)).toBeInTheDocument();
    expect(screen.getByText('No sign in recorded yet.')).toBeInTheDocument();
    expect(calls).toEqual(['/api/auth/me']);
  });

  it('names the fix and reads again on request', async () => {
    answering([
      {
        status: 401,
        body: {
          error: {
            code: 'session.absent',
            message: 'This screen reads work held against an account.',
            fix: 'Sign in with the account that holds the work, then open the screen again.',
          },
        },
      },
      {
        status: 200,
        body: {
          account: {
            displayName: 'Amara Registrar',
            email: 'amara@cerulea.test',
            multiFactorActive: false,
            lastSignInAt: '2026-09-30T09:00:00.000Z',
            createdAt: '2026-09-30T08:00:00.000Z',
          },
        },
      },
    ]);
    render(<ProfilePage />);
    await waitFor(() =>
      expect(screen.getByText('This screen reads work held against an account.')).toBeInTheDocument(),
    );
    expect(screen.getByText(/Sign in with the account that holds the work/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Read again' }));
    await waitFor(() => expect(screen.getByText('Amara Registrar')).toBeInTheDocument());
    expect(screen.getByText(/Not active yet/)).toBeInTheDocument();
  });
});
