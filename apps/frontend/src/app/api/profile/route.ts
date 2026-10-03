// apps/frontend/src/app/api/profile/route.ts
// The account screen reads the name and the address of the account here.
// Cerulea APIs holds the account behind the access token and answers with the
// name, the address and the state of the second factor. The account record
// carries no company and no role, so the profile part of the answer is empty.
// Without this route the account screen opens with an empty name.
import { readAccount } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const { account } = await readAccount(callOptions(actor));
    return {
      user: {
        id: account.accountId,
        email: account.email,
        name: account.displayName,
        state: account.state,
        multiFactorActive: account.multiFactorActive,
        lastSignInAt: account.lastSignInAt ?? null,
        createdAt: account.createdAt,
      },
      profile: null,
    };
  });
}
