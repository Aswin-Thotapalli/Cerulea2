// apps/frontend/src/app/api/auth/change-password/route.ts
// Changes the password of the signed in account.
// Cerulea APIs checks the current password, judges the strength of the new
// one and stores a fresh verifier. The screen shows the fix Cerulea APIs names
// when the new password fails a rule.
// Without this route the account screen holds a password form that saves nothing.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { type CeruleaAccount, ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(1).max(256),
});

// POST /api/auth/change-password {currentPassword, newPassword}
export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'password.change_incomplete',
        message: 'A password change carries the current password and the new one.',
        fix: 'Type both passwords, then update again.',
        details: {},
      },
      400,
    );
  }
  try {
    const changed = await ceruleaRequest<{ ok: true; account: CeruleaAccount }>(
      '/accounts/password',
      { method: 'POST', body: JSON.stringify(parsed.data) },
      callOptions(actor),
    );
    return NextResponse.json({
      ok: true,
      guidance: 'The password changed. Sign in with the new password from now on.',
      account: {
        email: changed.account.email,
        displayName: changed.account.displayName,
        multiFactorActive: changed.account.multiFactorActive,
      },
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
