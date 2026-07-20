import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { smartContracts, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function ownsProject(userId: string, projectId: string): Promise<boolean> {
  const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  return !!p;
}

export async function GET(_req: Request, { params }: { params: { id: string; contractId: string } }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await ownsProject(session.user.id, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [contract] = await db
    .select()
    .from(smartContracts)
    .where(and(eq(smartContracts.id, params.contractId), eq(smartContracts.projectId, params.id)))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ contract });
}

export async function PUT(req: Request, { params }: { params: { id: string; contractId: string } }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await ownsProject(session.user.id, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: smartContracts.id })
    .from(smartContracts)
    .where(and(eq(smartContracts.id, params.contractId), eq(smartContracts.projectId, params.id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { name, contractType, description, enabled, whyItExists, ifDisabled, abi, bytecode, dependencies, source } = body;

  const [updated] = await db
    .update(smartContracts)
    .set({ name, contractType, description, enabled, whyItExists, ifDisabled, abi, bytecode, dependencies, source, updatedAt: new Date().toISOString() } as any)
    .where(eq(smartContracts.id, params.contractId))
    .returning();

  return NextResponse.json({ contract: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string; contractId: string } }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await ownsProject(session.user.id, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: smartContracts.id })
    .from(smartContracts)
    .where(and(eq(smartContracts.id, params.contractId), eq(smartContracts.projectId, params.id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(smartContracts).where(eq(smartContracts.id, params.contractId));
  return NextResponse.json({ ok: true });
}
