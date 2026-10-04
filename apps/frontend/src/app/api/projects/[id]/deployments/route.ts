// apps/frontend/src/app/api/projects/[id]/deployments/route.ts
// The deployments of one project.
// GET lists every deployment Cerulea APIs ran for the project, newest first,
// with the seven stage rows of each. POST starts a deployment of the head
// Blueprint: the accessibility gate runs first, then Cerulea APIs takes the
// content address and runs the seven stages. The console polls the deployment
// route beside this one until the deployment settles.
// Without this route a built project could not be deployed from Studio.
import { listProjectDeployments, startProjectDeployment } from '@/lib/deployment/reads';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return withActor(async (actor) => ({
    deployments: await listProjectDeployments(params.id, callOptions(actor)),
  }));
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return withActor(async (actor) => startProjectDeployment(params.id, callOptions(actor)));
}
