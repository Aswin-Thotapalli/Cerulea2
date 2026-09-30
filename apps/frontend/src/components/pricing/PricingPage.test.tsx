import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The subscription screen.
 *
 * Plain sentence. These tests check that a visitor meets the sign in step
 * with no failure on screen, and that a signed in person reads the plans.
 */

let status: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status, update: async () => null }),
}));

const { default: PricingPage } = await import('./PricingPage');

afterEach(() => {
  vi.unstubAllGlobals();
});

function answering(body: unknown) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

describe('the subscription screen', () => {
  it('invites a visitor to sign in and reads nothing before that', async () => {
    status = 'unauthenticated';
    const calls = answering({});
    render(<PricingPage />);
    await waitFor(() => expect(screen.getByTestId('pricing-sign-in')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/login?next=%2Fpricing',
    );
    expect(calls).toEqual([]);
    expect(screen.queryByRole('alert', { name: /error/i })).toBeNull();
  });

  it('reads the plans once a person has signed in', async () => {
    status = 'authenticated';
    const calls = answering({
      workspace: { workspaceId: 'w-1', name: 'Land Office' },
      plans: [
        { planId: 'starter', displayName: 'Starter', amountMinor: 250000, currency: 'INR', periodDays: 30 },
      ],
      subscription: null,
      invoices: [],
    });
    render(<PricingPage />);
    await waitFor(() => expect(screen.getByText('Starter')).toBeInTheDocument(), { timeout: 15000 });
    expect(calls).toEqual(['/api/billing/subscription']);
    expect(screen.getByText('each month')).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-sign-in')).toBeNull();
  });
});
