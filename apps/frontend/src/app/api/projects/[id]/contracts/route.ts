import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { smartContracts, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function ownsProject(userId: string, projectId: string): Promise<boolean> {
  const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  return !!p;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await ownsProject(session.user.id, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const contracts = await db
    .select()
    .from(smartContracts)
    .where(eq(smartContracts.projectId, params.id));

  return NextResponse.json({ contracts });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await ownsProject(session.user.id, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { name, contractType, description, enabled = true, whyItExists, ifDisabled, abi, bytecode, dependencies, source = 'manual' } = body;

  if (!name || !contractType) {
    return NextResponse.json({ error: 'name and contractType are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const [contract] = await db
    .insert(smartContracts)
    .values({ id: randomUUID(), projectId: params.id, name, contractType, description, enabled, whyItExists, ifDisabled, abi, bytecode, dependencies, source, createdAt: now, updatedAt: now })
    .returning();

  return NextResponse.json({ contract }, { status: 201 });
}
