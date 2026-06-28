import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { snapshots } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/snapshots?projectId=
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ ok: false, error: 'projectId required' }, { status: 400 });

    const rows = await db
      .select()
      .from(snapshots)
      .where(and(eq(snapshots.projectId, projectId), eq(snapshots.userId, session.user.id)))
      .orderBy(desc(snapshots.createdAt));

    return NextResponse.json({ ok: true, snapshots: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST /api/snapshots — create a snapshot
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, name, description, stateData } = body;
    if (!projectId || !name) return NextResponse.json({ ok: false, error: 'projectId and name required' }, { status: 400 });

    const id = randomUUID();
    await db.insert(snapshots).values({
      id,
      projectId,
      userId: session.user.id,
      name,
      description: description || null,
      stateData: stateData ? JSON.stringify(stateData) : null,
      status: 'ready',
    });

    const [row] = await db.select().from(snapshots).where(eq(snapshots.id, id));
    return NextResponse.json({ ok: true, snapshot: row }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
