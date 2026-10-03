// apps/frontend/src/app/api/dashboard/audit/route.ts
// The Audit panel reads this route.
// Cerulea records the actor, the action, the subject and the outcome of every
// change. A denial is recorded with the same weight as an allowed action.
// Without this route a review has nothing to read.
import { readAuditEvents } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { homeWorkspace, workspacesWithHome } from '@/lib/workspace-home';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const workspaces = await workspacesWithHome(actor.displayName, options);
    const workspace = await homeWorkspace(
      actor.displayName,
      options,
      search.get('workspaceId'),
    );
    const limit = search.get('limit');
    const offset = search.get('offset');
    const page = await readAuditEvents(
      workspace.workspaceId,
      {
        action: search.get('action') ?? undefined,
        outcome: search.get('outcome') ?? undefined,
        search: search.get('search') ?? undefined,
        since: search.get('since') ?? undefined,
        until: search.get('until') ?? undefined,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0,
      },
      options,
    );
    return { workspace, workspaces, ...page };
  });
}
