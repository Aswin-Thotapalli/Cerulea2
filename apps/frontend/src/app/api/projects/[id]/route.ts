export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { divisionForProject } from '@/config/divisions';
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
        division: divisionForProject((row as any).projectType, (row as any).selectedTemplateIds),
        selectedTemplateIds: (row as any).selectedTemplateIds ?? null,
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

// PATCH /api/projects/[id]  body: { economics?: object, name?, description? }
// Merges the given economics object into the stored one (one level deep) so
// seeded chain settings survive Step 3 edits.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const [row] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id as any, params.id), eq(projects.userId as any, session.user.id)))
      .limit(1);
    if (!row) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};

    if (body && typeof body.economics === 'object' && body.economics !== null) {
      let current: any = {};
      const raw = (row as any).economics;
      if (raw) { try { current = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { current = {}; } }
      if (!current || typeof current !== 'object') current = {};
      const incoming: any = body.economics;
      const merged: any = { ...current };
      for (const [k, v] of Object.entries(incoming)) {
        const cur = merged[k];
        merged[k] = (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' && !Array.isArray(cur))
          ? { ...cur, ...(v as object) }
          : v;
      }
      patch.economics = JSON.stringify(merged);
    }

    if (typeof body?.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.description === 'string') patch.description = body.description;

    if (!Object.keys(patch).length) return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
    patch.updatedAt = new Date().toISOString().split('.')[0] + 'Z';

    await db.update(projects).set(patch as any).where(eq(projects.id as any, params.id));
    return NextResponse.json({ ok: true });
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
