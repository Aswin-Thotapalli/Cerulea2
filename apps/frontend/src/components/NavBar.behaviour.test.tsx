import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';

/**
 * The bar across the top of every Studio screen.
 *
 * The bar reads the session. A signed out visitor sees the way in. A signed in
 * person sees the dashboard link and an account menu. These tests check what
 * the bar shows for each session and what each control does.
 */

type SessionState = {
  data: { user: Record<string, unknown> } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
};

let session: SessionState = { data: null, status: 'unauthenticated' };
const update = vi.fn();
const toggleTheme = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => ({ ...session, update }),
  signOut: () => undefined,
  getSession: () => Promise.resolve(null),
}));

vi.mock('@/app/providers', () => ({
  useThemeToggle: () => ({ toggleTheme }),
}));

import NavBar from './NavBar';

function show(mode: 'light' | 'dark' = 'light') {
  return render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <NavBar />
    </ThemeProvider>,
  );
}

// The test document holds no second page, so a followed link stays put.
function holdLinks(event: MouseEvent) {
  if ((event.target as Element | null)?.closest?.('a')) event.preventDefault();
}

beforeEach(() => {
  update.mockReset();
  toggleTheme.mockReset();
  session = { data: null, status: 'unauthenticated' };
  document.addEventListener('click', holdLinks, true);
});

afterEach(() => {
  document.removeEventListener('click', holdLinks, true);
  vi.unstubAllGlobals();
});

describe('the Studio bar', { timeout: 30000 }, () => {
  it('refreshes the session once when it mounts', () => {
    show();
    expect(update).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Cerulea Studio' })).toHaveAttribute('href', '/');
  });

  it('offers sign in and sign up to a signed out visitor', () => {
    show();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/auth/register');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
  });

  it('shows neither way in nor account while the session is loading', () => {
    session = { data: null, status: 'loading' };
    show();
    expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
  });

  it('offers dark mode in the light theme and toggles on a click', async () => {
    show('light');
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('offers light mode in the dark theme', () => {
    show('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('shows the initials of a signed in person and the account menu', async () => {
    session = {
      data: { user: { name: 'asha rao kumar', email: 'asha@cerulea.test', plan: 'pro' } },
      status: 'authenticated',
    };
    show();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    const account = screen.getByRole('button', { name: 'asha rao kumar' });
    expect(account).toHaveTextContent('AR');

    await userEvent.click(account);
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('asha rao kumar')).toBeInTheDocument();
    expect(within(menu).getByText('asha@cerulea.test')).toBeInTheDocument();
    expect(within(menu).getByText('PRO')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'My Profile' })).toHaveAttribute(
      'href',
      '/settings/profile',
    );

    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Dashboard' }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('closes the menu when the profile entry is chosen', async () => {
    session = { data: { user: { name: 'Ravi', email: 'ravi@cerulea.test' } }, status: 'authenticated' };
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Ravi' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'My Profile' }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('reads the initial from the address when the account carries no name', async () => {
    session = {
      data: { user: { email: 'zoe@cerulea.test', plan: 'starter' } },
      status: 'authenticated',
    };
    show();
    const account = screen.getByRole('button', { name: 'zoe@cerulea.test' });
    expect(account).toHaveTextContent('Z');
    await userEvent.click(account);
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('User')).toBeInTheDocument();
    expect(within(menu).getByText('STARTER')).toBeInTheDocument();
  });

  it('shows a question mark for an account with neither name nor address', () => {
    session = { data: { user: {} }, status: 'authenticated' };
    show();
    expect(screen.getByRole('button', { name: 'Profile' })).toHaveTextContent('?');
  });

  it('sends the person through the forced sign out on Sign Out', async () => {
    const place = { href: 'http://localhost/' };
    vi.stubGlobal('location', place);
    session = { data: { user: { name: 'Ravi', email: 'ravi@cerulea.test' } }, status: 'authenticated' };
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Ravi' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign Out' }));
    expect(place.href).toBe('/api/auth/force-signout?next=/auth/login');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});
