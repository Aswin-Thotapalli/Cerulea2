// apps/frontend/src/app/api/dashboard/overview/route.ts
// The Overview panel reads this route.
// Every count comes from a query over the platform database, and the health
// figures come from the node and the driver set through Cerulea APIs.
// Without this route the first Dashboard screen would report nothing.
import { readStudioOverview } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor((actor) => readStudioOverview(callOptions(actor)));
}
