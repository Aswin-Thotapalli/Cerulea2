// apps/frontend/src/app/api/projects/[id]/deployments/[deploymentId]/route.ts
// One deployment of one project, with every stage row as Cerulea APIs holds it.
// The deployment console reads this route every two seconds until the
// deployment settles. Every stage name, state, instant and outcome sentence
// comes from Cerulea APIs. Nothing is produced in the browser.
// Without this route the console would have no progress to show.
import { CeruleaApiError } from '@/lib/cerulea-api';
import { readProjectDeployment } from '@/lib/deployment/reads';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; deploymentId: string }> },
) {
  const params = await context.params;
  return withActor(async (actor) => {
    const held = await readProjectDeployment(params.deploymentId, callOptions(actor));
    if (held.projectId.length > 0 && held.projectId !== params.id) {
      throw new CeruleaApiError(
        {
          code: 'deployment.project_mismatch',
          message: 'This deployment belongs to another project.',
          fix: 'Open the project the deployment belongs to, then read it there.',
          details: { deploymentId: params.deploymentId },
        },
        404,
      );
    }
    return held;
  });
}
