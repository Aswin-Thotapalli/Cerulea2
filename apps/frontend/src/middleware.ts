// apps/frontend/src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

  // Always allow public paths through (auth, pricing, api, _next)
  if (isPublicPath(pathname)) {
    if (isStudioHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('studio')) url.searchParams.set('studio', '1');
      return NextResponse.rewrite(url);
    }
    if (isAdminHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Auth check — applies to all hosts
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin subdomain: only allow test@cerulea.app / isTestAccount
  if (isAdminHost) {
    const isAdminUser =
      (token.email as string) === 'test@cerulea.app' ||
      (token.isTestAccount as boolean) === true;

    if (!isAdminUser) {
      // Redirect non-admin users back to main site
      const mainUrl = req.nextUrl.clone();
      mainUrl.host = host.replace(/^control\./, '');
      mainUrl.pathname = '/dashboard';
      mainUrl.search = '';
      return NextResponse.redirect(mainUrl);
    }

    // Rewrite admin subdomain paths to the (admin) route group
    const url = req.nextUrl.clone();
    if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
    // Map /  -> /admin, /users -> /admin/users, etc.
    if (pathname === '/') {
      url.pathname = '/admin';
    } else if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Require an active paid plan to access the app. New users (plan === 'free')
  // and users whose subscription lapsed are sent to /pricing to subscribe.
  // /pricing and /pricing/success are already in PUBLIC_PATHS so they pass through.
  // /dashboard/billing is also exempt so users can land there after checkout.
  if (!(token.isTestAccount as boolean)) {
    const plan = token.plan as string | undefined;
    const FREE_PATHS = ['/dashboard/billing'];
    const isFreeExempt = FREE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if ((!plan || plan === 'free') && !isFreeExempt) {
      const pricingUrl = req.nextUrl.clone();
      pricingUrl.pathname = '/pricing';
      pricingUrl.search = '';
      return NextResponse.redirect(pricingUrl);
    }
  }

  // Apply studio subdomain rewrite AFTER auth/pricing checks pass
  if (isStudioHost) {
    const url = req.nextUrl.clone();
    if (!url.searchParams.has('studio')) url.searchParams.set('studio', '1');
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
