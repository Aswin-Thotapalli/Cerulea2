import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db/client";
import { aiMessages, aiThreads } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [thread] = await db
    .select()
    .from(aiThreads)
    .where(and(eq(aiThreads.id, params.id), eq(aiThreads.userId, session.user.id)))
    .limit(1);

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(aiMessages).where(eq(aiMessages.threadId, params.id));
  await db.delete(aiThreads).where(eq(aiThreads.id, params.id));

  return NextResponse.json({ ok: true });
}
