import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The sign in, registration and password screens on a phone.
 *
 * A panel of fixed width pushed each screen 30 to 146 pixels past a 375 pixel
 * phone, so the page scrolled sideways. Each panel now fills the width it is
 * given up to its reading width. The browser check at
 * scripts/launch/phone-fit.mjs measures the rendered screens at 375 pixels;
 * this file holds the panel styles that make the fit.
 *
 * Plain sentence. These tests check that no account screen asks for more
 * width than the phone it opens on.
 */

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const { default: LoginClient } = await import('./login/LoginClient');
const { default: RegisterPage } = await import('./register/page');
const { default: ForgotPasswordPage } = await import('./forgot-password/page');
const { default: ResetPasswordClient } = await import('./reset-password/ResetPasswordClient');

/** The panel holding the form of one screen. */
function panelOf(container: HTMLElement): HTMLElement {
  const panel = container.querySelector('.MuiPaper-root');
  if (!(panel instanceof HTMLElement)) throw new Error('The screen rendered no form panel.');
  return panel;
}

describe('the account screens on a 375 pixel phone', () => {
  const screens: [string, () => JSX.Element, string][] = [
    ['sign in', () => <LoginClient />, '420px'],
    ['registration', () => <RegisterPage />, '520px'],
    ['password recovery', () => <ForgotPasswordPage />, '420px'],
    ['password reset', () => <ResetPasswordClient />, '420px'],
  ];

  for (const [name, draw, reading] of screens) {
    it(`gives the ${name} panel the width of the screen up to ${reading}`, () => {
      window.innerWidth = 375;
      const { container } = render(draw());
      const style = getComputedStyle(panelOf(container));
      expect(style.width).toBe('100%');
      expect(style.maxWidth).toBe(reading);
      expect(style.boxSizing).toBe('border-box');
    });
  }
});
