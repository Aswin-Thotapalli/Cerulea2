import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { auditLogs } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function isAdmin(session: any): boolean {
  return session?.user?.email === 'test@cerulea.app' || session?.user?.isTestAccount === true;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 200), 500);
    const action = url.searchParams.get('action') || '';
    const status = url.searchParams.get('status') || '';
    const userId = url.searchParams.get('userId') || '';

    let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);

    const logs = await query;

    let filtered = logs;
    if (action) filtered = filtered.filter(l => l.action.includes(action));
    if (status) filtered = filtered.filter(l => l.status === status);
    if (userId) filtered = filtered.filter(l => l.userId === userId);

    return NextResponse.json({ logs: filtered, total: filtered.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
