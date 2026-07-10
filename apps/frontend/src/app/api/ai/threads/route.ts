import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db/client";
import { aiThreads } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");

  const where = projectId
    ? and(eq(aiThreads.userId, session.user.id), eq(aiThreads.projectId as any, projectId))
    : eq(aiThreads.userId, session.user.id);

  const threads = await db
    .select()
    .from(aiThreads)
    .where(where)
    .orderBy(desc(aiThreads.updatedAt))
    .limit(10);

  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const projectId = (body?.projectId as string | null) ?? null;
  const title = ((body?.title as string) ?? "New conversation").slice(0, 100);

  const now = new Date().toISOString();
  const [row] = await db
    .insert(aiThreads)
    .values({ id: randomUUID(), userId: session.user.id, projectId, title, createdAt: now, updatedAt: now } as any)
    .returning();

  return NextResponse.json({ thread: row });
}
