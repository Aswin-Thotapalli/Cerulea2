// apps/frontend/src/app/api/billing/subscription/route.ts
// Reads the subscription the account holds in one division.
// Cerulea APIs answers the production shape the billing screen reads: the
// subscription with its tier id, status, period end and pending cancellation,
// the tier from the priced catalogue, the add-ons, the one time purchases and
// the entitlement the tier and add-ons grant.
// Without this route the billing screen, the pricing screen and the checkout
// success screen cannot tell what the account pays for.

import { commerceCall } from '../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  return commerceCall(request, {
    method: 'GET',
    path: '/subscription',
    query: {
      division: url.searchParams.get('division'),
      workspaceId: url.searchParams.get('workspaceId'),
    },
  });
}
