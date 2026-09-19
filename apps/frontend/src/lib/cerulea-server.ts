// apps/frontend/src/lib/cerulea-server.ts
// The bridge between a Studio route handler and Cerulea APIs.
// A handler resolves the signed in account here, receives the access token
// Cerulea APIs issued, and returns the failure Cerulea APIs named.
// Without this module a Studio route reaches Cerulea APIs with no identity.

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { CeruleaApiError, type CeruleaApiOptions } from '@/lib/cerulea-api';
import type { CeruleaTokenSet } from '@/lib/auth';

export type CeruleaActor = {
  accountId: string;
  email: string;
  displayName: string;
  accessToken: string;
};

/**
 * Reads the account behind the current request.
 * The answer is absent when nobody signed in, or when the session reached its end.
 */
export async function ceruleaActor(): Promise<CeruleaActor | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const cookieJar = cookies();
  const headerBag = headers();
  const request = {
    headers: Object.fromEntries(headerBag.entries()),
    cookies: Object.fromEntries(cookieJar.getAll().map((entry) => [entry.name, entry.value])),
  };
  const token = (await getToken({
    req: request as never,
    secret,
  })) as (Record<string, unknown> & { cerulea?: CeruleaTokenSet }) | null;
  const carrier = token?.cerulea;
  if (!carrier || carrier.accessToken.length === 0) return null;
  return {
    accountId: carrier.accountId,
    email: carrier.email,
    displayName: carrier.displayName,
    accessToken: carrier.accessToken,
  };
}

/** Builds the call options a Studio handler passes to the Cerulea APIs client. */
export function callOptions(actor: CeruleaActor): CeruleaApiOptions {
  return { accessToken: actor.accessToken };
}

/** The answer a Studio route returns when nobody signed in. */
export function signInRequired(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'session.absent',
        message: 'This screen reads work held against an account.',
        fix: 'Sign in with the account that holds the work, then open the screen again.',
        details: {},
      },
    },
    { status: 401 },
  );
}

/** Turns any failure into the shape every Studio screen reads. */
export function failureReply(cause: unknown): NextResponse {
  if (cause instanceof CeruleaApiError) {
    return NextResponse.json(
      {
        error: {
          code: cause.code,
          message: cause.message.replace(` ${cause.fix}`, ''),
          fix: cause.fix,
          details: cause.details,
        },
      },
      { status: cause.status },
    );
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return NextResponse.json(
    {
      error: {
        code: 'studio.unnamed',
        message,
        fix: 'Open the screen again. Report the problem to the Cerulea operator when it repeats.',
        details: {},
      },
    },
    { status: 500 },
  );
}

/** Runs one handler with the signed in account, and reports every failure the same way. */
export async function withActor<T>(
  work: (actor: CeruleaActor) => Promise<T>,
): Promise<NextResponse> {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    return NextResponse.json(await work(actor));
  } catch (cause) {
    return failureReply(cause);
  }
}
