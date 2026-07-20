import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { profiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [[user], [profile]] = await Promise.all([
    db.select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt }).from(users).where(eq(users.id, session.user.id)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1),
  ]);

  return NextResponse.json({ user: user ?? null, profile: profile ?? null });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, displayName, avatarUrl, company, role } = body;

  const [existingProfile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, session.user.id)).limit(1);

  const updates: Promise<any>[] = [];

  if (name !== undefined) {
    updates.push(
      db.update(users).set({ name, updatedAt: new Date().toISOString() } as any).where(eq(users.id, session.user.id))
    );
  }

  const profileFields = { displayName, avatarUrl, company, role };
  const hasProfileUpdate = Object.values(profileFields).some(v => v !== undefined);

  if (hasProfileUpdate) {
    if (existingProfile) {
      updates.push(
        db.update(profiles).set(profileFields as any).where(eq(profiles.userId, session.user.id))
      );
    } else {
      updates.push(
        db.insert(profiles).values({ id: randomUUID(), userId: session.user.id, ...profileFields })
      );
    }
  }

  await Promise.all(updates);

  const [[user], [profile]] = await Promise.all([
    db.select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt }).from(users).where(eq(users.id, session.user.id)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1),
  ]);

  return NextResponse.json({ user: user ?? null, profile: profile ?? null });
}
