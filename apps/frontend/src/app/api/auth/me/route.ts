// apps/frontend/src/app/api/auth/me/route.ts
// The account behind the current session.
// GET reads the account Cerulea APIs holds for the access token of the
// signed in person, and answers with the name, the address and the state of
// the second factor. PUT changes the name through the Cerulea APIs profile
// route. The token stays on the server.
// Without this route the profile screen reads nothing and renames nobody.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readAccount } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
  withActor,
} from '@/lib/cerulea-server';
import { changeProfile } from '@/app/api/profile/_shared/profile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const nameBody = z.object({ name: z.string().trim().min(2).max(120) });

export async function GET() {
  return withActor(async (actor) => {
    const held = await readAccount(callOptions(actor));
    return {
      // The production screens read these three fields at the top level.
      id: held.account.accountId,
      email: held.account.email,
      name: held.account.displayName,
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

// PUT /api/auth/me {name}
export async function PUT(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = nameBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'account.name_short',
        message: 'A name holds at least two characters.',
        fix: 'Type the name, then save again.',
        details: {},
      },
      400,
    );
  }
  try {
    const changed = await changeProfile({ name: parsed.data.name }, callOptions(actor));
    return NextResponse.json({
      id: changed.user.id,
      email: changed.user.email,
      name: changed.user.name,
      profile: changed.profile,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
