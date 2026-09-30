// apps/frontend/src/app/api/projects/[id]/interface/preview/route.ts
// The generated application of one project, rendered as one role.
// The handler reads the Blueprint on the server and asks the frontend engine
// for the screens the role reaches, at the width and in the mode the person
// chose. The access token stays on the server.
// Without this route the preview would call Cerulea APIs from the browser.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readInterfacePreview } from '@/lib/interface/server';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const previewBody = z.object({
  role: z.string().min(1).max(120),
  breakpoint: z.string().min(1).max(40).optional(),
  mode: z.enum(['light', 'dark']).optional(),
  screen: z.string().min(1).max(200).optional(),
  language: z.string().min(2).max(20).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = previewBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'interface.preview_request_incomplete',
          message: 'The preview needs the role it renders the application for.',
          fix: 'Choose a role in the preview panel, then read the preview again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await readInterfacePreview(params.id, parsed.data, callOptions(actor)),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
