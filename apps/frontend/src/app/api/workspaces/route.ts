// apps/frontend/src/app/api/workspaces/route.ts
// Reads and opens workspaces through Cerulea APIs.
// A workspace holds the projects a team builds together.
// Without this route Studio cannot place a project anywhere.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createWorkspace, listWorkspaces } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createBody = z.object({
  name: z.string().min(2).max(120),
  application: z.enum(['dapps', 'enterprise', 'government']).optional(),
});

export async function GET() {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const outcome = await listWorkspaces(callOptions(actor));
    return NextResponse.json(outcome);
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = createBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'workspace.name_short',
          message: 'A workspace carries a name of at least two characters.',
          fix: 'Type a longer name, then open the workspace again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    const outcome = await createWorkspace(parsed.data, callOptions(actor));
    return NextResponse.json(outcome, { status: 201 });
  } catch (cause) {
    return failureReply(cause);
  }
}
