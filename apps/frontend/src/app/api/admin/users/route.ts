import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { users, subscriptions, projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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
    const plan = url.searchParams.get('plan') || '';

    const [allUsers, allSubs, allProjects] = await Promise.all([
      db.select({ id: users.id, email: users.email, name: users.name, isTestAccount: users.isTestAccount, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
      db.select({ userId: subscriptions.userId, plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions),
      db.select({ userId: projects.userId }).from(projects),
    ]);

    const subMap = Object.fromEntries(allSubs.map(s => [s.userId, s]));
    const projectCounts: Record<string, number> = {};
    allProjects.forEach(p => { projectCounts[p.userId] = (projectCounts[p.userId] ?? 0) + 1; });

    let enriched = allUsers.map(u => ({
      ...u,
      plan: subMap[u.id]?.plan ?? 'free',
      subStatus: subMap[u.id]?.status ?? 'inactive',
      projectCount: projectCounts[u.id] ?? 0,
    }));

    if (search) enriched = enriched.filter(u => u.email.toLowerCase().includes(search) || (u.name ?? '').toLowerCase().includes(search));
    if (plan && plan !== 'all') enriched = enriched.filter(u => u.plan === plan);

    return NextResponse.json({ users: enriched, total: enriched.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
