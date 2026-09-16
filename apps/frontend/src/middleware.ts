// apps/frontend/src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { divisionFromPath, hasDivisionAccess } from '@/config/divisions';
import type { DivisionSubs } from '@/config/divisions';

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
  '/.well-known/',  // well-known files
  '/docs/',         // public documentation
  '/explorer',      // public block explorer — no login or subscription required
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const { pathname } = req.nextUrl;

  const isStudioHost =
    host.startsWith('studio.') ||
    host === 'studio.localhost:3000' ||
    host === 'studio.localhost';

  const isAdminHost =
    host.startsWith('control.') ||
    host === 'control.localhost:3000' ||
    host === 'control.localhost';

  // Division comes from the URL path — but only under the studio host:
  //   studio.cerulea.io/dapps | /enterprise | /govt
  const division = isStudioHost ? divisionFromPath(pathname) : null;

  // Forward the division to server components (header) and persist it as a
  // cookie for client components + guest-signup continuity.
  const requestHeaders = new Headers(req.headers);
  if (division) requestHeaders.set('x-cerulea-division', division);

  const applyCookie = (res: NextResponse): NextResponse => {
    if (division) res.cookies.set('cerulea.division', division, { path: '/', sameSite: 'lax' });
    return res;
  };
  const pass = () => applyCookie(NextResponse.next({ request: { headers: requestHeaders } }));
  const rewriteTo = (url: URL) => applyCookie(NextResponse.rewrite(url, { request: { headers: requestHeaders } }));
  const redirectTo = (url: URL) => applyCookie(NextResponse.redirect(url));

  // The studio host root ("/") is the 3-option chooser — public.
  const wantsProject = isStudioHost && pathname === '/' && req.nextUrl.searchParams.has('project');
  const isStudioChooser = isStudioHost && pathname === '/' && !wantsProject;

  // Always allow public paths (auth, pricing, api, _next) and the chooser.
  if (isPublicPath(pathname) || isStudioChooser) {
    if (isAdminHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
      return rewriteTo(url);
    }
    return pass();
  }

  // Auth check — applies to all hosts
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname + (req.nextUrl.search || ''));
    return redirectTo(loginUrl);
  }

  // Admin subdomain: allow test@cerulea.app, isTestAccount, or ADMIN_EMAIL env var
  if (isAdminHost) {
    const adminEmails = (process.env.ADMIN_EMAIL ?? '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const userEmail = ((token.email as string) ?? '').toLowerCase();
    const isAdminUser =
      userEmail === 'test@cerulea.app' ||
      (token.isTestAccount as boolean) === true ||
      adminEmails.includes(userEmail);

    if (!isAdminUser) {
      const mainUrl = req.nextUrl.clone();
      mainUrl.host = host.replace(/^control\./, '');
      mainUrl.pathname = '/dashboard';
      mainUrl.search = '';
      return redirectTo(mainUrl);
    }

    const url = req.nextUrl.clone();
    if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
    if (pathname === '/') {
      url.pathname = '/admin';
    } else if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`;
    }
    return rewriteTo(url);
  }

  // Block /admin/* on the main host — only admin users may access it.
  if (pathname.startsWith('/admin') && !isAdminHost) {
    const adminEmails = (process.env.ADMIN_EMAIL ?? '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const userEmail = ((token.email as string) ?? '').toLowerCase();
    const isAdminUser =
      userEmail === 'test@cerulea.app' ||
      (token.isTestAccount as boolean) === true ||
      adminEmails.includes(userEmail);
    if (!isAdminUser) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return redirectTo(dashboardUrl);
    }
  }

  // ─── Division route: studio.cerulea.io/dapps|/enterprise|/govt ──────────────
  if (division) {
    const subs = token.divisionSubs as DivisionSubs | undefined;
    const isTest = (token.isTestAccount as boolean) === true;

    // No active subscription in THIS division → send to its pricing (the cookie
    // set above tells the pricing page which division to show). Admin bypasses.
    if (!isTest && !hasDivisionAccess(subs, division)) {
      const pricingUrl = req.nextUrl.clone();
      pricingUrl.pathname = '/pricing';
      pricingUrl.search = '';
      return redirectTo(pricingUrl);
    }

    // Option C: serve the studio while the URL stays on /dapps (etc.).
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('studio', '1');
    return rewriteTo(url);
  }

  // ─── Legacy plan gate (main host + studio-host non-division paths) ──────────
  if (!(token.isTestAccount as boolean)) {
    const plan = token.plan as string | undefined;
    const FREE_PATHS = ['/dashboard/billing'];
    const isFreeExempt = FREE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if ((!plan || plan === 'free') && !isFreeExempt) {
      const pricingUrl = req.nextUrl.clone();
      pricingUrl.pathname = '/pricing';
      pricingUrl.search = '';
      return redirectTo(pricingUrl);
    }
  }

  // ─── Saved project via the bare form: studio.cerulea.io/?project=<id> ──────
  // Serve the studio (StudioEntry loads the project); the chooser is skipped.
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
