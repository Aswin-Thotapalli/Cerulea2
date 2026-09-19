// apps/frontend/src/app/api/dashboard/integrations/route.ts
// The Integrations panel reads this route.
// Two kinds of connection appear. The platform drivers Cerulea APIs runs, and
// the feeds, bridges and outbound triggers each Blueprint declares.
// Without this route nobody can see what a deployment reaches outside itself.
import { readIntegrations } from '@/lib/blueprint/document';
import { readPlatformHealth } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { projectsWithBlueprints } from '@/lib/project-blueprints';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [health, { entries }] = await Promise.all([
      readPlatformHealth(options),
      projectsWithBlueprints(actor.displayName, options),
    ]);
    return {
      platform: {
        mode: health.mode,
        ready: health.ready,
        checkedAt: health.checkedAt,
        drivers: health.integrations,
      },
      projects: entries.map((entry) => {
        const integrations = readIntegrations(entry.document);
        return {
          projectId: entry.project.projectId,
          projectName: entry.project.name,
          workspaceName: entry.workspace.name,
          version: entry.version,
          feeds: integrations.feeds,
          bridges: integrations.bridges,
          triggers: integrations.triggers,
        };
      }),
    };
  });
}
