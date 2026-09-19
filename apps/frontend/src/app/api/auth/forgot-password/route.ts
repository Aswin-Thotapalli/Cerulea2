// apps/frontend/src/app/api/auth/forgot-password/route.ts
// Starts password recovery through Cerulea APIs.
// Cerulea sends the link to the address and answers the same way every time,
// so the answer reveals nothing about who holds an account.
// Without this route a forgotten password locks the account out.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { startRecovery } from '@/lib/cerulea-api';
import { failureReply } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'recovery.address_absent',
          message: 'Cerulea needs the email address on the account.',
          fix: 'Type the address, then ask for the link again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const outcome = await startRecovery(parsed.data.email.trim().toLowerCase());
    return NextResponse.json(outcome, { status: 202 });
  } catch (cause) {
    return failureReply(cause);
  }
}
