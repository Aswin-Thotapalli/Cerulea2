// apps/frontend/src/middleware.ts
// The gate in front of every Studio screen.
// Studio, Dashboard and the administration screens share one codebase and one
// sign in. This gate sends an unknown visitor to the sign in page and holds the
// administration screens for the Cerulea operator role.
// Without this gate a screen would render before Cerulea knows who is reading.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { holdsOperatorRole } from '@/lib/operators';

const PUBLIC_PATHS = ['/auth/', '/pricing', '/api/', '/_next/', '/favicon.ico'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((entry) => pathname.startsWith(entry));
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const { pathname } = req.nextUrl;

  const isStudioHost = host.startsWith('studio.');
  const isOperatorHost = host.startsWith('control.');

  if (isPublicPath(pathname)) {
    if (isStudioHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('studio')) url.searchParams.set('studio', '1');
      return NextResponse.rewrite(url);
    }
    if (isOperatorHost) {
      const url = req.nextUrl.clone();
      if (!url.searchParams.has('admin')) url.searchParams.set('admin', '1');
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isOperatorHost || pathname.startsWith('/admin')) {
    if (!holdsOperatorRole(token.email as string | undefined)) {
      const mainUrl = req.nextUrl.clone();
      mainUrl.host = host.replace(/^control\./, '');
      mainUrl.pathname = '/dashboard';
      mainUrl.search = '';
      return NextResponse.redirect(mainUrl);
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
    return NextResponse.rewrite(url);
  }

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
