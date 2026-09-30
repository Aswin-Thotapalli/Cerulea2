import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The sign in dialog a screen raises before a guarded action.
 *
 * The dialog signs a person in, or opens an account and signs it in. These
 * tests check the calls each tab makes and what the dialog shows after them.
 */

const signIn = vi.fn();

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

import AuthModal from './AuthModal';

type Call = { url: string; method: string; body: unknown };

function stubRegister(response: () => Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    });
    return response();
  });
  return calls;
}

function show(props: Partial<React.ComponentProps<typeof AuthModal>> = {}) {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  render(<AuthModal open onSuccess={onSuccess} onClose={onClose} {...props} />);
  return { onSuccess, onClose };
}

async function fillRegistration() {
  await userEvent.click(screen.getByRole('tab', { name: 'Create Account' }));
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Asha Rao' } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'asha@cerulea.test' } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'a-long-passphrase' } });
}

beforeEach(() => {
  signIn.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the sign in dialog', { timeout: 30000 }, () => {
  it('shows the title and subtitle the screen passed, and closes on the close button', async () => {
    const { onClose } = show({ title: 'Sign in to deploy', subtitle: 'Deployment needs an account.' });
    expect(screen.getByText('Sign in to deploy')).toBeInTheDocument();
    expect(screen.getByText('Deployment needs an account.')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('signs in with the typed values and reports success', async () => {
    signIn.mockResolvedValue({ ok: true, error: null });
    const { onSuccess } = show();
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ravi@cerulea.test' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret-words' } });
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(signIn).toHaveBeenCalledWith('credentials', {
      redirect: false,
      email: 'ravi@cerulea.test',
      password: 'secret-words',
    });
  });

  it('names a refused sign in and holds the dialog open', async () => {
    signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });
    const { onSuccess } = show();
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ravi@cerulea.test' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'wrong' } });
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('tab', { name: 'Create Account' }));
    expect(screen.queryByText('Invalid email or password.')).toBeNull();
  });

  it('shows the words Signing in while the request is in flight', async () => {
    signIn.mockReturnValue(new Promise(() => undefined));
    show();
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ravi@cerulea.test' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret-words' } });
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });

  it('opens an account, signs it in and sends the person to choose a plan', async () => {
    const place = { hostname: 'localhost', href: 'http://localhost:3001/studio' };
    vi.stubGlobal('location', place);
    const calls = stubRegister(() => Promise.resolve(new Response('{}', { status: 201 })));
    signIn.mockResolvedValue({ ok: true, error: null });
    show();
    await fillRegistration();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() =>
      expect(place.href).toBe(
        `http://localhost:3000/pricing?return=${encodeURIComponent('http://localhost:3001/studio')}`,
      ),
    );
    expect(calls).toEqual([
      {
        url: '/api/auth/register',
        method: 'POST',
        body: { name: 'Asha Rao', email: 'asha@cerulea.test', password: 'a-long-passphrase' },
      },
    ]);
    expect(signIn).toHaveBeenCalledWith('credentials', {
      redirect: false,
      email: 'asha@cerulea.test',
      password: 'a-long-passphrase',
    });
  });

  it('sends a person on the public site to the public plan screen', async () => {
    const place = { hostname: 'studio.cerulea.app', href: 'https://studio.cerulea.app/' };
    vi.stubGlobal('location', place);
    stubRegister(() => Promise.resolve(new Response('{}', { status: 201 })));
    signIn.mockResolvedValue({ ok: true, error: null });
    show();
    await fillRegistration();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() =>
      expect(place.href).toBe(
        `https://cerulea.app/pricing?return=${encodeURIComponent('https://studio.cerulea.app/')}`,
      ),
    );
  });

  it('shows the reason the account was refused', async () => {
    stubRegister(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'The address is taken.' }), { status: 409 })),
    );
    show();
    await fillRegistration();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('The address is taken.')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('falls back to a plain refusal when the answer carries no reason', async () => {
    stubRegister(() => Promise.resolve(new Response('not json', { status: 500 })));
    show();
    await fillRegistration();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('Failed')).toBeInTheDocument();
  });

  it('names a registration failure with an empty reason', async () => {
    stubRegister(() => Promise.resolve(new Response(JSON.stringify({ error: '' }), { status: 400 })));
    show();
    await fillRegistration();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('Registration failed')).toBeInTheDocument();
  });

  it('returns to the sign in tab when the new account cannot sign in at once', async () => {
    stubRegister(() => Promise.resolve(new Response('{}', { status: 201 })));
    signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });
    show();
    await fillRegistration();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('Account created. Please sign in.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign In' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });
});
