// apps/frontend/src/app/api/billing/invoices/[id]/document/route.ts
// Serves one invoice as a page or as a PDF file.
// Cerulea APIs renders the invoice for the account that may read the
// workspace it belongs to. The browser cannot carry the Cerulea APIs token on
// a link, so this route fetches the document with the token and passes the
// bytes, the content type and the file name through unchanged.
// Without this route the view and download links of the invoice table would
// answer a refusal.

import { NextResponse } from 'next/server';

import { CERULEA_STUDIO_DEVICE, ceruleaApiBaseUrl } from '@/lib/cerulea-api';
import { ceruleaActor, failureResponse, signInRequired } from '@/lib/cerulea-server';
import { BILLING_PATH } from '../../../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The failure shape Cerulea APIs answers. */
type UpstreamFailure = {
  error?: { code?: string; message?: string; fix?: string; details?: Record<string, unknown> };
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const { id } = await context.params;
  const format = new URL(request.url).searchParams.get('format') === 'pdf' ? 'pdf' : 'html';
  const base = ceruleaApiBaseUrl();
  const path = `${BILLING_PATH}/invoices/${encodeURIComponent(id)}/document?format=${format}`;
  let upstream: Response;
  try {
    upstream = await fetch(`${base}${path}`, {
      headers: {
        authorization: `Bearer ${actor.accessToken}`,
        'x-cerulea-device': CERULEA_STUDIO_DEVICE,
      },
    });
  } catch {
    return failureResponse(
      {
        code: 'service.unreachable',
        message: `Cerulea APIs at ${base} did not answer.`,
        fix: 'Start Cerulea APIs, or set CERULEA_API_URL to the address it runs on.',
        details: { base, path },
      },
      503,
    );
  }
  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => null)) as UpstreamFailure | null;
    const failure = payload?.error;
    return failureResponse(
      {
        code: failure?.code ?? 'billing.invoice_unavailable',
        message:
          failure?.message ?? `Cerulea APIs answered ${upstream.status} for the invoice document.`,
        fix: failure?.fix ?? 'Open the invoice list again and choose the invoice from there.',
        details: failure?.details ?? {},
      },
      upstream.status,
    );
  }
  const headers = new Headers();
  headers.set(
    'content-type',
    upstream.headers.get('content-type') ??
      (format === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8'),
  );
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers.set('content-disposition', disposition);
  headers.set('cache-control', 'private, no-store');
  return new NextResponse(upstream.body, { status: 200, headers });
}
