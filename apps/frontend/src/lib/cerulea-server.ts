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
import { type Division, asDivision } from '@/config/divisions';

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
  const cookieJar = await cookies();
  const headerBag = await headers();
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

/**
 * Reads the division a request works inside.
 * The query value wins, then the cookie the gate writes on every division path.
 * The answer is absent outside a division.
 */
export async function requestDivision(request?: Request): Promise<Division | null> {
  if (request) {
    const named = asDivision(new URL(request.url).searchParams.get('division'));
    if (named) return named;
  }
  const cookieJar = await cookies();
  return asDivision(cookieJar.get('cerulea.division')?.value);
}

/** Builds the call options a Studio handler passes to the Cerulea APIs client. */
export function callOptions(actor: CeruleaActor): CeruleaApiOptions {
  return { accessToken: actor.accessToken };
}

/** The fields every Studio failure carries. */
export type StudioFailure = {
  code: string;
  message: string;
  fix: string;
  details: Record<string, unknown>;
};

/**
 * Builds the body of one failure.
 * The production screens read `error` as one sentence, so the body carries the
 * message and the fix there. The same fields also stand on their own, so a
 * screen can show the fix apart from the message.
 */
export function failureBody(failure: StudioFailure): StudioFailure & { error: string } {
  return { error: `${failure.message} ${failure.fix}`.trim(), ...failure };
}

/** Answers one failure with the status it carries. */
export function failureResponse(failure: StudioFailure, status: number): NextResponse {
  return NextResponse.json(failureBody(failure), { status });
}

/** The answer a Studio route returns when nobody signed in. */
export function signInRequired(): NextResponse {
  return failureResponse(
    {
      code: 'session.absent',
      message: 'This screen reads work held against an account.',
      fix: 'Sign in with the account that holds the work, then open the screen again.',
      details: {},
    },
    401,
  );
}

/** Turns any failure into the shape every Studio screen reads. */
export function failureReply(cause: unknown): NextResponse {
  if (cause instanceof CeruleaApiError) {
    return failureResponse(
      {
        code: cause.code,
        message: cause.message.replace(` ${cause.fix}`, ''),
        fix: cause.fix,
        details: cause.details,
      },
      cause.status,
    );
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return failureResponse(
    {
      code: 'studio.unnamed',
      message,
      fix: 'Open the screen again. Report the problem to the Cerulea operator when it repeats.',
      details: {},
    },
    500,
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
