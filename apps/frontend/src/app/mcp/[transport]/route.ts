import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { createHash } from 'crypto';
import templatesData from '@/data/templates.seed.json';
import { TIERS, ADDONS, EXPORT_ACTION, computePriceBreakdown } from '@/config/billing-catalog';
import type { AddonSelection } from '@/config/billing-catalog';
import { db } from '@/db/client';
import { apiKeys, subscriptions, subscriptionAddons, provisioningLog } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RawTemplate = {
  id: string;
  projectType: string;
  title: string;
  description: string;
  tags: string[];
  preinstalledModules: string[];
  selfServe?: boolean;
  gated?: boolean;
};

// ---------------------------------------------------------------------------
// Auth helpers (Step 9)
// ---------------------------------------------------------------------------

async function resolveApiKey(key: string): Promise<{ userId: string } | null> {
  if (!key || !key.startsWith('ck_')) return null;
  const hash = createHash('sha256').update(key).digest('hex');
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash as any, hash))
    .limit(1);
  if (!row) return null;
  // fire-and-forget last-used timestamp
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id as any, row.id))
    .catch(() => {});
  return { userId: row.userId };
}

function authError() {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          ok: false,
          error: 'auth_required',
          message:
            'Pass your Cerulea API key as the "apiKey" argument (format: ck_live_…). ' +
            'Generate one at studio.cerulea.io/dashboard/keys.',
        }),
      },
    ],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// MCP handler
// ---------------------------------------------------------------------------

