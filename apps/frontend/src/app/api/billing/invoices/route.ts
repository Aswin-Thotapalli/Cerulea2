// apps/frontend/src/app/api/billing/invoices/route.ts
// Lists the invoices of the workspace serving the division, twelve at a time.
// Cerulea APIs keeps every invoice the payments driver issued for the
// workspace, newest first. The cursor `starting_after` names the last invoice
// the screen already shows.
// Without this route the billing screen shows no invoice history.

import { NextResponse } from 'next/server';

import { ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';
import { billingHome } from '@/lib/entitlements-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 12;

/** One invoice as Cerulea APIs records it for a workspace. */
type WorkspaceInvoice = {
  invoiceId: string;
  invoiceReference: string;
  state: string;
  currency: string;
  totalMinor: number;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  lines: { description: string }[];
};

export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const search = new URL(request.url).searchParams;
  const startingAfter = search.get('starting_after');
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request, { workspaceId: search.get('workspaceId') });
    const listed = await ceruleaRequest<{ invoices: WorkspaceInvoice[] }>(
      `/v1/workspaces/${encodeURIComponent(home.workspace.workspaceId)}/invoices`,
      { method: 'GET' },
      options,
    );
    // A cursor naming no listed invoice reads past the end of the list.
    const cursor = startingAfter
      ? listed.invoices.findIndex((entry) => entry.invoiceId === startingAfter)
      : -1;
    const after = startingAfter && cursor < 0 ? listed.invoices.length : cursor + 1;
    const page = listed.invoices.slice(after, after + PAGE_SIZE);
    return NextResponse.json({
      ok: true,
      division: home.division,
      workspaceId: home.workspace.workspaceId,
      hasMore: after + PAGE_SIZE < listed.invoices.length,
      invoices: page.map((entry) => ({
        id: entry.invoiceId,
        number: entry.invoiceReference,
        date: Math.floor(new Date(entry.issuedAt).getTime() / 1000),
        amountPaid: entry.paidAt ? entry.totalMinor : 0,
        amountDue: entry.paidAt ? 0 : entry.totalMinor,
        currency: entry.currency,
        status: entry.state,
        description: entry.lines.map((line) => line.description).join('; ') || null,
        periodStart: entry.periodStart,
        periodEnd: entry.periodEnd,
        dueAt: entry.dueAt,
        paidAt: entry.paidAt,
      })),
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
