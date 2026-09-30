// apps/frontend/src/app/api/auth/me/route.ts
// The account behind the current session.
// The route reads the account Cerulea APIs holds for the access token of the
// signed in person, and answers with the name, the address and the state of
// the second factor. The token stays on the server.
// Without this route the profile screen reads nothing.
import { readAccount } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const held = await readAccount(callOptions(actor));
    return {
      account: {
        displayName: held.account.displayName,
        email: held.account.email,
        multiFactorActive: held.account.multiFactorActive,
        lastSignInAt: held.account.lastSignInAt ?? null,
        createdAt: held.account.createdAt,
      },
    };
  });
}
