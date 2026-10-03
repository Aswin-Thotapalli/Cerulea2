// apps/frontend/src/app/api/projects/[id]/compile/route.ts
// Checks the Blueprint of one project through the Cerulea APIs compiler.
// The report names every correction with its place in the Blueprint and the
// screen that produces it.
// Without this route Studio cannot tell a person what remains before deployment.
import { NextResponse } from 'next/server';

import { compileProject } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const version = new URL(request.url).searchParams.get('version');
  try {
    return NextResponse.json(
      await compileProject(params.id, version ? Number(version) : undefined, callOptions(actor)),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
