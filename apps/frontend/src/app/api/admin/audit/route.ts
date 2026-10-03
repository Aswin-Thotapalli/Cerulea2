// apps/frontend/src/app/api/admin/audit/route.ts
// The platform audit trail for the Cerulea operator.
// Cerulea APIs reads the newest audit events of the whole platform through the
// administration security read. That read opens for the operator role alone and
// answers every other account with a refusal naming the fix.
// Without this route the operator has no record of sign ins and refusals.
import { ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SecurityRead = {
  events: {
    eventId: string;
    action: string;
    subjectType: string;
    outcome: string;
    networkAddress: string;
    accountEmail: string;
    occurredAt: string;
  }[];
};

/** The most events the administration read returns in one call. */
const CEILING = 500;

/** The number of events the screen receives when it names no limit. */
const STANDARD = 200;

/**
 * The screens name the sign in family with the prefix `auth.`.
 * Cerulea records that family under the account and session actions.
 */
const SIGN_IN_FAMILY = ['account.', 'session.'];

function matchesAction(action: string, wanted: string): boolean {
  if (wanted === 'auth.') return SIGN_IN_FAMILY.some((prefix) => action.startsWith(prefix));
  return action.includes(wanted);
}

/** Cerulea records allowed, denied and failed. A denial and a failure both read as a failure. */
function screenStatus(outcome: string): string {
  return outcome === 'allowed' ? 'success' : 'failure';
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const asked = Number(search.get('limit') ?? STANDARD);
  const limit =
    Number.isFinite(asked) && asked >= 1 ? Math.min(Math.floor(asked), CEILING) : STANDARD;
  const action = search.get('action') ?? '';
  const status = search.get('status') ?? '';
  // The filters run after the read, so Cerulea reads the full ceiling when a filter is named.
  const reach = action.length > 0 || (status.length > 0 && status !== 'all') ? CEILING : limit;
  return withActor(async (actor) => {
    const page = await ceruleaRequest<SecurityRead>(
      `/studio/administration/security?limit=${reach}`,
      { method: 'GET' },
      callOptions(actor),
    );
    const logs = page.events
      .map((event) => ({
        id: event.eventId,
        createdAt: event.occurredAt,
        actorEmail: event.accountEmail.length > 0 ? event.accountEmail : null,
        actorType: event.accountEmail.length > 0 ? 'user' : 'system',
        action: event.action,
        resource: event.subjectType,
        status: screenStatus(event.outcome),
        outcome: event.outcome,
        ip: event.networkAddress.length > 0 ? event.networkAddress : null,
      }))
      .filter((entry) => (action ? matchesAction(entry.action, action) : true))
      .filter((entry) => (status && status !== 'all' ? entry.status === status : true))
      .slice(0, limit);
    return { logs, total: logs.length };
  });
}
