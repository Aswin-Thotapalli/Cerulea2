// apps/frontend/src/app/api/dashboard/audit-logs/route.ts
// The Audit screen and the account screen read the audit record here.
// Cerulea APIs records the actor, the action, the subject and the outcome of
// every change inside a workspace. This route reads that record from every
// workspace the account may review and merges it, newest first.
// Without this route the account holder has no record of what changed.
import { type AuditEvent, CeruleaApiError, listWorkspaces, readAuditEvents } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The number of entries the screen receives. */
const PAGE = 200;

/**
 * Names the status the production screens show for one outcome.
 * Cerulea records allowed, denied and failed. A denial and a failure both
 * read as a failure on the screen.
 */
function screenStatus(outcome: string): string {
  return outcome === 'allowed' ? 'success' : 'failure';
}

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const { workspaces } = await listWorkspaces(options);
    const gathered: { event: AuditEvent; workspaceName: string }[] = [];
    for (const workspace of workspaces) {
      try {
        const page = await readAuditEvents(workspace.workspaceId, { limit: PAGE }, options);
        for (const event of page.events) {
          gathered.push({ event, workspaceName: workspace.name });
        }
      } catch (cause) {
        // A member whose role carries no audit read sees no record for that workspace.
        if (cause instanceof CeruleaApiError && cause.status === 403) continue;
        throw cause;
      }
    }
    const logs = gathered
      .sort((left, right) => right.event.occurredAt.localeCompare(left.event.occurredAt))
      .slice(0, PAGE)
      .map(({ event, workspaceName }) => ({
        id: event.eventId,
        createdAt: event.occurredAt,
        actorEmail: event.actorEmail.length > 0 ? event.actorEmail : null,
        actorName: event.actorName.length > 0 ? event.actorName : null,
        actorType: event.accountId === null ? 'system' : 'user',
        action: event.action,
        resource: event.subjectType,
        resourceId: event.subjectId,
        status: screenStatus(event.outcome),
        outcome: event.outcome,
        ip: event.networkAddress.length > 0 ? event.networkAddress : null,
        userId: event.accountId,
        workspaceId: event.workspaceId,
        workspaceName,
        detail: event.detail,
      }));
    return { logs, total: logs.length };
  });
}
