// apps/frontend/src/db/schema.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const now = sql`now()`;

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),
  projectType: text("projectType").notNull(),
  workspaceId: text("workspaceId"),
  userId: text("userId"),
  selectedTemplateIds: text("selectedTemplateIds"),
  blueprint: text("blueprint"),
  graph: text("graph"),
  schemaJson: text("schemaJson"),
  logicJson: text("logicJson"),
  economics: text("economics"),
  legacyMode: text("legacyMode").default("none"),
  status: text("status").default("draft"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashedPassword"),
  name: text("name"),
  isTestAccount: text("isTestAccount").default("false"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  displayName: text("displayName"),
  avatarUrl: text("avatarUrl"),
  company: text("company"),
  role: text("role"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const verificationTokens = pgTable("verificationTokens", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const drafts = pgTable("drafts", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  data: text("data"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const aiThreads = pgTable("aiThreads", {
  id: text("id").primaryKey(),
  userId: text("userId"),
  projectId: text("projectId"),
  title: text("title"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const aiMessages = pgTable("aiMessages", {
  id: text("id").primaryKey(),
  threadId: text("threadId").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  meta: text("meta"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

// `plan` historically held 'free' | 'developer' | 'pro' | 'enterprise'.
// It now also holds the Cerulea Studio billing-catalog tier ids
// ('public_dapps' | 'private_dapps' | 'private_dapps_pro') — see
// src/config/billing-catalog.ts, which is the single source of truth for
// tier/add-on pricing and eligibility. 'free' and 'enterprise' remain valid
// for the always-free tier and the out-of-Studio Contact Sales flow.
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  status: text("status").notNull().default("inactive"),
  currentPeriodEnd: text("currentPeriodEnd"),
  // Guards webhook handlers against reprocessing the same Stripe event twice.
  lastWebhookEventId: text("lastWebhookEventId"),
  // The Stripe Subscription Item id for the TIER's own recurring price
  // (distinct from subscriptionAddons, which only tracks add-on items).
  // Needed so changeSubscriptionTier can update the right line item when
  // a customer upgrades/downgrades.
  stripeTierSubscriptionItemId: text("stripeTierSubscriptionItemId"),
  // Mirrors Stripe's cancel_at_period_end — true once the customer has
  // requested cancellation but the current paid period hasn't ended yet.
  cancelAtPeriodEnd: text("cancelAtPeriodEnd").notNull().default("false"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

// One row per active (or formerly active) add-on line item on a
// subscription. `addonId` is a catalog id from billing-catalog.ts.
// `quantity` is stored as text (project convention) and parsed as an int
// in application code. `stripeSubscriptionItemId` is set for the recurring
// component of an add-on (Stripe Subscription Items API); it is null for
// purely one-time add-ons, which have no ongoing subscription item.
export const subscriptionAddons = pgTable("subscriptionAddons", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscriptionId").notNull(),
  addonId: text("addonId").notNull(),
  quantity: text("quantity").notNull().default("1"),
  stripeSubscriptionItemId: text("stripeSubscriptionItemId"),
  status: text("status").notNull().default("active"), // active | removed
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

// Records one-off charges that are NOT recurring subscription items:
// one-time add-on components (custom domain, block explorer setup fee)
// and pay-per-use actions (chain data export). `kind` distinguishes them.
export const billingOneTimePurchases = pgTable("billingOneTimePurchases", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscriptionId"),
  userId: text("userId").notNull(),
  kind: text("kind").notNull(), // 'addon_one_time' | 'export'
  addonId: text("addonId"), // catalog addon id, or EXPORT_ACTION.id for exports
  stripeCheckoutSessionId: text("stripeCheckoutSessionId"),
  amountCents: text("amountCents"),
  status: text("status").notNull().default("pending"), // pending | paid | failed
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

// Audit/dispatch log for infrastructure provisioning actions triggered by
// webhook-driven subscription reconciliation (see
// src/lib/billing/provisioning.ts). Lets the webhook dispatcher stay
// idempotent and gives ops a queue/audit trail of what should happen on
// the infra side for a given subscription state change.
export const provisioningLog = pgTable("provisioningLog", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscriptionId").notNull(),
  actionKey: text("actionKey").notNull(),
  payload: text("payload"), // JSON.stringify'd action payload
  status: text("status").notNull().default("queued"), // queued | done | failed
  stripeEventId: text("stripeEventId"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const smartContracts = pgTable("smartContracts", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  name: text("name").notNull(),
  contractType: text("contractType").notNull(),
  enabled: text("enabled").notNull().default("true"),
  description: text("description"),
  whyItExists: text("whyItExists"),
  ifDisabled: text("ifDisabled"),
  abi: text("abi"),
  bytecode: text("bytecode"),
  dependencies: text("dependencies"),
  stepSources: text("stepSources"),
  source: text("source").default("module"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const snapshots = pgTable("snapshots", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  stateData: text("stateData"),
  status: text("status").notNull().default("ready"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

// MCP API keys. Cerulea generates a ck_live_* key once on creation;
// only the SHA-256 hex digest is stored here. The key is shown once in the
// Studio UI and never again — if lost, a new key must be issued.
export const apiKeys = pgTable("apiKeys", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  keyHash: text("keyHash").notNull().unique(),
  name: text("name").notNull(),
  lastUsedAt: text("lastUsedAt"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const userPlanSelections = pgTable("userPlanSelections", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  selectedPlan: text("selectedPlan").notNull(),
  selectedAt: text("selectedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});
