import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createHash, randomBytes } from 'crypto';
import { db } from '@/db/client';
import { apiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function hashKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

function maskKey(full: string) {
  return full.slice(0, 12) + '••••••••••••' + full.slice(-4);
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({ id: apiKeys.id, name: apiKeys.name, lastUsedAt: apiKeys.lastUsedAt, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(eq(apiKeys.userId as any, session.user.id));

  return NextResponse.json({ ok: true, keys: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'API Key';

  const raw = 'ck_live_' + randomBytes(24).toString('hex');
  const id = randomUUID();

  await db.insert(apiKeys).values({
    id,
    userId: session.user.id,
    keyHash: hashKey(raw),
    name,
  });

  return NextResponse.json({ ok: true, key: { id, name, fullKey: raw, maskedKey: maskKey(raw) } });
}
