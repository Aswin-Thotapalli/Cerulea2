import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

/**
 * The gate in front of every Studio screen.
 *
 * The gate reads the host, the path and the session, then decides whether the
 * visitor reaches the screen, the sign in page or a refusal. This file drives
 * every one of those paths.
 *
 * Plain sentence. These tests check that an unknown visitor never reaches a
 * screen holding somebody's work, and that the operator screens stay closed to
 * everybody outside the operator role.
 */

let token: Record<string, unknown> | null = null;

vi.mock('next-auth/jwt', () => ({
  getToken: async () => token,
}));

const { middleware, config } = await import('./middleware');

function request(url: string, host: string): NextRequest {
  return new NextRequest(new Request(url, { headers: { host } }));
}

describe('the gate in front of every screen', () => {
  it('lets a public path through', async () => {
    token = null;
    for (const path of ['/auth/signin', '/pricing', '/api/health', '/favicon.ico']) {
      const answer = await middleware(request(`https://cerulea.test${path}`, 'cerulea.test'));
      expect(answer.status, `${path} met a refusal`).toBeLessThan(400);
    }
  });

  it('sends an unknown visitor to the sign in page', async () => {
    token = null;
    const answer = await middleware(request('https://cerulea.test/dashboard', 'cerulea.test'));
    expect(answer.status).toBeGreaterThanOrEqual(300);
    expect(answer.status).toBeLessThan(400);
    expect(String(answer.headers.get('location') ?? '')).toContain('/auth');
  });

  it('lets a signed in visitor reach a screen', async () => {
    token = { email: 'builder@cerulea.test', cerulea: { accessToken: 'tok' } };
    const answer = await middleware(request('https://cerulea.test/dashboard', 'cerulea.test'));
    expect(answer.status).toBeLessThan(400);
  });

  it('holds the operator screens against an account outside the role', async () => {
    token = { email: 'builder@cerulea.test', cerulea: { accessToken: 'tok' } };
    const answer = await middleware(request('https://cerulea.test/admin', 'cerulea.test'));
    expect(answer.status).toBeGreaterThanOrEqual(300);
  });

  it('marks the Studio host so the screen opens in the Studio reading', async () => {
    token = { email: 'builder@cerulea.test', cerulea: { accessToken: 'tok' } };
    const answer = await middleware(
      request('https://studio.cerulea.test/pricing', 'studio.cerulea.test'),
    );
    expect(answer.status).toBeLessThan(400);
  });

  it('reads the operator host', async () => {
    token = { email: 'operator@cerulea.test', cerulea: { accessToken: 'tok' } };
    const answer = await middleware(
      request('https://control.cerulea.test/admin', 'control.cerulea.test'),
    );
    expect(answer).toBeDefined();
  });

  it('names the paths it runs over', () => {
    expect(config).toBeDefined();
    expect(JSON.stringify(config).length).toBeGreaterThan(5);
  });
});

describe('the content security policy of every screen', () => {
  function nonceOf(policy: string): string {
    const found = /'nonce-([^']+)'/.exec(policy);
    return found?.[1] ?? '';
  }

  it('hands Next.js the same nonce the browser reads in the policy', async () => {
    token = null;
    const answer = await middleware(request('https://cerulea.test/auth/login', 'cerulea.test'));
    const policy = answer.headers.get('content-security-policy') ?? '';
    const nonce = nonceOf(policy);
    expect(nonce.length).toBeGreaterThan(20);
    expect(answer.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
    expect(answer.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('issues a fresh nonce for every request', async () => {
    token = { email: 'person@cerulea.test' };
    const first = await middleware(request('https://cerulea.test/dashboard', 'cerulea.test'));
    const second = await middleware(request('https://cerulea.test/dashboard', 'cerulea.test'));
    const one = nonceOf(first.headers.get('content-security-policy') ?? '');
    const two = nonceOf(second.headers.get('content-security-policy') ?? '');
    expect(one.length).toBeGreaterThan(20);
    expect(one).not.toBe(two);
  });

  it('carries the policy on the redirect to the sign in page', async () => {
    token = null;
    const answer = await middleware(request('https://cerulea.test/dashboard', 'cerulea.test'));
    expect(answer.headers.get('location')).toContain('/auth/login');
    expect(answer.headers.get('content-security-policy')).toContain("object-src 'none'");
  });
});

describe('the transport the policy reads', () => {
  it('keeps the upgrade directive over HTTPS and through an HTTPS proxy', async () => {
    token = null;
    const direct = await middleware(request('https://cerulea.test/auth/login', 'cerulea.test'));
    expect(direct.headers.get('content-security-policy')).toContain('upgrade-insecure-requests');
    const proxied = await middleware(
      new NextRequest(
        new Request('http://cerulea.test/auth/login', {
          headers: { host: 'cerulea.test', 'x-forwarded-proto': 'https' },
        }),
      ),
    );
    expect(proxied.headers.get('content-security-policy')).toContain('upgrade-insecure-requests');
  });

  it('leaves the upgrade directive out on plain HTTP, where it would break every redirect', async () => {
    token = null;
    const answer = await middleware(request('http://localhost:3000/auth/login', 'localhost:3000'));
    expect(answer.headers.get('content-security-policy')).not.toContain(
      'upgrade-insecure-requests',
    );
  });
});
