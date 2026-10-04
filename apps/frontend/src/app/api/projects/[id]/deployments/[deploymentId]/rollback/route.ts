// apps/frontend/src/app/api/projects/[id]/deployments/[deploymentId]/rollback/route.ts
// Rolls one deployment back on request.
// Cerulea deployment is atomic: a stage failure rolls every earlier stage back
// on its own. This route serves the case where a person asks for the rollback
// of a deployment that finished. Cerulea APIs runs the rollback of every stage
// and the answer carries the stage rows with their rollback outcomes.
// Without this route a finished deployment could only be left in place.
import { rollbackProjectDeployment } from '@/lib/deployment/reads';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; deploymentId: string }> },
) {
  const params = await context.params;
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = typeof body?.reason === 'string' && body.reason.length >= 4 ? body.reason : undefined;
  return withActor(async (actor) =>
    rollbackProjectDeployment(params.deploymentId, reason, callOptions(actor)),
  );
}
