import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy, createNonce, policyDirectives } from './content-security-policy';

/**
 * The content security policy Studio answers every screen with.
 *
 * Plain sentence. These tests check that the policy trusts the scripts
 * carrying this request's nonce, adds code evaluation for a development run
 * alone, and keeps every other directive strict.
 */

describe('the content security policy', () => {
  it('trusts the nonce of the request and the scripts those scripts load', () => {
    const policy = contentSecurityPolicy({ nonce: 'abc123', development: false });
    expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('adds code evaluation for a development run alone', () => {
    const policy = contentSecurityPolicy({ nonce: 'abc123', development: true });
    expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic' 'unsafe-eval'");
  });

  it('keeps every other directive strict', () => {
    const directives = Object.fromEntries(
      policyDirectives({ nonce: 'n', development: false }),
    );
    expect(directives['default-src']).toEqual(["'self'"]);
    expect(directives['connect-src']).toEqual(["'self'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['form-action']).toEqual(["'self'"]);
    expect(directives['upgrade-insecure-requests']).toEqual([]);
  });

  it('names a further data origin when one is given', () => {
    const policy = contentSecurityPolicy({
      nonce: 'n',
      development: false,
      connectSources: ['http://127.0.0.1:4000'],
    });
    expect(policy).toContain("connect-src 'self' http://127.0.0.1:4000");
  });

  it('draws a different base64 nonce of sixteen bytes each time', () => {
    const first = createNonce();
    const second = createNonce();
    expect(first).not.toBe(second);
    expect(atob(first)).toHaveLength(16);
    expect(first).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe('the upgrade directive', () => {
  it('asks the browser to upgrade requests on a page served over HTTPS', () => {
    expect(contentSecurityPolicy({ nonce: 'n', development: false, secureTransport: true })).toContain(
      'upgrade-insecure-requests',
    );
    expect(contentSecurityPolicy({ nonce: 'n', development: false })).toContain(
      'upgrade-insecure-requests',
    );
  });

  it('leaves the directive out on a page served over plain HTTP', () => {
    expect(
      contentSecurityPolicy({ nonce: 'n', development: false, secureTransport: false }),
    ).not.toContain('upgrade-insecure-requests');
  });
});
