import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RegisterPage from './page';

/**
 * Opening a Cerulea account.
 *
 * The screen sends the three values, shows the enrolment address and the
 * recovery codes once, and confirms one authenticator code before the account
 * opens. These tests check each request and what the screen shows after it.
 */

type Call = { url: string; method: string; body: unknown };

function stubRoutes(answers: Record<string, () => Promise<Response>>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null });
    const answer = answers[`${method} ${url}`];
    if (!answer) return Promise.reject(new Error(`No route for ${method} ${url}`));
    return answer();
  });
  return calls;
}

function json(status: number, body: unknown) {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
}

const enrolment = {
  secret: 'JBSWY3DPEHPK3PXP',
  uri: 'otpauth://totp/Cerulea:asha@cerulea.test?secret=JBSWY3DPEHPK3PXP',
  recoveryCodes: ['alpha-1111', 'bravo-2222', 'charlie-3333'],
};

async function fillAccount() {
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Asha Rao' } });
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'asha@cerulea.test' } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'a-long-passphrase' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('opening a Cerulea account', { timeout: 30000 }, () => {
  it('sends the three values, then shows the enrolment address and recovery codes', async () => {
    const calls = stubRoutes({ 'POST /api/auth/register': json(201, { enrolment }) });
    render(<RegisterPage />);
    expect(screen.getByRole('link', { name: 'Sign in instead' })).toHaveAttribute('href', '/auth/login');
    await fillAccount();
    await userEvent.click(screen.getByRole('button', { name: 'Open the account' }));

    expect(await screen.findByDisplayValue(enrolment.uri)).toBeInTheDocument();
    for (const entry of enrolment.recoveryCodes) {
      expect(screen.getByText(entry)).toBeInTheDocument();
    }
    expect(calls).toEqual([
      {
        url: '/api/auth/register',
        method: 'POST',
        body: { name: 'Asha Rao', email: 'asha@cerulea.test', password: 'a-long-passphrase' },
      },
    ]);
    expect(screen.queryByLabelText(/Full name/)).toBeNull();
  });

  it('confirms one code with the address and password, then opens the account', async () => {
    const calls = stubRoutes({
      'POST /api/auth/register': json(201, { enrolment }),
      'POST /api/auth/multi-factor': json(200, { confirmed: true }),
    });
    render(<RegisterPage />);
    await fillAccount();
    await userEvent.click(screen.getByRole('button', { name: 'Open the account' }));
    fireEvent.change(await screen.findByLabelText(/Authenticator code/), { target: { value: '123456' } });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and open the account' }));

    expect(await screen.findByText(/The account is open\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/auth/login');
    expect(calls[1]).toEqual({
      url: '/api/auth/multi-factor',
      method: 'POST',
      body: { email: 'asha@cerulea.test', password: 'a-long-passphrase', code: '123456' },
    });
    expect(screen.queryByLabelText(/Authenticator code/)).toBeNull();
  });

  it('shows the words Opening while the request is in flight', async () => {
    let release: (value: Response) => void = () => undefined;
    stubRoutes({
      'POST /api/auth/register': () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    });
    render(<RegisterPage />);
    await fillAccount();
    await userEvent.click(screen.getByRole('button', { name: 'Open the account' }));
    expect(screen.getByRole('button', { name: 'Opening' })).toBeDisabled();
    release(new Response(JSON.stringify({ enrolment }), { status: 201, headers: { 'content-type': 'application/json' } }));
    expect(await screen.findByDisplayValue(enrolment.uri)).toBeInTheDocument();
  });

  it('shows the message Cerulea named when the address is taken', async () => {
    stubRoutes({
      'POST /api/auth/register': json(409, {
        error: {
          code: 'auth.taken',
          message: 'An account already holds this address.',
          fix: 'Sign in with the address instead.',
        },
      }),
    });
    render(<RegisterPage />);
    await fillAccount();
    await userEvent.click(screen.getByRole('button', { name: 'Open the account' }));
    expect(
      await screen.findByText('An account already holds this address. Sign in with the address instead.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the account' })).toBeEnabled();
  });

  it('shows the raw failure when the network drops', async () => {
    stubRoutes({ 'POST /api/auth/register': () => Promise.reject(new Error('socket closed')) });
    render(<RegisterPage />);
    await fillAccount();
    await userEvent.click(screen.getByRole('button', { name: 'Open the account' }));
    expect(await screen.findByText('Error: socket closed')).toBeInTheDocument();
  });

  it('keeps the enrolment on screen when the code is refused', async () => {
    stubRoutes({
      'POST /api/auth/register': json(201, { enrolment }),
      'POST /api/auth/multi-factor': json(401, {
        error: { code: 'auth.code', message: 'Cerulea refused the code.', fix: 'Type the code the authenticator shows now.' },
      }),
    });
    render(<RegisterPage />);
    await fillAccount();
    await userEvent.click(screen.getByRole('button', { name: 'Open the account' }));
    fireEvent.change(await screen.findByLabelText(/Authenticator code/), { target: { value: '000000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and open the account' }));
    expect(
      await screen.findByText('Cerulea refused the code. Type the code the authenticator shows now.'),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(enrolment.uri)).toBeInTheDocument();
    expect(screen.queryByText(/The account is open\./)).toBeNull();
  });

  it('shows the raw failure when the confirmation cannot reach Cerulea', async () => {
    stubRoutes({
      'POST /api/auth/register': json(201, { enrolment }),
      'POST /api/auth/multi-factor': () => Promise.reject(new Error('timed out')),
    });
    render(<RegisterPage />);
    await fillAccount();
    await userEvent.click(screen.getByRole('button', { name: 'Open the account' }));
    fireEvent.change(await screen.findByLabelText(/Authenticator code/), { target: { value: '111111' } });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and open the account' }));
    await waitFor(() => expect(screen.getByText('Error: timed out')).toBeInTheDocument());
  });
});
