// apps/frontend/src/app/api/billing/_shared/commerce.ts
// The bridge between the production billing screens and the Cerulea APIs
// billing routes under /studio/billing.
// Every billing call works inside one division. The division comes from the
// request body, the query, the division cookie the gate writes, or the path
// of the calling screen. The Studio origin travels with every purchase, so the
// payments driver sends the browser back to the screen it left.
// Without this module each billing route would resolve the account, the
// division and the origin on its own.

import { NextResponse } from 'next/server';

import { ceruleaRequest } from '@/lib/cerulea-api';
import {
  type CeruleaActor,
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import { billingDivision } from '@/lib/entitlements-server';
import type { Division } from '@/config/divisions';

/** The Cerulea APIs path every billing route sits under. */
export const BILLING_PATH = '/studio/billing';

/** The body of a billing request, read once and shared by the route. */
export type BillingBody = Record<string, unknown>;

/** Reads the JSON body of a request. A missing or broken body reads as empty. */
export async function readBody(request: Request): Promise<BillingBody> {
  const parsed = await request.json().catch(() => null);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as BillingBody)
    : {};
}

/**
 * The origin the browser returns to after a purchase.
 * A proxy in front of Studio names the public host in x-forwarded-host.
 */
export function studioOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost?.split(',')[0]?.trim() || url.host;
  const protocol = forwardedProto?.split(',')[0]?.trim() || url.protocol.replace(/:$/, '');
  return `${protocol}://${host}`;
}

/** The answer a billing route returns when no division can be read. */
export function divisionUnnamed(): NextResponse {
  return failureResponse(
    {
      code: 'billing.division_unnamed',
      message: 'Cerulea reads the division this billing request works in.',
      fix: 'Open billing from the dApps, Enterprise or Government area of Studio, or add division=dapp, division=enterprise or division=govt to the request.',
      details: {},
    },
    400,
  );
}

/**
 * Points an invoice document address at the Studio route that serves it.
 * Cerulea APIs names its own document route, which needs the bearer token. An
 * address on another host, such as the payments provider, passes unchanged.
 */
export function studioDocumentAddress(
  invoiceId: string,
  address: string | null,
  format: 'pdf' | 'html',
): string | null {
  if (address === null) return null;
  if (/^https?:\/\//.test(address)) return address;
  return `/api/billing/invoices/${encodeURIComponent(invoiceId)}/document?format=${format}`;
}

/**
 * Adds the division to a success address on this site, so the success screen
 * polls the right division. Any other address passes unchanged.
 */
export function withDivision(url: unknown, division: string | undefined): unknown {
  if (typeof url !== 'string' || !division) return url;
  try {
    const parsed = new URL(url, 'http://studio.invalid');
    if (!parsed.pathname.startsWith('/pricing/success')) return url;
    parsed.searchParams.set('division', division);
    return url.startsWith('/') ? `${parsed.pathname}${parsed.search}` : parsed.toString();
  } catch {
    return url;
  }
}

/** Builds the query string of a Cerulea APIs call. */
export function queryString(values: Record<string, string | null | undefined>): string {
  const parts = Object.entries(values)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/** One call a billing route sends to Cerulea APIs. */
export type CommerceCall = {
  method: 'GET' | 'POST' | 'PATCH';
  /** The path after /studio/billing, starting with a slash. */
  path: string;
  /** The fields the Cerulea APIs route reads from the body. */
  body?: Record<string, unknown>;
  /** The query of a GET. */
  query?: Record<string, string | null | undefined>;
  /** A division already read by the route. */
  division?: Division | null;
  /** Reshapes the Cerulea APIs answer before it reaches the screen. */
  reshape?: (answer: Record<string, unknown>, context: CommerceContext) => Record<string, unknown>;
};

/** The context a route builds once and passes into each call. */
export type CommerceContext = {
  actor: CeruleaActor;
  division: Division;
  origin: string;
};

/**
 * Resolves the account, the division and the origin of one billing request.
 * The answer is a response when the request cannot proceed.
 */
export async function commerceContext(
  request: Request,
  named?: unknown,
): Promise<CommerceContext | NextResponse> {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const division = await billingDivision(request, named);
  if (!division) return divisionUnnamed();
  return { actor, division, origin: studioOrigin(request) };
}

/** Sends one call to the Cerulea APIs billing routes inside a resolved context. */
export async function sendCommerce<T extends Record<string, unknown>>(
  context: CommerceContext,
  call: CommerceCall,
): Promise<T> {
  const division = call.division ?? context.division;
  if (call.method === 'GET') {
    return ceruleaRequest<T>(
      `${BILLING_PATH}${call.path}${queryString({ ...(call.query ?? {}), division })}`,
      { method: 'GET' },
      callOptions(context.actor),
    );
  }
  return ceruleaRequest<T>(
    `${BILLING_PATH}${call.path}`,
    {
      method: call.method,
      body: JSON.stringify({ ...(call.body ?? {}), division, origin: context.origin }),
    },
    callOptions(context.actor),
  );
}

/**
 * Runs one billing call end to end and answers the screen.
 * The division named in the body or the query wins; the request context
 * supplies it otherwise.
 */
export async function commerceCall(request: Request, call: CommerceCall): Promise<NextResponse> {
  const context = await commerceContext(
    request,
    call.division ?? call.body?.division ?? call.query?.division,
  );
  if (context instanceof NextResponse) return context;
  try {
    const answer = await sendCommerce<Record<string, unknown>>(context, call);
    const shaped = call.reshape ? call.reshape(answer, context) : answer;
    return NextResponse.json({ ...shaped, division: context.division });
  } catch (cause) {
    return failureReply(cause);
  }
}
