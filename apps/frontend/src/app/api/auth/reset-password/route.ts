// apps/frontend/src/app/api/auth/reset-password/route.ts
// Completes password recovery through Cerulea APIs.
// Setting the password closes every open session on the account.
// Without this route the recovery link leads nowhere.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { completeRecovery } from '@/lib/cerulea-api';
import { failureReply } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  token: z.string().min(8).max(200),
  password: z.string().min(12).max(256),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'recovery.details_incomplete',
          message: 'Cerulea needs the link from the email and a password of twelve characters.',
          fix: 'Open the link from the email again, then type the new password.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const outcome = await completeRecovery(parsed.data);
    return NextResponse.json(outcome, { status: 200 });
  } catch (cause) {
    return failureReply(cause);
  }
}
