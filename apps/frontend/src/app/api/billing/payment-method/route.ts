// apps/frontend/src/app/api/billing/payment-method/route.ts
// Opens the page where the saved payment method of the division is replaced.
// Cerulea APIs asks the payments driver for a session and answers its address.
// In local mode the local driver serves that page itself and sends the browser
// back to the billing screen.
// Without this route a person could never change the card on file.

import { commerceCall, readBody } from '../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await readBody(request);
  return commerceCall(request, {
    method: 'POST',
    path: '/payment-method',
    body: {
      ...(typeof body.division === 'string' ? { division: body.division } : {}),
      ...(typeof body.workspaceId === 'string' ? { workspaceId: body.workspaceId } : {}),
    },
  });
}
