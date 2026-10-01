// apps/frontend/src/app/api/intelligence/threads/[threadId]/messages/route.ts
// Sends one message to Cerulea Intelligence and returns the cards it emits.
// The message carries the state of the screen the person is on, which is plane
// one of the context feed. The answer is returned unchanged, so a failure keeps
// the message and the fix Cerulea APIs named.
// Without this route the chat surface could not ask a question.
import { sendIntelligenceMessage } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { readInterfaceState } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const params = await context.params;
  return withActor(async (actor) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return sendIntelligenceMessage(
      params.threadId,
      {
        text: typeof body.text === 'string' ? body.text : '',
        interfaceState: readInterfaceState(body.interfaceState),
      },
      callOptions(actor),
    );
  });
}
