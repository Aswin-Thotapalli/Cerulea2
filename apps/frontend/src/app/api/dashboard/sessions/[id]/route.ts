// apps/frontend/src/app/api/dashboard/sessions/[id]/route.ts
// Closes one session of the signed in account.
// Cerulea APIs revokes the session at once, so a stolen or forgotten sign in
// stops working everywhere. Closing the current session signs this browser out.
// Without this route a person can see a strange session and do nothing about it.
import { closeSession } from '@/lib/cerulea-api';
import { callOptions, failureResponse, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// DELETE /api/dashboard/sessions/:id
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || id.trim().length === 0) {
    return failureResponse(
      {
        code: 'session.unnamed',
        message: 'Cerulea reads the session to close on this request.',
        fix: 'Choose a session from the list, then close it again.',
        details: {},
      },
      400,
    );
  }
  return withActor(async (actor) => {
    const { session } = await closeSession(id, callOptions(actor));
    return { session, guidance: `The session on ${session.device} is closed.` };
  });
}
