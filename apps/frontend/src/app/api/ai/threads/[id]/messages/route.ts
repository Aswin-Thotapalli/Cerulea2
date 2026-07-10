import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db/client";
import { aiMessages, aiThreads } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ messages: [] });

  const [thread] = await db
    .select()
    .from(aiThreads)
    .where(and(eq(aiThreads.id, params.id), eq(aiThreads.userId, session.user.id)))
    .limit(1);

  if (!thread) return NextResponse.json({ messages: [] });

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.threadId, params.id))
    .orderBy(asc(aiMessages.createdAt));

  return NextResponse.json({ messages });
}
