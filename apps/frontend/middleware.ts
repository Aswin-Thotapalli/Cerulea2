// apps/frontend/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';

  // Handle both local and prod: studio.localhost:3000, studio.cerulea.app, etc.
  const isStudioHost =
    host.startsWith('studio.') ||
    host === 'studio.localhost:3000' ||
    host === 'studio.localhost'; // extra safe

  if (!isStudioHost) return NextResponse.next();

  // Preserve existing search params and add studio=1 if not present
  const url = req.nextUrl.clone();
  if (!url.searchParams.has('studio')) {
    url.searchParams.set('studio', '1');
  }

  // Always serve the root page so routing never 404s on subdomain
  url.pathname = '/';
  return NextResponse.rewrite(url);
}

// Don’t run on API/static/image assets
export const config = {
  matcher: [
    // Everything except _next assets, images, favicon, and API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
