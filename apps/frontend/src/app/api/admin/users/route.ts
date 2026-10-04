// apps/frontend/src/app/api/admin/users/route.ts
// Every account on the platform, for the Cerulea operator.
// Cerulea APIs lists the accounts through the administration accounts read,
// which opens for the operator role alone. Each row carries the state of the
// second factor, the open sessions and the workspaces the account belongs to.
// The plan, the subscription state and the project count ride on the row once
// Cerulea APIs carries them; until then the reply says so and the screen hides
// those columns and the plan filter.
// Without this route the operator user screen shows nothing.
import { NextResponse } from 'next/server';

import { readAdministration } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';

import type { AccountRow } from '../_shared/reads';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The row the User Management screen renders. */
export type OperatorUser = {
  id: string;
  name: string | null;
  email: string;
  state: string;
  multiFactorActive: boolean;
  openSessions: number;
  workspaceCount: number;
  lastSignInAt: string | null;
  createdAt: string;
  /** Present once the account rows carry a plan. */
  plan?: string | null;
  subStatus?: string | null;
  projectCount?: number;
};

function toUser(row: AccountRow): OperatorUser {
  const user: OperatorUser = {
    id: row.accountId,
    name: row.displayName.length > 0 ? row.displayName : null,
    email: row.email,
    state: row.state,
    multiFactorActive: row.multiFactorActive,
    openSessions: row.openSessions,
    workspaceCount: row.workspaces,
    lastSignInAt: row.lastSignInAt,
    createdAt: row.createdAt,
  };
  if ('planId' in row) user.plan = row.planId ?? null;
  if ('subscriptionState' in row) user.subStatus = row.subscriptionState ?? null;
  if (typeof row.projects === 'number') user.projectCount = row.projects;
  return user;
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const term = search.get('search')?.toLowerCase() ?? '';
  const plan = search.get('plan') ?? '';
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const held = await readAdministration<{ accounts: AccountRow[] }>(
      'accounts',
      callOptions(actor),
    );
    const everyone = held.accounts.map(toUser);
    // The plan rides on the row once Cerulea APIs carries it. The filter and the
    // paid count exist from that moment.
    const plansKnown = everyone.some((row) => 'plan' in row);
    if (plan && plan !== 'all' && plansKnown === false) {
      return failureResponse(
        {
          code: 'operator.plan_unread',
          message: 'The operator account list carries no plan for each account.',
          fix: 'Choose All Plans to read every account.',
          details: { plan },
        },
        422,
      );
    }
    let users = everyone;
    if (term) {
      users = users.filter(
        (row) =>
          row.email.toLowerCase().includes(term) || (row.name ?? '').toLowerCase().includes(term),
      );
    }
    if (plan && plan !== 'all') users = users.filter((row) => (row.plan ?? 'free') === plan);
    const plans = plansKnown
      ? Array.from(new Set(everyone.map((row) => row.plan ?? 'free'))).sort()
      : [];
    return NextResponse.json({
      users,
      total: users.length,
      plansKnown,
      plans,
      counts: {
        accounts: everyone.length,
        withSecondFactor: everyone.filter((row) => row.multiFactorActive).length,
        // A paid account holds a plan other than free with an active subscription.
        paid: plansKnown
          ? everyone.filter(
              (row) => (row.plan ?? 'free') !== 'free' && row.subStatus === 'active',
            ).length
          : null,
      },
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
