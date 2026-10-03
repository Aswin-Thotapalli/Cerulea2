// apps/frontend/src/app/api/dashboard/governance/route.ts
// The Governance panel reads this route.
// Each project states who may change the system, the share of validators each
// transaction class needs and the delay a constitutional change waits.
// Every value comes from the Blueprint of that project.
// Without this route nobody can see who holds authority over a deployment.
import { CLASS_THRESHOLDS, TRANSACTION_CLASSES } from '@/lib/blueprint/types';
import { readGovernance, readIdentities } from '@/lib/blueprint/document';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { projectsWithBlueprints } from '@/lib/project-blueprints';
import { CLASS_MEANING } from '@/components/dashboard/wording';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const { entries } = await projectsWithBlueprints(actor.displayName, options);
    return {
      classes: TRANSACTION_CLASSES.map((name) => ({
        name,
        architectureThreshold: CLASS_THRESHOLDS[name],
        mandatoryDelay: name === 'Constitutional',
        meaning: CLASS_MEANING[name] ?? '',
      })),
      projects: entries.map((entry) => {
        const governance = readGovernance(entry.document);
        const identities = readIdentities(entry.document);
        const named = new Map(identities.roles.map((role) => [role.id, role.name]));
        return {
          projectId: entry.project.projectId,
          projectName: entry.project.name,
          workspaceName: entry.workspace.name,
          state: entry.project.state,
          version: entry.version,
          authority: governance.authority.map((role) => named.get(role) ?? role),
          quorum: governance.quorum,
          constitutionalDelayBlocks: governance.constitutional_delay_blocks,
          changeProcess: governance.change_process,
          roleCount: identities.roles.length,
        };
      }),
    };
  });
}
