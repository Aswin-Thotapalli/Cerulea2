// apps/frontend/src/app/api/billing/access/route.ts
// Reads the standing of the account in every division in one call: the tier
// held, its status, a pending end, the workspace serving the division and the
// pricing address to open when the division is closed.
// The billing screen uses it to offer the divisions the account pays in, and
// the settings screen to name the plan.
// Without this route a person paying in two divisions could only see one.

import { ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const access = await ceruleaRequest<Record<string, unknown>>(
      '/studio/access',
      { method: 'GET' },
      callOptions(actor),
    );
    return { ok: true, ...access };
  });
}
