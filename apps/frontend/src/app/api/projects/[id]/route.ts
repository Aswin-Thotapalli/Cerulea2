// apps/frontend/src/app/api/projects/[id]/route.ts
// Reads and changes one project through Cerulea APIs.
// Closing a project sets its state. Cerulea keeps every Blueprint version, so
// the work stays readable afterwards.
// Without this route a project cannot be opened or renamed.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readProject, updateProject } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const patchBody = z.object({
  name: z.string().min(2).max(160).optional(),
  summary: z.string().max(800).optional(),
  state: z.enum(['draft', 'building', 'deployed', 'closed']).optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    return NextResponse.json(await readProject(params.id, callOptions(actor)));
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = patchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'project.change_unclear',
          message: 'Cerulea reads a name, a summary or a state on this change.',
          fix: 'Send one of the three values, then save again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await updateProject(params.id, parsed.data, callOptions(actor)));
  } catch (cause) {
    return failureReply(cause);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    return NextResponse.json(
      await updateProject(params.id, { state: 'closed' }, callOptions(actor)),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
