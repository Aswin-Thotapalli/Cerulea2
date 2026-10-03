// apps/frontend/src/app/api/auth/logout/route.ts
// Signs the browser out from a script.
// The route closes the Cerulea APIs session behind the cookie, then expires the
// cookie. The account menu calls it before it moves to the sign in screen.
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { closeApisSession, type StudioToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
];

export async function POST(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const token = (await getToken({ req, secret }).catch(() => null)) as StudioToken | null;
    await closeApisSession(token);
  }
  const response = NextResponse.json({ ok: true });
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;
  const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
  for (const name of COOKIE_NAMES) {
    response.cookies.set(name, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure });
    if (cookieDomain) {
      response.headers.append(
        'Set-Cookie',
        `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Domain=${cookieDomain}`,
      );
    }
  }
  return response;
}
