// apps/frontend/src/app/api/dashboard/execution/route.ts
// The substrate each project runs on.
// Cerulea runs a Blueprint on one of three execution substrates. The choice
// lives in the build state of the project, so this route reads it from there.
// Without this route nobody can see how a deployed system executes.
import { readBuildState, readExecutionSubstrates } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { projectsWithBlueprints } from '@/lib/project-blueprints';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [{ entries }, described] = await Promise.all([
      projectsWithBlueprints(actor.displayName, options),
      readExecutionSubstrates(options),
    ]);
    const named = new Map(described.substrates.map((entry) => [entry.substrate, entry.name]));
    const projects = [];
    for (const entry of entries) {
      const held = await readBuildState(entry.project.projectId, options);
      projects.push({
        projectId: entry.project.projectId,
        projectName: entry.project.name,
        workspaceName: entry.workspace.name,
        state: entry.project.state,
        substrate: held.buildState.execution.substrate,
        substrateName:
          named.get(held.buildState.execution.substrate) ?? held.buildState.execution.substrate,
        reason: held.buildState.execution.reason,
      });
    }
    return { projects, substrates: described.substrates };
  });
}
