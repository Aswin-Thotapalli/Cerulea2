// apps/frontend/src/app/api/billing/subscription/addons/remove/route.ts
//
// POST — cancel a single add-on immediately, without needing to resend
// the full selection list (unlike PATCH /api/billing/subscription/addons,
// which diffs a whole new selection set). This is what the dashboard's
// per-add-on "Cancel" button calls. Removal never requires a new charge,
// so this applies instantly regardless of the add-on's billing type.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAddonById } from '@/config/billing-catalog';
import { removeAddonFromSubscription } from '@/lib/billing/addons';
import { dispatchProvisioning } from '@/lib/billing/provisioning';
import { isStripeConfigured } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({ addonId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  if (!getAddonById(parsed.data.addonId)) {
    return NextResponse.json({ ok: false, error: 'Unknown add-on' }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'No active subscription' }, { status: 404 });
  }

  await removeAddonFromSubscription(sub.id, parsed.data.addonId);

  // Dev-mode: no webhook will fire to dispatch provisioning — do it directly.
  if (!isStripeConfigured()) {
    await dispatchProvisioning(sub.id);
  }

  return NextResponse.json({ ok: true });
}
