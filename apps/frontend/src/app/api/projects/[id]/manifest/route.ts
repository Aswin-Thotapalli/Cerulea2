// apps/frontend/src/app/api/projects/[id]/manifest/route.ts
// The Deployment Manifest of one project, in one of its three views.
// The summary carries counts. The atomic view expands every item. The
// comparison view sets the current manifest against an earlier version.
// Cerulea APIs enumerates the manifest out of the Blueprint, so this route
// carries the answer through unchanged.
// Without this route Studio could not show what a deployment installs.
import { readDeploymentManifest } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Reads one whole number out of a query value, or answers with nothing. */
function wholeNumber(value: string | null): number | undefined {
  if (value === null || value.trim().length === 0) return undefined;
  const held = Number(value);
  return Number.isInteger(held) && held > 0 ? held : undefined;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const held = new URL(request.url).searchParams;
  const asked = held.get('view');
  const view =
    asked === 'summary' || asked === 'atomic' || asked === 'comparison' ? asked : 'summary';
  return withActor(async (actor) =>
    readDeploymentManifest(
      params.id,
      {
        view,
        version: wholeNumber(held.get('version')),
        against: wholeNumber(held.get('against')),
      },
      callOptions(actor),
    ),
  );
}
