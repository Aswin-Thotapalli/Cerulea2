import { NextResponse } from 'next/server';

const COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
];

export async function POST() {
  const isHttps = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;

  const headers = new Headers({ 'Content-Type': 'application/json' });
  COOKIE_NAMES.forEach((name) => {
    const secure = isHttps ? '; Secure' : '';
    const base = `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
    headers.append('Set-Cookie', cookieDomain ? `${base}; Domain=${cookieDomain}` : base);
    headers.append('Set-Cookie', base);
  });

  return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers });
}
