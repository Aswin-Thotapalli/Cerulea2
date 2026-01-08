import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { aiThreads, aiMessages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error:'Unauthorized' }, { status:401 });

  const [t] = await db.select().from(aiThreads).where(and(eq(aiThreads.id, params.id), eq(aiThreads.userId, session.user.id)));
  if (!t) return NextResponse.json({ error:'Not found' }, { status:404 });

  const msgs = await db.select().from(aiMessages).where(eq(aiMessages.threadId, params.id)).orderBy(asc(aiMessages.createdAt));
  return NextResponse.json({ messages: msgs });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error:'Bad request' }, { status:400 });

  const [t] = await db.select().from(aiThreads).where(and(eq(aiThreads.id, params.id), eq(aiThreads.userId, session.user.id)));
  if (!t) return NextResponse.json({ error:'Not found' }, { status:404 });

  // Save user message
  await db.insert(aiMessages).values({ threadId: params.id, role:'user', content });

  // TODO: call your model provider here. For now, naive echo:
  const assistant = `You said: "${content}"\n(Replace this with model output)`;

  await db.insert(aiMessages).values({ threadId: params.id, role:'assistant', content: assistant });
  await db.update(aiThreads).set({ updatedAt: new Date(), lastMessageAt: new Date() }).where(eq(aiThreads.id, params.id));

  return NextResponse.json({ ok: true });
}
