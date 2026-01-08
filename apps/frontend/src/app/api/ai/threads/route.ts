import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { aiThreads } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const rows = await db.select().from(aiThreads).where(eq(aiThreads.userId, session.user.id)).orderBy(desc(aiThreads.updatedAt));
  return NextResponse.json({ threads: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { title } = await req.json();
  const [row] = await db.insert(aiThreads).values({ userId: session.user.id, title: title || 'New chat' }).returning();
  return NextResponse.json({ thread: row });
}
