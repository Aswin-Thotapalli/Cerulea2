import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });
  return NextResponse.json({
    id: (session.user as any).id,
    email: session.user.email,
    name: session.user.name ?? null,
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : null;

  await db.update(users)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(users.id, (session.user as any).id));

  return NextResponse.json({ ok: true });
}
