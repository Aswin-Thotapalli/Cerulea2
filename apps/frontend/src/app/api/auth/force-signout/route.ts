// apps/frontend/src/app/api/auth/force-signout/route.ts
// Hard sign out. The route closes the Cerulea APIs session behind the browser
// cookie, then expires the cookie through the response headers.
// The Studio sidebar and the administration frame sign out through this route.
// GET /api/auth/force-signout?next=/dashboard
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { closeApisSession, type StudioToken } from '@/lib/auth';
import { sameSitePath } from '@/lib/same-site-path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
];

export async function GET(req: NextRequest) {
  // The landing page stays on this site. A value naming another site lands on
  // the home page.
  const next = sameSitePath(req.nextUrl.searchParams.get('next'));
  // The refresh token stops working at once, so a copied cookie opens nothing.
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const token = (await getToken({ req, secret }).catch(() => null)) as StudioToken | null;
    await closeApisSession(token);
  }
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;
  // The secure flag follows the same address check as lib/auth.ts.
  const isHttps = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;

  const headers = new Headers();
  headers.set('Location', next);

  COOKIE_NAMES.forEach((name) => {
    const secure = isHttps ? '; Secure' : '';
    const base = `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
    headers.append('Set-Cookie', cookieDomain ? `${base}; Domain=${cookieDomain}` : base);
    // A cookie written for the host alone clears here too.
    headers.append('Set-Cookie', base);
  });

  return new NextResponse(null, { status: 302, headers });
}
