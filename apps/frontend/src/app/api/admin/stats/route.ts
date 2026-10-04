// apps/frontend/src/app/api/admin/stats/route.ts
// The platform figures on the operator overview and in the administration frame.
// Cerulea APIs counts the accounts, the projects, the checkpoints and the open
// subscriptions through the administration summary read. The project type of
// each project comes from the division its workspace serves. The frame reads
// the running mode, the refusal count and the open items from the same body.
// Every administration read opens for the operator role alone.
// Without this route the operator overview shows no figure.
import { readAdministration } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { divisionForApplication, lockedProjectType } from '@/config/divisions';

import { type ProjectRow, type Summary, type WorkspaceRow, openItems } from '../_shared/reads';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [summary, held, spaces] = await Promise.all([
      readAdministration<Summary>('summary', options),
      readAdministration<{ projects: ProjectRow[] }>('projects', options),
      readAdministration<{ workspaces: WorkspaceRow[] }>('workspaces', options),
    ]);
    const applications = new Map(spaces.workspaces.map((row) => [row.workspaceId, row.application]));
    const types = held.projects.map((row) => {
      const division = divisionForApplication(applications.get(row.workspaceId));
      return division ? lockedProjectType(division) : null;
    });
    const threads = summary.counts.intelligenceThreads;
    return {
      ...summary,
      // The production overview reads these names at the top level.
      totalUsers: summary.counts.accounts,
      totalProjects: summary.counts.projects,
      activeSubscriptions: summary.counts.openSubscriptions,
      blockchainProjects: types.filter((type) => type === 'blockchain').length,
      dappProjects: types.filter((type) => type === 'dapp').length,
      totalSnapshots: summary.counts.checkpoints,
      // The thread count appears once Cerulea APIs counts it. The card stays out until then.
      ...(typeof threads === 'number' ? { totalAiThreads: threads } : {}),
      // The administration frame reads these three.
      mode: summary.platform.mode,
      refusedActions: summary.counts.refusedActions,
      openItems: openItems(summary.platform),
    };
  });
}
