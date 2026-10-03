// apps/frontend/src/app/api/presets/templates/route.ts
// Serves the entity presets of one template.
// The route joins the presets of every module the template installs, read
// from the seed files src/data/templates.seed.json and
// src/data/module-entity-presets.json.
// Without this route a template brings no starting entities to the model step.
import { NextResponse } from 'next/server';

import { failureReply } from '@/lib/cerulea-server';
import { templatePresets } from '@/app/api/presets/_shared/entity-presets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/presets/templates?id=
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    return NextResponse.json(id ? templatePresets(id) : [], { status: 200 });
  } catch (cause) {
    return failureReply(cause);
  }
}
