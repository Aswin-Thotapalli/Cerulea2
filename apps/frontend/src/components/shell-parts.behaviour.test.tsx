import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';

/**
 * Four small parts of the Studio shell.
 *
 * The account menu, the sign in gate, the autosave badge and the glass panel.
 * Each one reads one source and shows one state. These tests check the state
 * each one shows for its input and what its controls do.
 */

const replace = vi.fn();
let pathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace, push: () => undefined, refresh: () => undefined }),
}));

import AuthGate from './AuthGate';
import UserMenu from './UserMenu';
import AutosaveBadge from './common/AutosaveBadge';
import { GlassPanel } from './ui/GlassPanel';

function stubMe(answer: () => Promise<Response>) {
  const calls: { url: string; method: string }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET' });
    return answer();
  });
  return calls;
}

function me(body: unknown) {
  return () =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));
}

beforeEach(() => {
  replace.mockReset();
  pathname = '/dashboard';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('the account menu', { timeout: 30000 }, () => {
  it('offers the way in when nobody is signed in', async () => {
    const calls = stubMe(() => Promise.resolve(new Response('', { status: 401 })));
    render(<UserMenu />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/auth/register');
    expect(calls[0]).toEqual({ url: '/api/auth/me', method: 'GET' });
  });

  it('treats a failed read as signed out', async () => {
    stubMe(() => Promise.reject(new Error('offline')));
    render(<UserMenu />);
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows the initial and the account line, then signs out through the logout route', async () => {
    const place = { href: 'http://localhost/dashboard' };
    vi.stubGlobal('location', place);
    const calls = stubMe(me({ id: 'u-1', email: 'asha@cerulea.test', name: 'asha rao' }));
    const heard = vi.fn();
    window.addEventListener('cerulea-auth-changed', heard);
    render(<UserMenu />);

    const account = await screen.findByRole('button', { name: 'Account' });
    expect(account).toHaveTextContent('A');
    await userEvent.click(account);
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('asha rao · asha@cerulea.test');
    expect(screen.getByRole('menuitem', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/settings/profile');

    await userEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
    await waitFor(() => expect(place.href).toBe('/auth/login'));
    expect(calls.some((call) => call.url === '/api/auth/logout' && call.method === 'POST')).toBe(true);
    expect(heard).toHaveBeenCalled();
    window.removeEventListener('cerulea-auth-changed', heard);
  });

  it('shows the address alone when the account carries no name, and reads again on focus', async () => {
    const calls = stubMe(me({ id: 'u-2', email: 'zoe@cerulea.test' }));
    render(<UserMenu />);
    const account = await screen.findByRole('button', { name: 'Account' });
    expect(account).toHaveTextContent('Z');
    await userEvent.click(account);
    expect(await screen.findByRole('menu')).toHaveTextContent('zoe@cerulea.test');
    expect(screen.getByRole('menu')).not.toHaveTextContent('·');

    const before = calls.length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('cerulea-auth-changed'));
    });
    await waitFor(() => expect(calls.length).toBe(before + 2));
  });

  it('still signs out when the logout route cannot be reached', async () => {
    const place = { href: 'http://localhost/dashboard' };
    vi.stubGlobal('location', place);
    let reads = 0;
    vi.stubGlobal('fetch', (url: string) => {
      if (url === '/api/auth/logout') return Promise.reject(new Error('offline'));
      reads += 1;
      return me({ id: 'u-1', email: 'asha@cerulea.test' })();
    });
    render(<UserMenu />);
    await userEvent.click(await screen.findByRole('button', { name: 'Account' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Logout' }));
    await waitFor(() => expect(place.href).toBe('/auth/login'));
    expect(reads).toBeGreaterThan(0);
  });
});

describe('the sign in gate', { timeout: 30000 }, () => {
  it('shows the children once the account reads back', async () => {
    stubMe(me({ id: 'u-1', email: 'asha@cerulea.test' }));
    render(
      <AuthGate>
        <p>The guarded dashboard</p>
      </AuthGate>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('The guarded dashboard')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a signed out visitor to sign in with the dashboard as the landing', async () => {
    stubMe(() => Promise.resolve(new Response('', { status: 401 })));
    render(
      <AuthGate>
        <p>The guarded dashboard</p>
      </AuthGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth/login?next=/dashboard'));
  });

  it('sends the visitor to sign in when the account cannot be read', async () => {
    stubMe(() => Promise.reject(new Error('offline')));
    render(
      <AuthGate>
        <p>The guarded dashboard</p>
      </AuthGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth/login?next=/dashboard'));
  });
});

describe('the autosave badge', () => {
  it('reads the stored state for its project and names each state', () => {
    window.localStorage.setItem(
      'studio:p-1:autosaveStatus',
      JSON.stringify({ status: 'saved', bucket: 'blueprint', ts: Date.UTC(2026, 8, 30, 6, 0, 0) }),
    );
    const { unmount } = render(<AutosaveBadge projectId="p-1" />);
    expect(screen.getByText('Saved (blueprint)')).toBeInTheDocument();
    unmount();

    window.localStorage.setItem('studio:p-2:autosaveStatus', JSON.stringify({ status: 'saving' }));
    render(<AutosaveBadge projectId="p-2" />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('shows Idle for a project with no stored state and follows a later write', async () => {
    vi.useFakeTimers();
    render(<AutosaveBadge projectId="p-3" />);
    expect(screen.getByText('Idle')).toBeInTheDocument();

    window.localStorage.setItem('studio:p-3:autosaveStatus', JSON.stringify({ status: 'error' }));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'studio:p-3:autosaveStatus' }));
    });
    expect(screen.getByText('Save failed')).toBeInTheDocument();

    window.localStorage.setItem('studio:p-3:autosaveStatus', JSON.stringify({ status: 'saved' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('ignores a stored value that is no record', () => {
    window.localStorage.setItem('studio:p-4:autosaveStatus', 'not json');
    render(<AutosaveBadge projectId="p-4" />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });
});

describe('the glass panel', () => {
  it('draws a light and a dark surface from the theme', () => {
    const { unmount } = render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>
        <GlassPanel data-testid="glass">Light</GlassPanel>
      </ThemeProvider>,
    );
    const light = window.getComputedStyle(screen.getByTestId('glass'));
    expect(light.backgroundColor).toBe('rgba(255, 255, 255, 0.5)');
    expect(light.borderColor).toBe('rgba(0, 0, 0, 0.15)');
    unmount();

    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <GlassPanel data-testid="glass">Dark</GlassPanel>
      </ThemeProvider>,
    );
    const dark = window.getComputedStyle(screen.getByTestId('glass'));
    expect(dark.backgroundColor).toBe('rgba(29, 39, 58, 0.6)');
    expect(dark.borderColor).toBe('rgba(255, 255, 255, 0.15)');
  });
});
