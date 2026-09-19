// apps/frontend/src/app/api/dashboard/networks/route.ts
// The Networks panel reads the Blockchain through this route.
// Every figure comes from the node itself through Cerulea APIs. The height,
// the peer count and the measured throughput are read rather than estimated.
// Without this route the panel would show nothing about the running network.
import { NextResponse } from 'next/server';

import { listDeployments, readChainMeasurement, readChainNetwork } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';
import { workspacesWithHome } from '@/lib/workspace-home';
import { listProjects } from '@/lib/cerulea-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const sample = new URL(request.url).searchParams.get('blocks');
  try {
    const options = callOptions(actor);
    const [network, measurement] = await Promise.all([
      readChainNetwork(options),
      readChainMeasurement(sample ? Number(sample) : undefined, options),
    ]);

    const workspaces = await workspacesWithHome(actor.displayName, options);
    const deployments = [];
    for (const workspace of workspaces) {
      const page = await listProjects(workspace.workspaceId, options);
      for (const project of page.projects) {
        for (const deployment of await listDeployments(project.projectId, options)) {
          deployments.push({
            deploymentId: deployment.id,
            status: deployment.status,
            projectId: project.projectId,
            projectName: project.name,
            workspaceName: workspace.name,
            record: deployment.record,
          });
        }
      }
    }

    return NextResponse.json({ network, measurement, deployments });
  } catch (cause) {
    return failureReply(cause);
  }
}
