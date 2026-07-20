import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { workspaces } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Virtual personal workspace — always present, never stored in DB.
const PERSONAL = (userId: string) => ({
  id: 'personal',
  userId,
  name: 'Personal Workspace',
  slug: 'personal',
  createdAt: new Date(0).toISOString(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db.select().from(workspaces).where(eq(workspaces.userId, session.user.id));
    return NextResponse.json([PERSONAL(session.user.id), ...rows]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name || String(name).trim().length < 2) {
      return NextResponse.json({ error: 'Name too short' }, { status: 400 });
    }
    const trimmed = String(name).trim();
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
    const item = { id: randomUUID(), userId: session.user.id, name: trimmed, slug, createdAt: new Date().toISOString() };
    await db.insert(workspaces).values(item);
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (id === 'personal') return NextResponse.json({ error: 'Cannot delete Personal Workspace' }, { status: 400 });

    await db.delete(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.userId, session.user.id)));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
