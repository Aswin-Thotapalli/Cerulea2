import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { apiKeys } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id as any, params.id), eq(apiKeys.userId as any, session.user.id)))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(apiKeys).where(eq(apiKeys.id as any, params.id));
  return NextResponse.json({ ok: true });
}
