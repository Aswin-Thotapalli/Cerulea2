// apps/frontend/src/app/api/auth/reset-password/route.ts
// Completes password recovery through Cerulea APIs.
// Setting the password closes every open session on the account.
// Without this route the recovery link leads nowhere.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { completeRecovery } from '@/lib/cerulea-api';
import { failureReply, failureResponse } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  token: z.string().min(8).max(200),
  password: z.string().min(12).max(256),
  // An account with an active second factor confirms the recovery with a code.
  multiFactorCode: z.string().min(4).max(32).optional(),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'recovery.details_incomplete',
        message: 'Cerulea needs the link from the email and a password of twelve characters.',
        fix: 'Open the link from the email again, then type the new password.',
        details: {},
      },
      400,
    );
  }
  try {
    const outcome = await completeRecovery(parsed.data);
    return NextResponse.json(outcome, { status: 200 });
  } catch (cause) {
    return failureReply(cause);
  }
}
