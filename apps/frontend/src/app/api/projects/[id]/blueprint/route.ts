// apps/frontend/src/app/api/projects/[id]/blueprint/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/projects/:id/blueprint
// Returns the saved blueprint (parsed if stored as TEXT)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const row =
      (await db.select().from(projects).where(eq(projects.id as any, id)).limit(1))[0];

    if (!row) {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    }

    let blueprint: any = (row as any).blueprint ?? null;
    if (typeof blueprint === 'string') {
      try {
        blueprint = JSON.parse(blueprint);
      } catch {
        // keep as string if not valid JSON
      }
    }

    return NextResponse.json({ ok: true, blueprint });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// PATCH /api/projects/:id/blueprint
// Upserts the blueprint JSON into projects.blueprint
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json(); // { modules:[], graph:{nodes,edges} } or any future shape

    await db
      .update(projects)
      .set({ blueprint: JSON.stringify(body) as any })
      .where(eq(projects.id as any, id));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
