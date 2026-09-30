// apps/frontend/src/middleware.ts
// The gate in front of every Studio screen.
// Studio, Dashboard and the administration screens share one codebase and one
// sign in. This gate sends an unknown visitor to the sign in page and holds the
// administration screens for the Cerulea operator role.
// The gate also issues the content security policy of every screen. Each
// request carries a fresh nonce, which Next.js writes onto the inline scripts
// it renders, so the page runs its own code and refuses any other.
// Without this gate a screen would render before Cerulea knows who is reading.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { contentSecurityPolicy, createNonce } from '@/lib/content-security-policy';
import { holdsOperatorRole } from '@/lib/operators';

const PUBLIC_PATHS = ['/auth/', '/pricing', '/api/', '/_next/', '/favicon.ico'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((entry) => pathname.startsWith(entry));
}

/** The policy and the nonce one request carries. */
type Policy = { nonce: string; value: string };

/** Whether the request arrived over transport layer security, directly or through a proxy. */
function arrivedSecure(req: NextRequest): boolean {
  return (
    req.nextUrl.protocol === 'https:' ||
    (req.headers.get('x-forwarded-proto') ?? '').split(',')[0]?.trim() === 'https'
  );
}

function policyFor(req: NextRequest): Policy {
  const nonce = createNonce();
  return {
    nonce,
    value: contentSecurityPolicy({
      nonce,
      development: process.env.NODE_ENV === 'development',
      secureTransport: arrivedSecure(req),
    }),
  };
}

/**
 * Continues the request with the policy attached.
 * Next.js reads the nonce out of the request header and writes it onto every
 * inline script. The browser reads the policy out of the response header.
 */
function forward(req: NextRequest, policy: Policy, rewriteTo?: URL): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', policy.nonce);
  requestHeaders.set('content-security-policy', policy.value);
  const response =
    rewriteTo === undefined
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.rewrite(rewriteTo, { request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', policy.value);
  return response;
}

function redirect(to: URL, policy: Policy): NextResponse {
  const response = NextResponse.redirect(to);
  response.headers.set('content-security-policy', policy.value);
  return response;
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const { pathname } = req.nextUrl;
  const policy = policyFor(req);

  const isStudioHost = host.startsWith('studio.');
  const isOperatorHost = host.startsWith('control.');

  if (isPublicPath(pathname)) {
    if (isStudioHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('studio')) url.searchParams.set('studio', '1');
      return forward(req, policy, url);
    }
    if (isOperatorHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
      return forward(req, policy, url);
    }
    return forward(req, policy);
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return redirect(loginUrl, policy);
  }

  if (isOperatorHost || pathname.startsWith('/admin')) {
    if (!holdsOperatorRole(token.email as string | undefined)) {
      const mainUrl = req.nextUrl.clone();
      mainUrl.host = host.replace(/^control\./, '');
      mainUrl.pathname = '/dashboard';
      mainUrl.search = '';
      return redirect(mainUrl, policy);
    }
  }

  if (isOperatorHost) {
    const url = req.nextUrl.clone();
    if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
    if (pathname === '/') {
      url.pathname = '/admin';
    } else if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`;
    }
    return forward(req, policy, url);
  }

  if (isStudioHost) {
    const url = req.nextUrl.clone();
    if (!url.searchParams.has('studio')) url.searchParams.set('studio', '1');
    return forward(req, policy, url);
  }

  return forward(req, policy);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