const handler = createMcpHandler(
  (server) => {
    // -----------------------------------------------------------------------
    // STEP 4 — list_templates (public, no auth)
    // -----------------------------------------------------------------------
    server.tool(
      'list_templates',
      'Returns all Cerulea templates (dApp and Private Blockchain). Includes type, category, title, description, pre-installed modules, and whether the template is self-serve or gated (Enterprise only). No auth required.',
      {
        filter: z
          .enum(['all', 'dapp', 'blockchain'])
          .optional()
          .default('all')
          .describe('Filter by project type. Omit or "all" returns every template.'),
      },
      async ({ filter }) => {
        const templates = (templatesData.templates as RawTemplate[]).filter(
          (t) => filter === 'all' || t.projectType === filter
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  updatedAt: templatesData.updatedAt,
                  count: templates.length,
                  templates: templates.map((t) => ({
                    id: t.id,
                    projectType: t.projectType,
                    title: t.title,
                    description: t.description,
                    tags: t.tags,
                    preinstalledModules: t.preinstalledModules,
                    selfServe: t.selfServe !== false,
                    gated: t.gated ?? false,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // STEP 5 — get_pricing (public, no auth)
    // Source: apps/frontend/src/config/billing-catalog.ts
    // -----------------------------------------------------------------------
    server.tool(
      'get_pricing',
      'Returns all Cerulea Studio pricing tiers, add-ons, and the pay-per-use chain data export action. Prices are in USD cents. No auth required.',
      {},
      async () => {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  currency: 'USD',
                  note: 'All prices in cents. Divide by 100 for dollars.',
                  tiers: TIERS.map((t) => ({
                    id: t.id,
                    name: t.name,
                    priceCentsPerMonth: t.priceCents,
                    blurb: t.blurb,
                    specs: t.specs,
                  })),
                  addons: ADDONS.map((a) => ({
                    id: a.id,
                    name: a.name,
                    billingType: a.billingType,
                    recurringPriceCentsPerUnit: a.recurringPriceCents,
                    oneTimePriceCents: a.oneTimePriceCents,
                    eligibleTierIds: a.eligibleTierIds,
                    maxQuantity: a.maxQuantity,
                    blurb: a.blurb,
                  })),
                  payPerUse: {
                    id: EXPORT_ACTION.id,
                    name: EXPORT_ACTION.name,
                    billingType: EXPORT_ACTION.billingType,
                    priceCents: EXPORT_ACTION.priceCents,
                    eligibleTierIds: EXPORT_ACTION.eligibleTierIds,
                    blurb: EXPORT_ACTION.blurb,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // STEP 6 — validate_schema (auth required)
    // Validates a Studio project schemaJson: { entities, relationships, track }
    // -----------------------------------------------------------------------
    server.tool(
      'validate_schema',
      'Validates a Cerulea Studio project schema (the JSON from the Schema step). Accepts the schema as a JSON string and returns field-level errors and warnings. Requires an API key.',
      {
        schema: z
          .string()
          .describe(
            'The project schemaJson as a JSON string. Shape: { track: "dapp"|"blockchain", entities: [...], relationships: [...] }'
          ),
        apiKey: z
          .string()
          .describe('Your Cerulea API key (ck_live_…). Generate one at studio.cerulea.io/dashboard/keys.'),
      },
      async ({ schema, apiKey }) => {
        const auth = await resolveApiKey(apiKey);
        if (!auth) return authError();

        const errors: string[] = [];
        const warnings: string[] = [];
        let parsed: any;

        try {
          parsed = typeof schema === 'string' ? JSON.parse(schema) : schema;
        } catch {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ ok: true, valid: false, errors: ['schema is not valid JSON'], warnings: [] }),
              },
            ],
          };
        }

        // track
        if (!['dapp', 'blockchain'].includes(parsed.track)) {
          errors.push(`"track" must be "dapp" or "blockchain" (got "${parsed.track ?? 'undefined'}")`);
        }

        // entities
        if (!Array.isArray(parsed.entities)) {
          errors.push('"entities" must be an array');
        } else {
          const seen = new Set<string>();
          for (let i = 0; i < parsed.entities.length; i++) {
            const e = parsed.entities[i];
            if (typeof e?.id !== 'string' || !e.id) {
              errors.push(`entities[${i}]: missing or empty "id"`);
            } else if (seen.has(e.id)) {
              errors.push(`entities[${i}]: duplicate id "${e.id}"`);
            } else {
              seen.add(e.id);
            }
            if (typeof e?.name !== 'string' || !e.name) {
              errors.push(`entities[${i}]: missing or empty "name"`);
            }
          }

          // relationships
          if (!Array.isArray(parsed.relationships)) {
            errors.push('"relationships" must be an array');
          } else {
            for (let i = 0; i < parsed.relationships.length; i++) {
              const r = parsed.relationships[i];
              if (!seen.has(r?.source)) {
                errors.push(`relationships[${i}]: source "${r?.source}" does not reference a known entity`);
              }
              if (!seen.has(r?.target)) {
                errors.push(`relationships[${i}]: target "${r?.target}" does not reference a known entity`);
              }
            }
          }

          if (parsed.entities.length === 0) {
            warnings.push('Schema has no entities — the project will have no data model');
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ ok: true, valid: errors.length === 0, errors, warnings }, null, 2),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // STEP 7 — estimate_cost (auth required)
    // Wraps computePriceBreakdown from billing-catalog.ts
    // -----------------------------------------------------------------------
    server.tool(
      'estimate_cost',
      'Returns an itemized monthly cost estimate for a Cerulea Studio plan. Pass a tier id and optional add-on selections. Requires an API key.',
      {
        tierId: z
          .enum(['public_dapps', 'private_dapps', 'private_dapps_pro'])
          .describe('The tier to estimate for.'),
        addons: z
          .array(
            z.object({
              addonId: z.string().describe('Add-on id from get_pricing.addons[].id'),
              quantity: z.number().int().min(1).max(50).default(1),
            })
          )
          .optional()
          .default([])
          .describe('Add-ons to include. Quantity is clamped to the add-on maxQuantity.'),
        apiKey: z
          .string()
          .describe('Your Cerulea API key (ck_live_…). Generate one at studio.cerulea.io/dashboard/keys.'),
      },
      async ({ tierId, addons, apiKey }) => {
        const auth = await resolveApiKey(apiKey);
        if (!auth) return authError();

        const selections: AddonSelection[] = (addons ?? []).map((a) => ({
          addonId: a.addonId,
          quantity: a.quantity,
        }));

        const breakdown = computePriceBreakdown(tierId, selections);

        const tier = TIERS.find((t) => t.id === tierId);

        const lineItems = [
          { label: tier?.name ?? tierId, type: 'tier', priceCents: breakdown.tierCents },
          ...selections
            .map((sel) => {
              const addon = ADDONS.find((a) => a.id === sel.addonId);
              if (!addon) return null;
              const qty = Math.max(1, Math.min(sel.quantity, addon.maxQuantity));
              return {
                label: addon.name,
                type: addon.billingType,
                quantity: qty,
                unitPriceCents: addon.recurringPriceCents ?? addon.oneTimePriceCents ?? 0,
                priceCents:
                  (addon.recurringPriceCents ?? 0) * qty + (addon.oneTimePriceCents ?? 0),
              };
            })
            .filter(Boolean),
        ];

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  currency: 'USD',
                  tierId,
                  lineItems,
                  summary: {
                    tierCents: breakdown.tierCents,
                    addonsRecurringCents: breakdown.addonsRecurringCents,
                    addonsOneTimeCents: breakdown.addonsOneTimeCents,
                    monthlyCents: breakdown.monthlyCents,
                    dueNowCents: breakdown.dueNowCents,
                    monthlyUSD: `$${(breakdown.monthlyCents / 100).toFixed(2)}`,
                    dueNowUSD: `$${(breakdown.dueNowCents / 100).toFixed(2)}`,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // STEP 8 — get_chain_status (auth required)
    // Returns the authenticated user's subscription + recent provisioning log
    // -----------------------------------------------------------------------
    server.tool(
      'get_chain_status',
      'Returns the chain/subscription status for the authenticated Cerulea account: active plan, add-ons, and the 10 most recent provisioning actions. Requires an API key.',
      {
        apiKey: z
          .string()
          .describe('Your Cerulea API key (ck_live_…). Generate one at studio.cerulea.io/dashboard/keys.'),
      },
      async ({ apiKey }) => {
        const auth = await resolveApiKey(apiKey);
        if (!auth) return authError();

        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId as any, auth.userId))
          .limit(1);

        if (!sub) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  ok: true,
                  subscription: null,
                  message: 'No subscription found for this account.',
                }),
              },
            ],
          };
        }

        const addonRows = await db
          .select()
          .from(subscriptionAddons)
          .where(
            and(
              eq(subscriptionAddons.subscriptionId as any, sub.id),
              eq(subscriptionAddons.status as any, 'active')
            )
          );

        const recentLog = await db
          .select()
          .from(provisioningLog)
          .where(eq(provisioningLog.subscriptionId as any, sub.id))
          .orderBy(desc(provisioningLog.createdAt as any))
          .limit(10);

        const tier = TIERS.find((t) => t.id === sub.plan);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  subscription: {
                    id: sub.id,
                    plan: sub.plan,
                    tierName: tier?.name ?? sub.plan,
                    status: sub.status,
                    cancelAtPeriodEnd: sub.cancelAtPeriodEnd === 'true',
                    currentPeriodEnd: sub.currentPeriodEnd ?? null,
                    activeAddons: addonRows.map((r) => {
                      const addon = ADDONS.find((a) => a.id === r.addonId);
                      return {
                        addonId: r.addonId,
                        name: addon?.name ?? r.addonId,
                        quantity: Number(r.quantity) || 1,
                        status: r.status,
                      };
                    }),
                  },
                  recentProvisioningActions: recentLog.map((l) => ({
                    actionKey: l.actionKey,
                    status: l.status,
                    createdAt: l.createdAt,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  },
  {
    // ServerOptions: capabilities, instructions only
  },
  {
    basePath: '/mcp',
    maxDuration: 60,
    verboseLogs: false,
  }
);

export { handler as GET, handler as POST };
