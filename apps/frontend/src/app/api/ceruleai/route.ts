// apps/frontend/src/app/api/ceruleai/route.ts
// The production assistant drawer sends each question here and reads the
// answer as a text stream.
// Cerulea Intelligence answers every question. The route sends the question
// to the thread the drawer opened, with the screen the person is on, and
// writes the cards Cerulea Intelligence returns as plain text in the stream.
// Customer data stays inside the deployment: no outside model receives it.
import { sendIntelligenceMessage } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired } from '@/lib/cerulea-server';
import { cardText } from '@/lib/intelligence/card-text';
import { readInterfaceState } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Reads the screen the drawer reports from the production snapshot. */
function interfaceStateOf(snapshot: unknown) {
  const record = (snapshot ?? {}) as Record<string, unknown>;
  const step = record.currentStep ?? record.step ?? record.stepIndex;
  const selected = Array.isArray(record.selectedModules) ? record.selectedModules : [];
  return readInterfaceState({
    screen: typeof step === 'number' || typeof step === 'string' ? `studio.step.${String(step)}` : 'studio',
    selection: selected.filter((entry): entry is string => typeof entry === 'string').slice(0, 40),
    validationErrors: [],
    recentActions: [],
  });
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const threadId = typeof body.threadId === 'string' ? body.threadId : '';
  if (message.length === 0) {
    return failureResponse(
      {
        code: 'intelligence.question_empty',
        message: 'Cerulea Intelligence reads a question on this request.',
        fix: 'Type a question, then send it again.',
        details: {},
      },
      400,
    );
  }
  if (threadId.length === 0) {
    return failureResponse(
      {
        code: 'intelligence.project_unnamed',
        message: 'Cerulea Intelligence answers inside a project, and this drawer holds no project yet.',
        fix: 'Open or create a project in Studio, then ask again.',
        details: {},
      },
      400,
    );
  }
  try {
    const reply = await sendIntelligenceMessage(
      threadId,
      { text: message, interfaceState: interfaceStateOf(body.studioSnapshot) },
      callOptions(actor),
    );
    const text = reply.cards.map(cardText).join('\n\n');
    return new Response(text, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
