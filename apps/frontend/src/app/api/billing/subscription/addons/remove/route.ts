// apps/frontend/src/app/api/billing/subscription/addons/remove/route.ts
// Removes one add-on from the running subscription at once.
// The billing screen calls this from the button beside each active add-on.
// Cerulea APIs marks the add-on removed on the subscription record, so the
// next invoice leaves it out.
// Without this route an add-on stays on the subscription until the whole
// choice set is saved again.

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ceruleaRequest } from '@/lib/cerulea-api';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import { billingHome, readActiveAddOns, subscriptionAbsent } from '@/lib/entitlements-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const removeBody = z.object({ addonId: z.string().min(1).max(80) });

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = removeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.add_on_unnamed',
        message: 'Cerulea reads the add-on to remove on this request.',
        fix: 'Choose the add-on on the billing screen, then remove it again.',
        details: {},
      },
      400,
    );
  }
  try {
    const options = callOptions(actor);
    const home = await billingHome(actor, request);
    const held = home.subscription;
    if (!held) return subscriptionAbsent(home);

    const active = await readActiveAddOns(home.workspace.workspaceId, held, options);
    if (!active.some((entry) => entry.addOnId === parsed.data.addonId)) {
      return failureResponse(
        {
          code: 'billing.add_on_inactive',
          message: `The subscription carries no active add-on named ${parsed.data.addonId}.`,
          fix: 'Open the billing screen again to read the add-ons the subscription carries.',
          details: { addonId: parsed.data.addonId },
        },
        400,
      );
    }

    const outcome = await ceruleaRequest<Record<string, unknown>>(
      `/v1/workspaces/${encodeURIComponent(home.workspace.workspaceId)}/subscription/add-ons/${encodeURIComponent(parsed.data.addonId)}`,
      { method: 'DELETE' },
      options,
    );
    return NextResponse.json({ ok: true, division: home.division, ...outcome });
  } catch (cause) {
    return failureReply(cause);
  }
}
