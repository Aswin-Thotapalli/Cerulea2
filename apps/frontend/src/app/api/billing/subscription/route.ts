// apps/frontend/src/app/api/billing/subscription/route.ts
// Reads and changes the subscription of one workspace through Cerulea APIs.
// The Cerulea APIs payments driver holds the plans, the subscription and the
// invoices. Studio holds no payment integration of its own.
// Without this route a person cannot see or change what the workspace pays for.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';
import { homeWorkspace } from '@/lib/workspace-home';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startBody = z.object({
  planId: z.string().min(1).max(80),
  workspaceId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const named = new URL(request.url).searchParams.get('workspaceId');
  try {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(actor.displayName, options, named);
    const [plans, held] = await Promise.all([
      ceruleaRequest<{ plans: unknown[] }>('/studio/plans', { method: 'GET' }, options),
      ceruleaRequest<{ subscription: unknown; invoices: unknown[] }>(
        `/studio/workspaces/${encodeURIComponent(workspace.workspaceId)}/subscription`,
        { method: 'GET' },
        options,
      ),
    ]);
    return NextResponse.json({ workspace, plans: plans.plans, ...held });
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = startBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'billing.plan_unnamed',
          message: 'Cerulea reads the plan on this request.',
          fix: 'Choose one of the published plans, then start the subscription again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(actor.displayName, options, parsed.data.workspaceId);
    const outcome = await ceruleaRequest(
      `/studio/workspaces/${encodeURIComponent(workspace.workspaceId)}/subscription`,
      { method: 'POST', body: JSON.stringify({ planId: parsed.data.planId }) },
      options,
    );
    return NextResponse.json(outcome, { status: 201 });
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function DELETE(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const named = new URL(request.url).searchParams.get('workspaceId');
  try {
    const options = callOptions(actor);
    const workspace = await homeWorkspace(actor.displayName, options, named);
    const outcome = await ceruleaRequest(
      `/studio/workspaces/${encodeURIComponent(workspace.workspaceId)}/subscription`,
      { method: 'DELETE' },
      options,
    );
    return NextResponse.json(outcome);
  } catch (cause) {
    return failureReply(cause);
  }
}
