import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll().map((c) => c.name);

  return NextResponse.json({
    session,
    cookieNames: allCookies,
    nextauthUrl: process.env.NEXTAUTH_URL ?? null,
    hasSecret: !!process.env.NEXTAUTH_SECRET,
  });
}
