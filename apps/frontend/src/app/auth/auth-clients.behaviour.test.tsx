import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The sign in screen and the password reset screen.
 *
 * Both read the address, send one request and either land the person on the
 * next screen or name what went wrong. These tests check the request each one
 * sends, the landing it chooses and the message it shows on refusal.
 */

const signIn = vi.fn();
const push = vi.fn();
let search = new URLSearchParams();

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => search,
  useRouter: () => ({ push, replace: () => undefined, refresh: () => undefined }),
}));

import LoginClient from './login/LoginClient';
import ResetPasswordClient from './reset-password/ResetPasswordClient';

async function signInWith(code: string) {
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'asha@cerulea.test' } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'a-long-passphrase' } });
  fireEvent.change(screen.getByLabelText(/Authenticator code/), { target: { value: code } });
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => {
  signIn.mockReset();
  push.mockReset();
  search = new URLSearchParams();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the sign in screen', { timeout: 30000 }, () => {
  it('sends the three values and lands on the dashboard by default', async () => {
    const place = { href: 'http://localhost/auth/login' };
    vi.stubGlobal('location', place);
    signIn.mockResolvedValue({ ok: true, error: null });
    render(<LoginClient />);
    expect(screen.getByRole('link', { name: 'Open an account' })).toHaveAttribute('href', '/auth/register');
    expect(screen.getByRole('link', { name: 'Recover the password' })).toHaveAttribute('href', '/auth/forgot-password');

    await signInWith('123456');
    expect(signIn).toHaveBeenCalledWith('credentials', {
      redirect: false,
      email: 'asha@cerulea.test',
      password: 'a-long-passphrase',
      multiFactorCode: '123456',
    });
    await waitFor(() => expect(place.href).toBe('/dashboard'));
  });

  it('lands on the same site path the address carries and refuses another site', async () => {
    const place = { href: 'http://localhost/auth/login' };
    vi.stubGlobal('location', place);
    signIn.mockResolvedValue({ ok: true, error: null });
    search = new URLSearchParams({ next: '/dashboard/keys?tab=2' });
    const { unmount } = render(<LoginClient />);
    await signInWith('123456');
    await waitFor(() => expect(place.href).toBe('/dashboard/keys?tab=2'));
    unmount();

    place.href = 'http://localhost/auth/login';
    search = new URLSearchParams({ next: 'https://elsewhere.test/steal' });
    render(<LoginClient />);
    await signInWith('123456');
    await waitFor(() => expect(place.href).toBe('/'));
  });

  it('names a refused sign in and keeps the person on the screen', async () => {
    signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });
    render(<LoginClient />);
    await signInWith('000000');
    expect(
      await screen.findByText(
        'Cerulea refused the address, the password or the code. Check all three and sign in again.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows any other error the sign in named', async () => {
    signIn.mockResolvedValue({ ok: false, error: 'The account is locked for ten minutes.' });
    render(<LoginClient />);
    await signInWith('000000');
    expect(await screen.findByText('The account is locked for ten minutes.')).toBeInTheDocument();
  });

  it('says so when Cerulea gives no answer at all', async () => {
    signIn.mockResolvedValue(undefined);
    render(<LoginClient />);
    await signInWith('000000');
    expect(
      await screen.findByText('Cerulea did not answer. Check that Cerulea APIs is running, then sign in again.'),
    ).toBeInTheDocument();
  });

  it('opens with a notice when the address carries an earlier error', () => {
    search = new URLSearchParams({ error: 'CredentialsSignin' });
    render(<LoginClient />);
    expect(
      screen.getByText('The earlier sign in did not complete. Type the three values and sign in again.'),
    ).toBeInTheDocument();
  });

  it('shows the words Signing in while the request is in flight', async () => {
    signIn.mockReturnValue(new Promise(() => undefined));
    render(<LoginClient />);
    await signInWith('123456');
    expect(screen.getByRole('button', { name: 'Signing in' })).toBeDisabled();
  });
});

describe('the password reset screen', { timeout: 30000 }, () => {
  it('holds the button back until the link carries its recovery value', () => {
    render(<ResetPasswordClient />);
    expect(screen.getByRole('button', { name: 'Set the password' })).toBeDisabled();
    expect(screen.getByText('Open the link from the email.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/auth/login');
  });

  it('sends the recovery value and the password, then moves to sign in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init?.body)) });
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    search = new URLSearchParams({ token: 'recover-77' });
    render(<ResetPasswordClient />);
    expect(screen.getByText('The link carries its recovery value.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'twelve-long-words' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Set the password' }).closest('form') as HTMLFormElement);

    expect(await screen.findByText(/The password is set\./)).toBeInTheDocument();
    expect(calls).toEqual([
      { url: '/api/auth/reset-password', body: { token: 'recover-77', password: 'twelve-long-words' } },
    ]);
    expect(push).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(push).toHaveBeenCalledWith('/auth/login');
    vi.useRealTimers();
  });

  it('names the refusal and stays on the screen', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 400 })));
    search = new URLSearchParams({ token: 'recover-77' });
    render(<ResetPasswordClient />);
    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Set the password' }).closest('form') as HTMLFormElement);
    expect(
      await screen.findByText(
        'Cerulea refused the link or the password. Ask for a new recovery link, then set a password of twelve characters.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/The password is set\./)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
