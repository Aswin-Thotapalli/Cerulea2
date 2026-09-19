// apps/frontend/src/app/api/auth/register/route.ts
// Opens a Cerulea account through Cerulea APIs.
// Cerulea issues the second factor at the same moment, so the answer carries
// the enrolment address and the recovery codes once.
// Without this route nobody opens an account from Studio.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { registerAccount } from '@/lib/cerulea-api';
import { failureReply } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(2).max(120),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'account.details_incomplete',
          message: 'Cerulea needs a full name, an email address and a password of twelve characters.',
          fix: 'Fill every field, then open the account again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const outcome = await registerAccount({
      email: parsed.data.email.trim().toLowerCase(),
      displayName: parsed.data.name.trim(),
      password: parsed.data.password,
    });
    return NextResponse.json(outcome, { status: 201 });
  } catch (cause) {
    return failureReply(cause);
  }
}
