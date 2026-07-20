import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userProjects = await db
      .select({ id: projects.id, name: projects.name, projectType: projects.projectType, status: projects.status, createdAt: projects.createdAt, updatedAt: projects.updatedAt })
      .from(projects)
      .where(eq(projects.userId, session.user.id));

    // Real on-chain metrics are unavailable until deployment infrastructure is
    // wired — null values distinguish "not deployed yet" from "0 TPS".
    const networks = userProjects.map(p => ({
      id: p.id,
      name: p.name,
      type: p.projectType === 'blockchain' ? 'L1' : 'dApp',
      projectType: p.projectType,
      status: p.status === 'active' ? 'live' : 'building',
      blockHeight: null,
      tps: null,
      lastUpdated: p.updatedAt,
      createdAt: p.createdAt,
      nodeCount: null,
      consensusHealth: null,
    }));

    return NextResponse.json({ networks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
