// Provisioning queue worker — called by Vercel Cron every minute.
// Reads queued rows from provisioningLog and processes them.
// Until real infra is wired (Contabo API, DNS, etc.), rows are marked 'done'
// so the queue stays clear and the audit trail is maintained.

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { provisioningLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel cron calls this with Authorization: Bearer $CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const queued = await db
    .select()
    .from(provisioningLog)
    .where(eq(provisioningLog.status as any, 'queued'))
    .limit(20);

  if (queued.length === 0) {
    return NextResponse.json({ processed: 0, failed: 0 });
  }

  let processed = 0;
  let failed = 0;

  for (const row of queued) {
    try {
      // TODO(infra): dispatch the real infra call for row.actionKey
      // See provisioning.ts for the full list of actionKeys and what each means.
      // Example: case 'provision_private_dapps_chain' → POST to Contabo API
      console.log(`[provision-worker] actionKey=${row.actionKey} subscription=${row.subscriptionId}`, row.payload);

      await db
        .update(provisioningLog)
        .set({ status: 'done' } as any)
        .where(eq(provisioningLog.id as any, row.id));

      processed++;
    } catch (err) {
      console.error(`[provision-worker] failed row ${row.id}:`, err);
      await db
        .update(provisioningLog)
        .set({ status: 'failed' } as any)
        .where(eq(provisioningLog.id as any, row.id));
      failed++;
    }
  }

  return NextResponse.json({ processed, failed });
}
