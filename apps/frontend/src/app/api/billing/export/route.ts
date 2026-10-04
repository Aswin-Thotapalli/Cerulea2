// apps/frontend/src/app/api/billing/export/route.ts
// Buys one export of the chain data of the division, as a CSV or a PDF file.
// The export is a pay per use action on the tiers that offer it. Cerulea APIs
// charges it through the payments driver and answers the address the browser
// continues to. In local mode the charge settles at once and the answer also
// names where the file is read from.
// Without this route the export control on the billing screen would do nothing.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody } from '../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const exportBody = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = exportBody.safeParse(await readBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.export_format_unnamed',
        message: 'Cerulea exports chain data as csv or pdf.',
        fix: 'Choose one of the two formats, then export again.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  return commerceCall(request, { method: 'POST', path: '/export', body: parsed.data });
}
