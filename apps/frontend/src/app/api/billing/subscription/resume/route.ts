// apps/frontend/src/app/api/billing/subscription/resume/route.ts
// Clears a pending end on the subscription the account holds in one division.
// The billing screen shows the Resume control while the subscription waits to
// end at the close of the paid period. Cerulea APIs keeps the subscription open.
// Without this route a person who cancelled would have to buy the plan again.

import { commerceCall, readBody } from '../../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await readBody(request);
  return commerceCall(request, {
    method: 'POST',
    path: '/subscription/resume',
    body: {
      ...(typeof body.division === 'string' ? { division: body.division } : {}),
      ...(typeof body.workspaceId === 'string' ? { workspaceId: body.workspaceId } : {}),
    },
  });
}
