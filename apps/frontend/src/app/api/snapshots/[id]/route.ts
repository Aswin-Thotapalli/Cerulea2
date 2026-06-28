import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { snapshots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DELETE /api/snapshots/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    await db.delete(snapshots).where(
      and(eq(snapshots.id, params.id), eq(snapshots.userId, session.user.id))
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// PATCH /api/snapshots/[id] — update name/description/status
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const patch: Partial<typeof snapshots.$inferInsert> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.status !== undefined) patch.status = body.status;

    await db.update(snapshots)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(snapshots.id, params.id), eq(snapshots.userId, session.user.id)));

    const [row] = await db.select().from(snapshots).where(eq(snapshots.id, params.id));
    return NextResponse.json({ ok: true, snapshot: row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
