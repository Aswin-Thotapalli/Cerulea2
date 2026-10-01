// apps/frontend/src/app/api/projects/[id]/blueprint/versions/route.ts
// Lists the Blueprint versions of one project through Cerulea APIs.
// Every save that changes the content address produces a version, so the list
// is the history of the project.
// Without this route a person cannot see what changed and when.
import { NextResponse } from 'next/server';

import { compareBlueprintVersions, listBlueprintVersions } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const search = new URL(request.url).searchParams;
  const from = search.get('from');
  const to = search.get('to');
  try {
    const options = callOptions(actor);
    if (from && to) {
      return NextResponse.json(
        await compareBlueprintVersions(params.id, Number(from), Number(to), options),
      );
    }
    const limit = search.get('limit');
    return NextResponse.json(
      await listBlueprintVersions(params.id, limit ? Number(limit) : undefined, options),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
