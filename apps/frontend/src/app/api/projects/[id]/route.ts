export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { projects, drafts } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const [row] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id as any, params.id), eq(projects.userId as any, session.user.id)))
      .limit(1);

    if (!row) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    // Parse economics from projects table
    let economics: any = null;
    const econRaw = (row as any).economics;
    if (econRaw) {
      try { economics = typeof econRaw === 'string' ? JSON.parse(econRaw) : econRaw; } catch {}
    }

    // Find integrations from the step-4 draft
    let integrations: any = null;
    const allDrafts = await db
      .select()
      .from(drafts)
      .where(eq(drafts.projectId as any, params.id))
      .orderBy(desc(drafts.updatedAt));
    for (const d of allDrafts) {
      try {
        const parsed = typeof d.data === 'string' ? JSON.parse(d.data) : (d.data as any);
        if (parsed?.step === 4 && parsed?.payload?.configs) {
          integrations = parsed.payload;
          break;
        } else if (parsed?.configs) {
          integrations = parsed;
          break;
        }
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      project: {
        id: (row as any).id,
        name: (row as any).name,
        slug: (row as any).slug,
        description: (row as any).description,
        projectType: (row as any).projectType,
        status: (row as any).status ?? 'draft',
        legacyMode: (row as any).legacyMode ?? 'none',
        createdAt: (row as any).createdAt,
        updatedAt: (row as any).updatedAt,
        economics,
        integrations,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id as any, params.id), eq(projects.userId as any, session.user.id)))
      .limit(1);

    if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    await db.delete(drafts).where(eq(drafts.projectId as any, params.id));
    await db.delete(projects).where(eq(projects.id as any, params.id));

    logAudit({ userId: session.user.id, actorEmail: session.user.email ?? undefined, action: 'project.delete', resource: 'project', resourceId: params.id, status: 'success' });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
