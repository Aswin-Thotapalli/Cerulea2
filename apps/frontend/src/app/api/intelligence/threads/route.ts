// apps/frontend/src/app/api/intelligence/threads/route.ts
// Opens one Cerulea Intelligence thread against one project.
// The route carries the signed in account through to Cerulea APIs and returns
// the answer unchanged. Studio holds no model and reaches no outside service.
// Without this route the chat surface has nowhere to send a question.
import { startIntelligenceThread } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  return withActor(async (actor) => {
    const body = (await request.json().catch(() => ({}))) as { projectId?: unknown };
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    return startIntelligenceThread(projectId, callOptions(actor));
  });
}
