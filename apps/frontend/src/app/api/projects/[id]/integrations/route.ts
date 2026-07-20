import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { projects, drafts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

function draftId(projectId: string) {
  return `${projectId}::step4::integrations`;
}

async function verifyOwnership(projectId: string, userId: string) {
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id as any, projectId), eq(projects.userId as any, userId)))
    .limit(1);
  return !!p;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = params.id;
  if (!(await verifyOwnership(projectId, (session.user as any).id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id as any, draftId(projectId)))
    .limit(1);

  if (!draft?.data) {
    return NextResponse.json({ ok: true, configs: {} });
  }

  try {
    const parsed = JSON.parse(draft.data as string);
    return NextResponse.json({ ok: true, configs: parsed?.payload?.configs ?? parsed?.configs ?? {} });
  } catch {
    return NextResponse.json({ ok: true, configs: {} });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = params.id;
  if (!(await verifyOwnership(projectId, (session.user as any).id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const configs = body?.configs ?? body ?? {};

  const id = draftId(projectId);
  const now = new Date().toISOString();
  const data = JSON.stringify({ step: 4, payload: { configs } });

  const [existing] = await db
    .select({ id: drafts.id })
    .from(drafts)
    .where(eq(drafts.id as any, id))
    .limit(1);

  if (existing) {
    await db
      .update(drafts)
      .set({ data, updatedAt: now } as any)
      .where(eq(drafts.id as any, id));
  } else {
    await db.insert(drafts).values({ id, projectId, data, createdAt: now, updatedAt: now } as any);
  }

  return NextResponse.json({ ok: true });
}
