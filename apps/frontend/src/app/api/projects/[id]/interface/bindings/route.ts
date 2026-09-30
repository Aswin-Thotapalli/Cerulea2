// apps/frontend/src/app/api/projects/[id]/interface/bindings/route.ts
// The bindings one component may read for one role of one project.
// The frontend engine offers only the bindings the permission resolver
// admits, so the picker never shows a binding the role cannot reach.
// The handler reads the Blueprint on the server. The access token stays there.
// Without this route the binding picker would call Cerulea APIs from the browser.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readInterfaceBindings } from '@/lib/interface/server';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bindingBody = z.object({
  role: z.string().min(1).max(120),
  component: z.string().min(1).max(80),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = bindingBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'interface.binding_request_incomplete',
          message: 'The binding list needs a role and a component.',
          fix: 'Choose a component in the component panel with a role chosen in the preview panel.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await readInterfaceBindings(params.id, parsed.data, callOptions(actor)),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
