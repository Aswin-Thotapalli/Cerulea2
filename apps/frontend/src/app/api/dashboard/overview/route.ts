// apps/frontend/src/app/api/dashboard/overview/route.ts
// The Overview panel reads this route.
// Every count comes from the Cerulea APIs overview read, which counts the
// projects, the checkpoints and the deployments of every workspace the account
// belongs to. The Blockchain figures come from the node through the same read.
// Without this route the first Dashboard screen would report nothing.
import { readStudioOverview } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const overview = await readStudioOverview(callOptions(actor));
    const counts = overview.counts;
    return {
      ...overview,
      // The production screens read these names at the top level.
      totalProjects: counts.projects,
      activeDeployments: counts.projectsDeployed,
      draftProjects: counts.projects - counts.projectsDeployed,
      totalSnapshots: counts.checkpoints,
      recentProjects: overview.recentProjects.map((project) => ({
        ...project,
        id: project.projectId,
        status: project.state === 'deployed' ? 'active' : project.state,
      })),
    };
  });
}
