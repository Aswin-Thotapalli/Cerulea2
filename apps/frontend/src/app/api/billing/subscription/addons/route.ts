// apps/frontend/src/app/api/billing/subscription/addons/route.ts
// Sets the add-ons of the subscription the account holds in one division.
// The billing screen sends the whole selection on Save. Cerulea APIs adds what
// is new, changes quantities, removes what left the selection and answers the
// selection it now holds. An add-on with a one time part that has to be paid
// first answers a checkout address instead.
// Without this route the add-on selector could show changes and never apply them.

import { z } from 'zod';

import { failureResponse } from '@/lib/cerulea-server';
import { commerceCall, readBody } from '../../_shared/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const addonsBody = z.object({
  selections: z
    .array(
      z.object({
        addonId: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .max(40),
  division: z.string().optional(),
  workspaceId: z.string().min(1).max(80).optional(),
});

export async function PATCH(request: Request) {
  const parsed = addonsBody.safeParse(await readBody(request));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'billing.add_ons_unreadable',
        message: 'Cerulea reads the add-on selection as a list of add-on ids with quantities.',
        fix: 'Choose the add-ons again on the billing screen, then save.',
        details: { issues: parsed.error.flatten() },
      },
      400,
    );
  }
  return commerceCall(request, {
    method: 'PATCH',
    path: '/subscription/addons',
    body: parsed.data,
  });
}
