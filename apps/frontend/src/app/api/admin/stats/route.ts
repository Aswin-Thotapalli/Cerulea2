import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { users, projects, subscriptions, billingOneTimePurchases, snapshots, aiThreads } from '@/db/schema';
import { eq, desc, sum } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function isAdmin(session: any): boolean {
  return session?.user?.email === 'test@cerulea.app' || session?.user?.isTestAccount === true;
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [allUsers, allProjects, allSubs, revenue, snapshotCount, threadCount] = await Promise.all([
      db.select({ id: users.id, email: users.email, name: users.name, isTestAccount: users.isTestAccount, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
      db.select({ id: projects.id, name: projects.name, projectType: projects.projectType, status: projects.status, userId: projects.userId, createdAt: projects.createdAt }).from(projects).orderBy(desc(projects.createdAt)),
      db.select({ userId: subscriptions.userId, plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions),
      db.select({ total: sum(billingOneTimePurchases.amountCents) }).from(billingOneTimePurchases).where(eq(billingOneTimePurchases.status, 'paid')),
      db.select({ id: snapshots.id }).from(snapshots),
      db.select({ id: aiThreads.id }).from(aiThreads),
    ]);

    const activeSubs = allSubs.filter(s => s.status === 'active');
    const planBreakdown: Record<string, number> = {};
    activeSubs.forEach(s => { planBreakdown[s.plan] = (planBreakdown[s.plan] ?? 0) + 1; });

    // Map userId → plan for user enrichment
    const subByUser = Object.fromEntries(allSubs.map(s => [s.userId, s]));

    return NextResponse.json({
      totalUsers: allUsers.length,
      totalProjects: allProjects.length,
      activeSubscriptions: activeSubs.length,
      revenueTotal: Number(revenue[0]?.total ?? 0),
      blockchainProjects: allProjects.filter(p => p.projectType === 'blockchain').length,
      dappProjects: allProjects.filter(p => p.projectType !== 'blockchain').length,
      totalSnapshots: snapshotCount.length,
      totalAiThreads: threadCount.length,
      planBreakdown,
      recentUsers: allUsers.slice(0, 10).map(u => ({ ...u, plan: subByUser[u.id]?.plan ?? 'free' })),
      recentProjects: allProjects.slice(0, 10),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
