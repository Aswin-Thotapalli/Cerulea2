// apps/frontend/src/app/api/billing/invoices/route.ts
// Lists the invoices of the division, twelve at a time.
// Cerulea APIs answers each invoice with its number, date, amounts, status and
// two document addresses. Those addresses sit behind the Cerulea APIs bearer
// token, so this route rewrites them onto the Studio document route, which
// carries the token on the person's behalf.
// Without this route the billing screen would list no invoice.

import { commerceCall, studioDocumentAddress } from '../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The invoice fields the production screen reads. */
type InvoiceRow = {
  id: string;
  pdfUrl: string | null;
  viewUrl: string | null;
  [key: string]: unknown;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  return commerceCall(request, {
    method: 'GET',
    path: '/invoices',
    query: {
      division: url.searchParams.get('division'),
      starting_after: url.searchParams.get('starting_after'),
      workspaceId: url.searchParams.get('workspaceId'),
    },
    reshape: (answer) => ({
      ...answer,
      invoices: ((answer.invoices as InvoiceRow[] | undefined) ?? []).map((invoice) => ({
        ...invoice,
        pdfUrl: studioDocumentAddress(invoice.id, invoice.pdfUrl, 'pdf'),
        viewUrl: studioDocumentAddress(invoice.id, invoice.viewUrl, 'html'),
      })),
    }),
  });
}
