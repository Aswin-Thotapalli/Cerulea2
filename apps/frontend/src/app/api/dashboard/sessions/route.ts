// apps/frontend/src/app/api/dashboard/sessions/route.ts
// The sessions open on the signed in account.
// Cerulea APIs lists every session whose refresh token is still valid, marks
// the one behind this request as current and names the device and the network
// address each one opened from.
// Without this route nobody can see where an account is signed in.
import { listSessions } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dashboard/sessions
export async function GET() {
  return withActor(async (actor) => {
    const { sessions } = await listSessions(callOptions(actor));
    return { sessions, count: sessions.length };
  });
}
