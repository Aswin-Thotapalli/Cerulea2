// apps/frontend/src/app/api/ai/threads/[id]/messages/route.ts
// Reads every turn of one Cerulea Intelligence thread for the assistant drawer.
// The turns live in Cerulea APIs. A person turn reads as the user role and a
// Cerulea turn reads as the assistant role, with the cards each turn carried.
// Without this route a thread from the history list opens empty.
import { NextResponse } from 'next/server';

import { readIntelligenceThread } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const thread = await readIntelligenceThread(id, callOptions(actor));
    const messages = thread.turns.map((turn) => ({
      id: turn.messageId,
      threadId: thread.threadId,
      role: turn.role === 'person' ? 'user' : 'assistant',
      content: turn.text,
      cards: turn.cards,
      createdAt: turn.createdAt,
    }));
    return NextResponse.json({ messages });
  } catch (cause) {
    return failureReply(cause);
  }
}
