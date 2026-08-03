// apps/frontend/src/app/api/billing/customer/route.ts
//
// GET  — returns the Stripe customer's billing address and tax IDs.
// PATCH — updates billing address (name, phone, address) and/or adds or
//         removes a single tax ID per request. All fields are optional.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getSession } from '@/lib/auth';
import { getCurrentSubscription } from "@/lib/billing/current-subscription";
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: true, address: null, name: null, phone: null, taxIds: [], devMode: true });
  }

  const sub = await getCurrentSubscription(session.user.id);

  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ ok: true, address: null, name: null, phone: null, taxIds: [] });
  }

  try {
    const stripe = getStripe();
    const customer = (await stripe.customers.retrieve(sub.stripeCustomerId)) as Stripe.Customer;

    if (customer.deleted) {
      return NextResponse.json({ ok: true, address: null, name: null, phone: null, taxIds: [] });
    }

    const taxIdsResult = await stripe.customers.listTaxIds(sub.stripeCustomerId, { limit: 20 });

    return NextResponse.json({
      ok: true,
      name: customer.name ?? null,
      phone: customer.phone ?? null,
      address: customer.address
        ? {
            line1: customer.address.line1 ?? null,
            line2: customer.address.line2 ?? null,
            city: customer.address.city ?? null,
            state: customer.address.state ?? null,
            postal_code: customer.address.postal_code ?? null,
            country: customer.address.country ?? null,
          }
        : null,
      taxIds: taxIdsResult.data.map((t) => ({
        id: t.id,
        type: t.type,
        value: t.value,
        verification: (t as any).verification?.status ?? null,
      })),
    });
  } catch (err: any) {
    console.error('Customer fetch error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Could not load billing details.' }, { status: 500 });
  }
}

const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().length(2),
});

const PatchSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: AddressSchema.optional(),
  addTaxId: z.object({ type: z.string().min(1), value: z.string().min(1) }).optional(),
  removeTaxId: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Billing details require live Stripe configuration.' },
      { status: 503 }
    );
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const sub = await getCurrentSubscription(session.user.id);

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: 'No Stripe customer on record. Please contact support.' },
      { status: 404 }
    );
  }

  const { name, phone, address, addTaxId, removeTaxId } = parsed.data;

  try {
    const stripe = getStripe();

    if (name !== undefined || phone !== undefined || address !== undefined) {
      const update: Stripe.CustomerUpdateParams = {};
      if (name !== undefined) update.name = name;
      if (phone !== undefined) update.phone = phone;
      if (address !== undefined) {
        update.address = {
          line1: address.line1,
          line2: address.line2 ?? '',
          city: address.city,
          state: address.state ?? '',
          postal_code: address.postal_code ?? '',
          country: address.country,
        };
      }
      await stripe.customers.update(sub.stripeCustomerId, update);
    }

    if (addTaxId) {
      await stripe.customers.createTaxId(sub.stripeCustomerId, {
        type: addTaxId.type as Stripe.TaxIdCreateParams.Type,
        value: addTaxId.value,
      });
    }

    if (removeTaxId) {
      await stripe.customers.deleteTaxId(sub.stripeCustomerId, removeTaxId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Customer update error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Could not update billing details.' }, { status: 500 });
  }
}
