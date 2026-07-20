// apps/frontend/src/lib/billing/provisioning.ts
//
// Single dispatch point for infrastructure provisioning. Reads the FULL
// current state of a subscription (tier + active add-ons) and queues one
// auditable action per item into `provisioningLog`. This is the only
// place that should ever decide "what infra needs to change" — it is
// called from reconcileFromStripeSubscription (webhook-driven) so the
// same logic runs whether the change came from initial signup or a later
// dashboard edit.
//
// Actual infra calls (resize a Contabo VM, set validator count, configure
// DNS for a custom domain, etc.) are not wired up here — there are no
// infra credentials in this codebase yet. Each action is persisted with
// status 'queued'; a worker process can poll provisioningLog for queued
// rows, execute the real action per actionKey, and mark it 'done'/'failed'.

import { randomUUID } from 'crypto';
import { db } from '@/db/client';
import { subscriptions, subscriptionAddons, provisioningLog } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTierById, getAddonById, EXPORT_ACTION } from '@/config/billing-catalog';

async function queueAction(subscriptionId: string, actionKey: string, payload: unknown, stripeEventId?: string | null) {
  await db.insert(provisioningLog).values({
    id: randomUUID(),
    subscriptionId,
    actionKey,
    payload: JSON.stringify(payload),
    status: 'queued',
    stripeEventId: stripeEventId ?? null,
  });
  // TODO(infra): execute the real provisioning action for `actionKey` here
  // (or have a separate worker consume provisioningLog rows where
  // status = 'queued'). Examples per actionKey:
  //   provision_public_dapps_chain / provision_private_dapps_chain /
  //   provision_private_dapps_pro_chain -> stand up or resize the chain's
  //     validator set + RPC nodes to the tier's spec
  //   add_validator / add_validators           -> increase validator count
  //   add_storage_gb                            -> grow attached storage
  //   provision_dedicated_rpc_node              -> stand up a dedicated RPC node
  //   configure_custom_domain                   -> DNS + TLS cert for the dApp frontend
  //   setup_block_explorer                      -> deploy branded explorer instance
  //   provision_api_key                         -> issue N additional API keys
  //   provision_studio_seats                    -> raise the Studio seat limit
  //   export_chain_data                         -> generate the CSV/PDF export
  console.log(`[provisioning] queued "${actionKey}" for subscription ${subscriptionId}`, payload);
}

/**
 * Reads the subscription's current tier + active add-ons and queues the
 * full set of provisioning actions that should be true for that state.
 * Idempotent to call repeatedly — each call just appends an audit row;
 * actual infra-side idempotency is the worker's responsibility (e.g. "set
 * validator count to N" rather than "add one more validator").
 */
export async function dispatchProvisioning(subscriptionId: string, opts?: { stripeEventId?: string | null }) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id as any, subscriptionId)).limit(1);
  if (!sub) {
    console.warn(`[provisioning] subscription not found: ${subscriptionId}`);
    return;
  }

  const tier = getTierById(sub.plan);
  if (tier) {
    await queueAction(subscriptionId, tier.provisioningActionKey, { tierId: tier.id }, opts?.stripeEventId);
  }

  const addonRows = await db
    .select()
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.subscriptionId as any, subscriptionId), eq(subscriptionAddons.status as any, 'active')));

  for (const row of addonRows) {
    const addon = getAddonById(row.addonId);
    if (!addon) continue;
    await queueAction(
      subscriptionId,
      addon.provisioningActionKey,
      { addonId: addon.id, quantity: row.quantity || 1 },
      opts?.stripeEventId
    );
  }
}

/** Pay-per-use export action — dispatched once per click, never part of subscription state. */
export async function dispatchExportAction(subscriptionId: string, format: 'csv' | 'pdf', stripeEventId?: string | null) {
  await queueAction(subscriptionId, EXPORT_ACTION.provisioningActionKey, { format }, stripeEventId);
}
