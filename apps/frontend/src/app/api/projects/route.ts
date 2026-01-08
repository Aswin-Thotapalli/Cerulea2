import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { projects, workspaces } from '@/db/schema';
import { eq, and, like, desc } from 'drizzle-orm';
import slugifyLib from 'slugify';

export const dynamic = 'force-dynamic';

function slugify(input: string) {
  return slugifyLib(input, { lower: true, strict: true, trim: true });
}

// GET /api/projects?workspaceId=&q=&limit=&offset=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const q = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const whereClauses: any[] = [];
    if (workspaceId) whereClauses.push(eq(projects.workspaceId as any, workspaceId));

    const nameLike = q ? `%${q}%` : null;

    let rows;
    if (whereClauses.length && nameLike) {
      rows = await db
        .select()
        .from(projects)
        .where(and(...whereClauses, like(projects.name as any, nameLike)))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(projects.createdAt as any));
    } else if (whereClauses.length) {
      rows = await db
        .select()
        .from(projects)
        .where(and(...whereClauses))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(projects.createdAt as any));
    } else if (nameLike) {
      rows = await db
        .select()
        .from(projects)
        .where(like(projects.name as any, nameLike))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(projects.createdAt as any));
    } else {
      rows = await db
        .select()
        .from(projects)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(projects.createdAt as any));
    }

    const data = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      projectType: r.projectType,
      workspaceId: r.workspaceId,
      status: r.status ?? 'draft',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ ok: true, projects: data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/projects
// Body: { name, slug?, description?, projectType: 'dapp'|'blockchain', templateIds?: string[], workspaceId?: string, status?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name: string = (body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 });
    }

    const projectType = String(body?.projectType || '').trim();
    if (projectType !== 'dapp' && projectType !== 'blockchain') {
      return NextResponse.json(
        { ok: false, error: "projectType must be 'dapp' or 'blockchain'" },
        { status: 400 }
      );
    }

    const templateIds: string[] = Array.isArray(body?.templateIds) ? body.templateIds : [];

    // --- Validate workspaceId. If not found, set NULL to avoid FK failure.
    let workspaceId: string | null = body?.workspaceId ?? null;
    if (workspaceId && typeof workspaceId === 'string' && workspaceId.trim().length > 0) {
      const ws = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id as any, workspaceId));
      if (ws.length === 0) {
        workspaceId = null;
      }
    } else {
      workspaceId = null;
    }

    // slug (auto from name if not provided), ensure uniqueness
    let slug: string = (body?.slug && String(body.slug).trim()) || slugify(name);
    if (slug) {
      let candidate = slug;
      let n = 2;
      // ensure unique slug
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.slug as any, candidate));
        if (existing.length === 0) { slug = candidate; break; }
        candidate = `${slug}-${n++}`;
      }
    }

    const id =
      (body?.id && String(body.id)) ||
      (globalThis.crypto?.randomUUID?.()
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

    // Minimal Step 1 blueprint stub (Step 1 will PATCH real data later)
    const createdBlueprint = {
      modules: [],
      graph: { nodes: [], edges: [] },
    };

    await db.insert(projects).values({
      id,
      name,
      slug,
      description: body?.description ?? null,
      projectType,
      workspaceId,
      selectedTemplateIds: JSON.stringify(templateIds) as any,
      blueprint: JSON.stringify(createdBlueprint) as any,
      status: (body?.status ?? 'draft') as any,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error('POST /api/projects failed:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
