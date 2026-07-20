import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { auditLogs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, session.user.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(200);

    return NextResponse.json({ logs, total: logs.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
