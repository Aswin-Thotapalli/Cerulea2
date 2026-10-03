// apps/frontend/src/app/api/admin/users/route.ts
// Every account on the platform, for the Cerulea operator.
// Cerulea APIs lists the accounts through the administration accounts read,
// which opens for the operator role alone. Each row carries the state of the
// second factor, the open sessions and the workspaces the account belongs to.
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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AccountRow = {
  accountId: string;
  email: string;
  displayName: string;
  state: string;
  multiFactorActive: boolean;
  openSessions: number;
  workspaces: number;
  lastSignInAt: string | null;
  createdAt: string;
};

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const term = search.get('search')?.toLowerCase() ?? '';
  const plan = search.get('plan') ?? '';
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  if (plan && plan !== 'all') {
    // The administration reads carry no plan per account, so a plan filter has nothing to match.
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
  try {
    const held = await readAdministration<{ accounts: AccountRow[] }>(
      'accounts',
      callOptions(actor),
    );
    let users = held.accounts.map((row) => ({
      id: row.accountId,
      name: row.displayName.length > 0 ? row.displayName : null,
      email: row.email,
      state: row.state,
      multiFactorActive: row.multiFactorActive,
      openSessions: row.openSessions,
      workspaceCount: row.workspaces,
      lastSignInAt: row.lastSignInAt,
      createdAt: row.createdAt,
    }));
    if (term) {
      users = users.filter(
        (row) =>
          row.email.toLowerCase().includes(term) || (row.name ?? '').toLowerCase().includes(term),
      );
    }
    return NextResponse.json({ users, total: users.length });
  } catch (cause) {
    return failureReply(cause);
  }
}
