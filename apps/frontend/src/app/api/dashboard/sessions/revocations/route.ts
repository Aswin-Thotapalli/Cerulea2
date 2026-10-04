// apps/frontend/src/app/api/dashboard/sessions/revocations/route.ts
// Closes every session of the signed in account.
// Cerulea APIs revokes the whole chain, including the session behind this
// request, so the screen signs this browser out right after the call.
// Without this route a person signing out of every device would close each
// session one at a time.
import { ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dashboard/sessions/revocations
export async function POST() {
  return withActor(async (actor) => {
    const closed = await ceruleaRequest<{ closed: number; guidance: string }>(
      '/sessions/revocations',
      { method: 'POST' },
      callOptions(actor),
    );
    return { closed: closed.closed, guidance: closed.guidance, signOutPath: '/api/auth/force-signout?next=/auth/login' };
  });
}
