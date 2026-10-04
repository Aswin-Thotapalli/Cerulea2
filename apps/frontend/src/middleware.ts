// apps/frontend/src/middleware.ts
// The gate in front of every Studio screen.
// Studio, Dashboard and the administration screens share one codebase and one
// sign in. The host decides the surface:
//   studio.<domain>/            the division chooser
//   studio.<domain>/dapps       the Dapps Studio
//   studio.<domain>/enterprise  the Enterprise Studio
//   studio.<domain>/govt        the Government Studio
//   control.<domain>/           the administration screens
// The gate sends an unknown visitor to sign in, sends an account without a
// plan in a division to the pricing of that division, and holds the
// administration screens for the Cerulea operator role, which Cerulea APIs
// names at sign in.
// The gate also issues the content security policy of every screen. Each
// request carries a fresh nonce, which Next.js writes onto the inline scripts
// it renders, so the page runs its own code and refuses any other.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { divisionFromPath, hasDivisionAccess } from '@/config/divisions';
import type { DivisionSubs } from '@/config/divisions';
import { contentSecurityPolicy, createNonce } from '@/lib/content-security-policy';

const PUBLIC_PATHS = [
  '/auth/',
  '/pricing',
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/favicon-',
  '/apple-touch-icon',
  '/android-chrome-',
  '/brand/',
  '/.well-known/',
  '/docs/',
  '/explorer',
];

/** The paths a signed in account without a plan still reaches. */
const PLANLESS_PATHS = ['/dashboard/billing'];

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

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const { pathname } = req.nextUrl;
  const policy = policyFor(req);

  const isStudioHost = host.startsWith('studio.');
  const isAdminHost = host.startsWith('control.');

  // The division comes from the first path segment, under the studio host alone.
  const division = isStudioHost ? divisionFromPath(pathname) : null;

  // Server components read the division and the nonce from the request headers.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', policy.nonce);
  requestHeaders.set('content-security-policy', policy.value);
  if (division) requestHeaders.set('x-cerulea-division', division);

  const finish = (response: NextResponse): NextResponse => {
    response.headers.set('content-security-policy', policy.value);
    // Client screens, pricing and checkout read the division from this cookie.
    if (division) response.cookies.set('cerulea.division', division, { path: '/', sameSite: 'lax' });
    return response;
  };
  const pass = () => finish(NextResponse.next({ request: { headers: requestHeaders } }));
  const rewriteTo = (url: URL) =>
    finish(NextResponse.rewrite(url, { request: { headers: requestHeaders } }));
  const redirectTo = (url: URL) => finish(NextResponse.redirect(url));

  // The studio host root shows the chooser to everyone. A project address skips it.
  const wantsProject = isStudioHost && pathname === '/' && req.nextUrl.searchParams.has('project');
  const isStudioChooser = isStudioHost && pathname === '/' && !wantsProject;

  if (isPublicPath(pathname) || isStudioChooser) {
    if (isAdminHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
      return rewriteTo(url);
    }
    return pass();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const sessionOpen = (token?.cerulea?.accessToken ?? '').length > 0;

  if (!token || !sessionOpen) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname + (req.nextUrl.search || ''));
    return redirectTo(loginUrl);
  }

  const isOperator = token.isOperator === true;

  // The administration host and the /admin paths open for the operator role alone.
  if (isAdminHost || pathname.startsWith('/admin')) {
    if (!isOperator) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.host = host.replace(/^control\./, '');
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return redirectTo(dashboardUrl);
    }
  }

  if (isAdminHost) {
    const url = req.nextUrl.clone();
    if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
    if (pathname === '/') {
      url.pathname = '/admin';
    } else if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`;
    }
    return rewriteTo(url);
  }

  // A division path opens that division's Studio for an account holding a plan
  // there. The address stays on the division path.
  if (division) {
    const subs = token.divisionSubs as DivisionSubs | undefined;
    if (!isOperator && !hasDivisionAccess(subs, division)) {
      // The pricing screen opens on the tiers of the division the person asked for.
      const pricingUrl = req.nextUrl.clone();
      pricingUrl.pathname = '/pricing';
      pricingUrl.search = '';
      pricingUrl.searchParams.set('division', division);
      return redirectTo(pricingUrl);
    }
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('studio', '1');
    return rewriteTo(url);
  }

  // Every other screen needs a plan in at least one division.
  if (!isOperator) {
    const plan = token.plan;
    const planless = PLANLESS_PATHS.some((entry) => pathname === entry || pathname.startsWith(`${entry}/`));
    if ((!plan || plan === 'free') && !planless) {
      const pricingUrl = req.nextUrl.clone();
      pricingUrl.pathname = '/pricing';
      pricingUrl.search = '';
      return redirectTo(pricingUrl);
    }
  }

  // A saved project at studio.<domain>/?project=<id> opens Studio without the chooser.
  if (wantsProject) {
    const url = req.nextUrl.clone();
    url.searchParams.set('studio', '1');
    return rewriteTo(url);
  }

  return pass();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots\\.txt).*)'],
};
