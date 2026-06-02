import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_CHAINS = new Set(['public', 'private']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  // If the first segment looks like a chain slug but is invalid, redirect to /public
  if (segments.length > 0 && !VALID_CHAINS.has(segments[0])) {
    // Only redirect if the path doesn't start with special Next.js paths
    if (!pathname.startsWith('/_next') && !pathname.startsWith('/api') && !pathname.startsWith('/favicon')) {
      return NextResponse.redirect(new URL('/public', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
