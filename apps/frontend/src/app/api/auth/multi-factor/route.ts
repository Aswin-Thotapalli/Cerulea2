// apps/frontend/src/app/api/auth/multi-factor/route.ts
// Confirms the second factor and opens the account for sign in.
// Cerulea holds a new account closed until the authenticator produces one code.
// Without this route a new account never opens.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { activateMultiFactor } from '@/lib/cerulea-api';
import { failureReply } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'account.activation_incomplete',
          message: 'Cerulea needs the address, the password and the code from the authenticator.',
          fix: 'Fill all three, then confirm again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const outcome = await activateMultiFactor({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      code: parsed.data.code.trim(),
    });
    return NextResponse.json(outcome, { status: 200 });
  } catch (cause) {
    return failureReply(cause);
  }
}
