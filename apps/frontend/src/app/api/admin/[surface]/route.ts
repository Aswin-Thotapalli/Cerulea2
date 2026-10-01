// apps/frontend/src/app/api/admin/[surface]/route.ts
// The Cerulea operator reads.
// Cerulea APIs holds the operator address list and refuses every other account
// with a message naming the fix. This route forwards the read and returns that
// refusal unchanged.
// Without this route the administration screens would have no data.
import { NextResponse } from 'next/server';

import { readAdministration } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SURFACES = ['summary', 'accounts', 'workspaces', 'projects', 'security'] as const;

type Surface = (typeof SURFACES)[number];

export async function GET(_request: Request, context: { params: Promise<{ surface: string }> }) {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  if (!SURFACES.includes(params.surface as Surface)) {
    return NextResponse.json(
      {
        error: {
          code: 'operator.surface_absent',
          message: 'Cerulea serves no administration read at that address.',
          fix: `Open one of the administration screens: ${SURFACES.join(', ')}.`,
          details: {},
        },
      },
      { status: 404 },
    );
  }
  try {
    return NextResponse.json(
      await readAdministration(params.surface as Surface, callOptions(actor)),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
