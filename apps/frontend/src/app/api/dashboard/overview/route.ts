// apps/frontend/src/app/api/dashboard/overview/route.ts
// The Overview screen reads this route.
// The counts, the Blockchain state, the drivers, the open items and the recent
// events come from the Cerulea APIs overview read. The project table and the
// split between Blockchain networks and dApps come from the workspaces and
// their projects. The request figure comes from the request observatory of
// each workspace, summed across the account.
// Without this route the first Dashboard screen would report nothing.
import { type CeruleaApiOptions, ceruleaRequest, readStudioOverview } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { readProjectRows } from '@/app/api/dashboard/_shared/project-rows';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The part of the Interfaces read this route sums. */
type InterfacesReading = {
  deploymentId: string | null;
  endpoints: { traffic: { requests: number } }[];
  window: { startedAt: string; observations: number };
};

/** The requests every published endpoint of one workspace served inside the window. */
async function readServedRequests(workspaceId: string, options: CeruleaApiOptions) {
  const reading = await ceruleaRequest<InterfacesReading>(
    `/dashboard/workspaces/${encodeURIComponent(workspaceId)}/interfaces`,
    { method: 'GET' },
    options,
  );
  return {
    served: reading.endpoints.reduce((sum, endpoint) => sum + endpoint.traffic.requests, 0),
    deployments: reading.deploymentId ? 1 : 0,
    since: reading.window.startedAt,
  };
}

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [overview, held] = await Promise.all([
      readStudioOverview(options),
      readProjectRows(options),
    ]);
    const served = await Promise.all(
      held.workspaces.map((workspace) => readServedRequests(workspace.workspaceId, options)),
    );
    const since = served.map((entry) => entry.since).sort()[0] ?? null;
    return {
      ...overview,
      projects: held.projects,
      tiles: {
        projects: overview.counts.projects,
        live: overview.counts.projectsDeployed,
        inBuild: overview.counts.projectsInBuild,
        drafts: held.projects.filter((project) => project.state === 'draft').length,
        chains: held.projects.filter((project) => project.projectType === 'blockchain').length,
        dapps: held.projects.filter((project) => project.projectType === 'dapp').length,
        deployments: overview.counts.deployments,
        deploymentsRunning: overview.counts.deploymentsRunning,
        requests: served.reduce((sum, entry) => sum + entry.served, 0),
        servingDeployments: served.reduce((sum, entry) => sum + entry.deployments, 0),
        requestsSince: since,
      },
    };
  });
}
