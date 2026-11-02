import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { landingAfterSignIn, sameSitePath } from '@/lib/same-site-path';
import { GET } from './route';

/**
 * The sign out redirect stays on the Studio site.
 *
 * Internal security assessment finding S-01. The sign out route
 * read its landing page from the address and sent the browser there unread.
 * A link naming another site sent a person from Studio to a page a stranger
 * controls. These cases hold the fix in place.
 */
describe('the sign out landing page', () => {
  it('admits a path on this site', () => {
    expect(sameSitePath('/dashboard')).toBe('/dashboard');
    expect(sameSitePath('/auth/login?next=%2Fprojects')).toBe('/auth/login?next=%2Fprojects');
  });

  it('answers the home page for every value naming another site', () => {
    for (const value of [
      'https://attacker.example/',
      '//attacker.example/',
      '/\\attacker.example/',
      'javascript:alert(1)',
      '/%0d%0aSet-Cookie:x=1'.replace('%0d%0a', '\r\n'),
      '',
      null,
      undefined,
    ]) {
      expect(sameSitePath(value)).toBe('/');
    }
  });

  it('keeps the sign in landing page on this site', () => {
    // Finding S-02. The sign in screen assigned the address value to the
    // browser location, so a script address ran inside Studio after sign in.
    expect(landingAfterSignIn(null)).toBe('/dashboard');
    expect(landingAfterSignIn('/projects')).toBe('/projects');
    expect(landingAfterSignIn('javascript:alert(document.domain)')).toBe('/');
    expect(landingAfterSignIn('https://attacker.example/')).toBe('/');
    expect(landingAfterSignIn('//attacker.example/')).toBe('/');
  });

  it('sends the browser to the home page when the address names another site', async () => {
    const reply = await GET(
      new NextRequest('http://127.0.0.1:3000/api/auth/force-signout?next=https://attacker.example/'),
    );
    expect(reply.status).toBe(302);
    expect(reply.headers.get('location')).toBe('/');
  });

  it('keeps a landing page on this site', async () => {
    const reply = await GET(
      new NextRequest('http://127.0.0.1:3000/api/auth/force-signout?next=/auth/login'),
    );
    expect(reply.headers.get('location')).toBe('/auth/login');
  });
});
