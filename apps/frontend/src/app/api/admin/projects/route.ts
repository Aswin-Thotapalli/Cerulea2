import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { projects, users } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function isAdmin(session: any): boolean {
  return session?.user?.email === 'test@cerulea.app' || session?.user?.isTestAccount === true;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const type = url.searchParams.get('type') || '';
    const status = url.searchParams.get('status') || '';

    const [allProjects, allUsers] = await Promise.all([
      db.select({ id: projects.id, name: projects.name, projectType: projects.projectType, status: projects.status, userId: projects.userId, description: projects.description, createdAt: projects.createdAt, updatedAt: projects.updatedAt }).from(projects).orderBy(desc(projects.createdAt)),
      db.select({ id: users.id, email: users.email, name: users.name }).from(users),
    ]);

    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

    let enriched = allProjects.map(p => ({
      ...p,
      userEmail: userMap[p.userId]?.email ?? 'unknown',
      userName: userMap[p.userId]?.name ?? null,
    }));

    if (search) enriched = enriched.filter(p => p.name.toLowerCase().includes(search) || p.userEmail.toLowerCase().includes(search));
    if (type && type !== 'all') enriched = enriched.filter(p => p.projectType === type);
    if (status && status !== 'all') enriched = enriched.filter(p => p.status === status);

    return NextResponse.json({ projects: enriched, total: enriched.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
