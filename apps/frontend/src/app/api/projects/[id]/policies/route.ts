// apps/frontend/src/app/api/projects/[id]/policies/route.ts
// The deployment profile a project runs under.
// A person answers five questions in ordinary language. Cerulea searches the
// parameter space, checks every candidate against the fixed limits and answers
// with three to five valid profiles. An invalid point never surfaces.
// Without this route a person would set a parameter by hand.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ceruleaRequest } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const declarations = z.object({
  confirmation: z.enum(['InstantConfirmation', 'MaximumCertainty']),
  operators: z.enum(['SingleOrganisation', 'SeveralOrganisations', 'ManyOrganisations']),
  errorCost: z.enum(['Recoverable', 'Expensive', 'Irreversible']),
  split: z.enum(['KeepServing', 'HaltToStayConsistent']),
  retention: z.enum(['RecentOnly', 'SeveralYears', 'Permanent']),
});

export async function GET() {
  return withActor((actor) =>
    ceruleaRequest('/studio/policies/questions', { method: 'GET' }, callOptions(actor)),
  );
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = declarations.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'policies.declarations_incomplete',
          message: 'Cerulea reads an answer to all five questions.',
          fix: 'Answer every question, then read the profiles again.',
          details: {},
        },
      },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await ceruleaRequest(
        '/studio/policies/profiles',
        { method: 'POST', body: JSON.stringify(parsed.data) },
        callOptions(actor),
      ),
    );
  } catch (cause) {
    return failureReply(cause);
  }
}
