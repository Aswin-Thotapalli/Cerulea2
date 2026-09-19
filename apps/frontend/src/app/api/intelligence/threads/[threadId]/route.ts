// apps/frontend/src/app/api/intelligence/threads/[threadId]/route.ts
// Reads one Cerulea Intelligence thread with every turn it holds.
// The chat surface opens a thread again after a reload and finds the cards it
// already showed.
// Without this route a reload would lose the conversation.
import { readIntelligenceThread } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { threadId: string } }) {
  return withActor(async (actor) =>
    readIntelligenceThread(params.threadId, callOptions(actor)),
  );
}
