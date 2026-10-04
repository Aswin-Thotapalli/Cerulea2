// apps/frontend/src/app/api/billing/customer/route.ts
// Reads and changes the billing details of the division: the billed name, the
// phone number, the billing address and the tax identifiers.
// Cerulea APIs keeps the details with the payments driver, which prints them on
// every invoice. One PATCH changes the address, adds one tax identifier or
// removes one, as the production screen sends them.
// Without this route the invoices would carry no address and no tax identifier.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody } from '../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const customerBody = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  address: z
    .object({
      line1: z.string().min(1).max(200),
      line2: z.string().max(200).optional().nullable(),
      city: z.string().min(1).max(120),
      state: z.string().max(120).optional().nullable(),
      postal_code: z.string().max(40).optional().nullable(),
      country: z.string().length(2),
    })
    .optional(),
  addTaxId: z
    .object({ type: z.string().min(1).max(40), value: z.string().min(1).max(80) })
    .optional(),
  removeTaxId: z.string().min(1).max(80).optional(),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  return commerceCall(request, {
    method: 'GET',
    path: '/customer',
    query: {
      division: url.searchParams.get('division'),
      workspaceId: url.searchParams.get('workspaceId'),
    },
  });
}

export async function PATCH(request: Request) {
  const parsed = customerBody.safeParse(await readBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.customer_unreadable',
        message:
          'Cerulea reads a billing address with a first line, a city and a two letter country, or one tax identifier with its type and value.',
        fix: 'Fill the address or the tax identifier fully, then save again.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  return commerceCall(request, { method: 'PATCH', path: '/customer', body: parsed.data });
}
